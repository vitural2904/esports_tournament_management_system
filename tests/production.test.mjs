import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createApplication } from '../server/application.mjs';
import { password } from './helpers.mjs';

const origin = 'https://cup.example.test';
async function production(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'bracket-production-'));
  const databasePath = join(directory, 'test.sqlite');
  let app;
  async function start(productionMode) {
    app = await createApplication({ databasePath, allowedOrigins: [origin], secureCookies: productionMode, allowSetup: !productionMode, trustedProxy: productionMode ? '127.0.0.1' : undefined, ...options });
    await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  }
  await start(false);
  const base = () => `http://127.0.0.1:${app.server.address().port}`;
  async function request(path, body, cookie, headers = {}) {
    return fetch(base() + path, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Bracket-Client-IP': '192.0.2.10', ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }); });
  return { directory, databasePath, request, restart: async () => { await app.close(); await start(true); } };
}

test('production never exposes first-admin creation', async t => {
  const f = await production(t);
  await f.restart();
  assert.equal((await f.request('/api/setup')).status, 200);
  assert.deepEqual(await (await f.request('/api/setup')).json(), { needed: false });
  assert.equal((await f.request('/api/setup', { username: 'owner', displayName: 'Owner', password })).status, 403);
});

test('production process rejects missing or invalid configuration without opening its port', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'bracket-config-'));
  const cwd = join(directory, 'release'); await mkdir(cwd);
  const databasePath = join(directory, 'state/test.sqlite');
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const overrides of [{}, { APP_ORIGIN: 'http://cup.example.test' }, { APP_ORIGIN: origin, DATABASE_PATH: 'data/test.sqlite' }, { APP_ORIGIN: origin, DATABASE_PATH: databasePath, API_PORT: '0' }, { APP_ORIGIN: origin, DATABASE_PATH: databasePath, TRUSTED_PROXY: '0.0.0.0' }, { APP_ORIGIN: origin, DATABASE_PATH: join(cwd, 'dist/private.sqlite') }]) {
    const child = spawn(process.execPath, [resolve('server/index.mjs')], { cwd, env: { ...process.env, NODE_ENV: 'production', APP_ORIGIN: '', DATABASE_PATH: '', TRUSTED_PROXY: '127.0.0.1', API_PORT: '3001', ...overrides }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', value => { output += value; });
    const timeout = setTimeout(() => child.kill(), 2500);
    const [code] = await once(child, 'exit'); clearTimeout(timeout);
    assert.equal(code, 1, `must reject config: ${JSON.stringify(overrides)}`);
    assert.doesNotMatch(output, /Bracket API/);
  }
});

test('trusted proxy keeps client login limits separate and rejects forged or malformed forwarding headers', async t => {
  const f = await production(t);
  await f.request('/api/setup', { username: 'owner', displayName: 'Owner', password });
  await f.restart();
  for (let attempt = 0; attempt < 10; attempt++) assert.equal((await f.request('/api/login', { username: 'owner', password: 'Wrong-Password-42!' })).status, 401);
  assert.equal((await f.request('/api/login', { username: 'owner', password })).status, 429);
  const second = await f.request('/api/login', { username: 'owner', password }, undefined, { 'X-Bracket-Client-IP': '192.0.2.11' });
  assert.equal(second.status, 200);
  assert.match(second.headers.get('set-cookie'), /; Secure/);
  assert.match(second.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  const cookie = second.headers.get('set-cookie').split(';')[0];
  for (const value of ['', '192.0.2.12, 192.0.2.13', 'attacker', '::1%lo0']) assert.equal((await f.request('/api/login', { username: 'owner', password }, undefined, { 'X-Bracket-Client-IP': value })).status, 400);
  assert.equal((await f.request('/api/login', { username: 'owner', password }, undefined, { 'X-Forwarded-For': '192.0.2.13', 'CF-Connecting-IP': '192.0.2.14' })).status, 429);
  assert.equal((await f.request('/api/password', { currentPassword: password, newPassword: 'Changed-Production-Password-42!' }, cookie, { Origin: 'https://evil.example.test' })).status, 403);
  assert.equal((await f.request('/api/password', {}, cookie, { Origin: '' })).status, 403);
  const changed = await f.request('/api/password', { currentPassword: password, newPassword: 'Changed-Production-Password-42!' }, cookie);
  assert.equal(changed.status, 200); assert.match(changed.headers.get('set-cookie'), /; Secure/);
  const logout = await f.request('/api/logout', {}, changed.headers.get('set-cookie').split(';')[0]);
  assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie'), /Max-Age=0; Secure/);
});

test('local admin initialization CLI prepares a production database without exposing secrets or allowing a second admin', async t => {
  const f = await production(t);
  await f.restart();
  async function initialize() {
    const child = spawn(process.execPath, ['scripts/initialize-admin.mjs', f.databasePath], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = ''; for (const stream of [child.stdout, child.stderr]) stream.on('data', value => { output += value; });
    child.stdin.end(JSON.stringify({ username: 'owner', displayName: 'Owner', password }));
    const [code] = await once(child, 'close'); return { code, output };
  }
  const first = await initialize(); assert.equal(first.code, 0, first.output); assert.doesNotMatch(first.output, new RegExp(password));
  const login = await f.request('/api/login', { username: 'owner', password });
  assert.equal(login.status, 200); assert.equal((await login.json()).user.role, 'admin');
  assert.equal((await initialize()).code, 1);
});

test('health reports database readiness without authentication or private account data', async t => {
  const f = await production(t); await f.restart();
  const result = await f.request('/api/health');
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ok: true });
  assert.equal(result.headers.get('cache-control'), 'no-store');
});
