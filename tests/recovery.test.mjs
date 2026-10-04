import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { fixture, owner, password } from './helpers.mjs';
import { createApplication } from '../server/application.mjs';
import { scryptSync } from 'node:crypto';

const run = promisify(execFile);
test('legacy startup markers and existing accounts/catalog recover through migration and survive another restart', async t => {
  const salt = 'legacy-test-salt';
  const hash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  const f = await fixture(t, db => {
    // Historical v1/v2 startup could leave a marker before all its DDL finished.
    db.exec(`CREATE TABLE schema_version (version INTEGER PRIMARY KEY); INSERT INTO schema_version VALUES(1),(2);
      CREATE TABLE users (id TEXT PRIMARY KEY,username TEXT UNIQUE COLLATE NOCASE NOT NULL,display_name TEXT NOT NULL,password_hash TEXT NOT NULL,admin INTEGER NOT NULL DEFAULT 0,must_change INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
      CREATE TABLE teams (id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT NOT NULL UNIQUE,tag TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,archived INTEGER NOT NULL DEFAULT 0);
      INSERT INTO teams VALUES('legacy-team','Legacy team','legacy team','OLD',4,0);`);
    db.prepare('INSERT INTO users VALUES(?,?,?,?,1,0)').run('legacy-owner', 'owner', 'Legacy owner', hash);
  });
  assert.equal((await f.request('/api/setup')).body.needed, false);
  const login = await f.request('/api/login', { method: 'POST', body: { username: 'owner', password } });
  assert.equal(login.status, 200);
  const directory = (await f.request('/api/directory', { cookie: login.cookie })).body;
  assert.equal(directory.teams[0].name, 'Legacy team'); assert.equal(directory.teams[0].revision, 4);
  assert.deepEqual(directory.players, []);
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie: login.cookie, body: { name: 'Upgraded Cup' } })).body.tournament;
  await f.restart();
  assert.equal((await f.request(`/api/tournaments/${event.id}/history`, { cookie: login.cookie })).status, 200);
  assert.equal((await f.request('/api/directory', { cookie: login.cookie })).body.teams[0].id, 'legacy-team');
});

test('live backup restores into a new database with data intact and old sessions revoked', async t => {
  const f = await fixture(t), cookie = await owner(f);
  const created = await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Recovery Cup' } });
  const backup = join(f.directory, 'backup.sqlite'), restored = join(f.directory, 'restored.sqlite');
  await run(process.execPath, ['scripts/backup.mjs', f.databasePath, backup]);
  await assert.rejects(run(process.execPath, ['scripts/backup.mjs', f.databasePath, backup]));
  await run(process.execPath, ['scripts/restore.mjs', backup, restored]);
  await assert.rejects(run(process.execPath, ['scripts/restore.mjs', backup, f.databasePath]));
  const app = await createApplication({ databasePath: restored });
  try {
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  assert.equal((await fetch(base + '/api/me', { headers: { Cookie: cookie } })).status, 401);
  const login = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5173' }, body: JSON.stringify({ username: 'owner', password }) });
  assert.equal(login.status, 200);
  const events = await fetch(base + '/api/tournaments', { headers: { Cookie: login.headers.get('set-cookie').split(';')[0] } });
  const saved = (await events.json()).tournaments;
  assert.equal(saved.length, 1); assert.equal(saved[0].id, created.body.tournament.id); assert.equal(saved[0].name, 'Recovery Cup');
  assert.equal((await f.request('/api/me', { cookie })).status, 200);
  } finally { await app.close(); }
});
