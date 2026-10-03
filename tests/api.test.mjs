import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { fixture, password } from './helpers.mjs';

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

test('old-password sign-ins overlapping a password change cannot leave any usable session', async t => {
  for (let round = 0; round < 3; round++) {
    const f = await fixture(t);
    const admin = await f.request('/api/setup', { method: 'POST', body: { username: 'owner', displayName: 'Owner', password } });
    const changing = f.request('/api/password', { method: 'POST', cookie: admin.cookie, body: { currentPassword: password, newPassword: 'Changed-Concurrent-Password-44!' } });
    await delay(45);
    const attempts = Array.from({ length: 8 }, () => f.request('/api/login', { method: 'POST', body: { username: 'owner', password } }));
    assert.equal((await changing).status, 200);
    for (const attempt of await Promise.all(attempts)) {
      if (attempt.cookie) assert.equal((await f.request('/api/me', { cookie: attempt.cookie })).status, 401);
    }
  }
});
