import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, owner, password } from './helpers.mjs';

test('tournament grants isolate reads and writes, combine roles, persist, and revoke existing sessions', async t => {
  const f = await fixture(t), admin = await owner(f);
  const user = (await f.request('/api/users', { method: 'POST', cookie: admin, body: { username: 'member', displayName: 'Member', password } })).body.user;
  const login = await f.request('/api/login', { method: 'POST', body: { username: 'member', password } });
  const member = (await f.request('/api/password', { method: 'POST', cookie: login.cookie, body: { currentPassword: password, newPassword: 'Member-Changed-Password-42!' } })).cookie;
  const first = (await f.request('/api/tournaments', { method: 'POST', cookie: admin, body: { name: 'First' } })).body.tournament;
  const second = (await f.request('/api/tournaments', { method: 'POST', cookie: admin, body: { name: 'Second' } })).body.tournament;
  assert.deepEqual((await f.request('/api/tournaments', { cookie: member })).body.tournaments, []);
  assert.equal((await f.request(`/api/tournaments/${first.id}`, { cookie: member })).status, 403);
  const grantPath = `/api/tournaments/${first.id}/grants`;
  const assign = body => f.request(grantPath, { method: 'POST', cookie: admin, body: { userId: user.id, ...body } });
  assert.equal((await assign({ roles: ['entry'], revision: 0 })).status, 200);
  const list = (await f.request('/api/tournaments', { cookie: member })).body.tournaments;
  assert.deepEqual(list.map(item => item.id), [first.id]);
  assert.deepEqual(list[0].roles, ['entry']);
  assert.equal((await f.request(`/api/tournaments/${second.id}`, { cookie: member })).status, 403);
  assert.equal((await f.request(`/api/tournaments/${first.id}/registrations`, { method: 'POST', cookie: member, body: {} })).status, 403);
  assert.equal((await f.request(grantPath, { method: 'POST', cookie: member, body: { userId: user.id, roles: ['operator'], revision: 1 } })).status, 403);
  assert.equal((await assign({ roles: ['operator', 'entry'], revision: 1 })).status, 200);
  assert.equal((await assign({ roles: ['entry'], revision: 1 })).status, 409);
  assert.equal((await assign({ roles: ['admin'], revision: 2 })).status, 400);
  assert.equal((await f.request('/api/teams', { method: 'POST', cookie: member, body: { name: 'Operator Team', tag: 'OP' } })).status, 201);
  const created = await f.request('/api/tournaments', { method: 'POST', cookie: member, body: { name: 'Created by operator' } });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.tournament.roles, ['operator']);
  assert.equal((await f.request(`/api/tournaments/${created.body.tournament.id}/grants`, { cookie: member })).status, 403);
  await f.restart();
  assert.deepEqual((await f.request(`/api/tournaments/${first.id}`, { cookie: member })).body.tournament.roles, ['operator', 'entry']);
  assert.equal((await assign({ roles: [], revision: 2 })).status, 200);
  assert.equal((await f.request(`/api/tournaments/${first.id}`, { cookie: member })).status, 403);
  // The new tournament's independent operator grant remains until it is revoked.
  assert.equal((await f.request('/api/directory', { cookie: member })).status, 200);
  assert.equal((await f.request(`/api/tournaments/${created.body.tournament.id}/grants`, { method: 'POST', cookie: admin, body: { userId: user.id, roles: [], revision: 1 } })).status, 200);
  assert.equal((await f.request('/api/directory', { cookie: member })).status, 403);
});
