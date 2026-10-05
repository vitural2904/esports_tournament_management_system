import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync, createHash } from 'node:crypto';
import { fixture, password } from './helpers.mjs';
import { migrate } from '../server/migrations.mjs';

test('legacy per-event permissions migrate once to global roles and revoke old sessions', async t => {
  const salt = 'legacy-role-test-salt';
  const hash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  const f = await fixture(t, db => {
    migrate(db);
    db.exec('ALTER TABLE users DROP COLUMN role; DELETE FROM schema_version WHERE version=12;');
    for (const [id, admin] of [['legacy-admin', 1], ['legacy-op', 0], ['legacy-ref', 0], ['legacy-view', 0]]) {
      db.prepare('INSERT INTO users(id,username,display_name,password_hash,admin,must_change) VALUES (?,?,?,?,?,0)').run(id, id, id, hash, admin);
    }
    db.prepare('INSERT INTO tournaments(id,name) VALUES (?,?)').run('legacy-cup', 'Legacy Cup');
    for (const [id, roles] of [['legacy-op', ['operator', 'entry']], ['legacy-ref', ['entry']]]) {
      db.prepare('INSERT INTO grants(tournament_id,user_id,roles_json) VALUES (?,?,?)').run('legacy-cup', id, JSON.stringify(roles));
    }
    db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(createHash('sha256').update('legacy-token').digest('hex'), 'legacy-admin', Date.now()+60_000);
  });
  assert.equal((await f.request('/api/me', { cookie: 'bracket_session=legacy-token' })).status, 401);
  for (const [username, role] of [['legacy-admin', 'admin'], ['legacy-op', 'operator'], ['legacy-ref', 'referee'], ['legacy-view', 'caster']]) {
    const login = await f.request('/api/login', { method: 'POST', body: { username, password } });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.role, role);
    assert.equal((await f.request('/api/tournaments', { cookie: login.cookie })).body.tournaments.length, 1);
  }
  await f.restart();
  const admin = await f.request('/api/login', { method: 'POST', body: { username: 'legacy-admin', password } });
  assert.equal(admin.body.user.role, 'admin');
  assert.equal((await f.request('/api/tournaments/legacy-cup/grants', { cookie: admin.cookie })).status, 410);
});
