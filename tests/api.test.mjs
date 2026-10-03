import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplication } from '../server/application.mjs';

const ORIGIN = 'http://127.0.0.1:5173';
const password = 'Temporary-Test-Password-42!';
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'bracket-api-'));
  let app;
  let base;
  async function restart() {
    if (app) await app.close();
    app = await createApplication({ databasePath: join(directory, 'test.sqlite'), allowedOrigins: [ORIGIN] });
    await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${app.server.address().port}`;
  }
  await restart();
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }); });
  async function request(path, { method = 'GET', body, cookie, origin = ORIGIN } = {}) {
    const response = await fetch(base + path, { method, headers: { ...(method !== 'GET' ? { 'Content-Type': 'application/json', Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], cookieHeader: response.headers.get('set-cookie') };
  }
  return { request, restart };
}

test('the first organizer can create an admin once and sign in after a server restart', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/setup')).body.needed, true);
  const setup = await f.request('/api/setup', { method: 'POST', body: { username: 'owner', displayName: 'Owner', password } });
  assert.equal(setup.status, 201);
  assert.equal(setup.body.user.admin, true);
  assert.match(setup.cookieHeader, /HttpOnly/);
  assert.equal((await f.request('/api/setup', { method: 'POST', body: { username: 'attacker', displayName: 'Other', password } })).status, 409);
  await f.restart();
  const login = await f.request('/api/login', { method: 'POST', body: { username: 'owner', password } });
  assert.equal(login.status, 200);
  assert.equal((await f.request('/api/me', { cookie: login.cookie })).body.user.username, 'owner');
});

test('an admin provisions a member who must change password before using the application; old sessions are revoked', async t => {
  const f = await fixture(t);
  const admin = await f.request('/api/setup', { method: 'POST', body: { username: 'owner', displayName: 'Owner', password } });
  const member = await f.request('/api/users', { method: 'POST', cookie: admin.cookie, body: { username: 'entry', displayName: 'Nhập liệu', password } });
  assert.equal(member.status, 201);
  const login = await f.request('/api/login', { method: 'POST', body: { username: 'entry', password } });
  assert.equal(login.body.user.mustChangePassword, true);
  assert.equal((await f.request('/api/users', { cookie: login.cookie })).status, 403);
  const changed = await f.request('/api/password', { method: 'POST', cookie: login.cookie, body: { currentPassword: password, newPassword: 'Changed-Test-Password-43!' } });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.user.mustChangePassword, false);
  assert.equal((await f.request('/api/me', { cookie: login.cookie })).status, 401);
  assert.equal((await f.request('/api/users', { method: 'POST', cookie: changed.cookie, body: { username: 'other', displayName: 'Other', password } })).status, 403);
  const logout = await f.request('/api/logout', { method: 'POST', cookie: changed.cookie, body: {} });
  assert.equal(logout.status, 200);
  assert.equal((await f.request('/api/me', { cookie: changed.cookie })).status, 401);
  assert.equal((await f.request('/api/login', { method: 'POST', body: { username: 'entry', password } })).status, 401);
});

test('cross-origin writes are rejected without changing the setup state', async t => {
  const f = await fixture(t);
  const result = await f.request('/api/setup', { method: 'POST', origin: 'https://other.example', body: { username: 'owner', displayName: 'Owner', password } });
  assert.equal(result.status, 403);
  assert.equal((await f.request('/api/setup')).body.needed, true);
});

test('repeated failed sign-ins are limited without revealing whether the username exists', async t => {
  const f = await fixture(t);
  for (let n = 0; n < 10; n++) {
    assert.equal((await f.request('/api/login', { method: 'POST', body: { username: 'missing', password } })).status, 401);
  }
  assert.equal((await f.request('/api/login', { method: 'POST', body: { username: 'missing', password } })).status, 429);
});
