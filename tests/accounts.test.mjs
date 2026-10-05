import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, owner, password } from './helpers.mjs';

async function member(f, admin, username = 'member') {
  const created = await f.request('/api/users', { method: 'POST', cookie: admin, body: { username, displayName: 'Member', password } });
  assert.equal(created.status, 201);
  const login = await f.request('/api/login', { method: 'POST', body: { username, password } });
  const changed = await f.request('/api/password', { method: 'POST', cookie: login.cookie, body: { currentPassword: password, newPassword: 'Changed-Member-Password-42!' } });
  assert.equal(changed.status, 200);
  return { ...changed.body.user, cookie: changed.cookie };
}

test('admin edits a name with revision protection and safe account history; members cannot manage accounts', async t => {
  const f = await fixture(t), admin = await owner(f), user = await member(f, admin);
  const path = `/api/users/${user.id}`;
  const save = (cookie, body) => f.request(path, { method: 'POST', cookie, body });
  assert.equal((await save(user.cookie, { revision: user.revision, displayName: 'Other' })).status, 403);
  const edited = await save(admin, { revision: user.revision, displayName: 'New name' });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.user.displayName, 'New name');
  assert.equal((await save(admin, { revision: user.revision, displayName: 'Stale' })).status, 409);
  const list = await f.request('/api/users', { cookie: admin });
  assert.equal(list.body.users.find(u => u.id === user.id).displayName, 'New name');
  assert.doesNotMatch(JSON.stringify(list.body), /password_hash|token_hash|Changed-Member/);
  const history = await f.request(`${path}/history`, { cookie: admin });
  assert.equal(history.status, 200);
  assert.equal(history.body.history[0].action, 'account_update');
  assert.equal(history.body.history[0].before.displayName, 'Member');
  assert.equal(history.body.history[0].after.displayName, 'New name');
  assert.equal((await f.request(`${path}/history`, { cookie: user.cookie })).status, 403);
  await f.restart();
  assert.equal((await f.request(`${path}/history`, { cookie: admin })).body.history[0].after.displayName, 'New name');
});

test('locking and admin changes revoke sessions; self lock and loss of the last ready admin are blocked', async t => {
  const f = await fixture(t), admin = await owner(f), user = await member(f, admin);
  const me = (await f.request('/api/me', { cookie: admin })).body.user;
  const change = (id, body) => f.request(`/api/users/${id}`, { method: 'POST', cookie: admin, body });
  assert.equal((await change(me.id, { revision: me.revision, disabled: true })).status, 400);
  assert.equal((await change(me.id, { revision: me.revision, admin: false })).status, 400);
  const locked = await change(user.id, { revision: user.revision, disabled: true });
  assert.equal(locked.status, 200);
  assert.equal((await f.request('/api/me', { cookie: user.cookie })).status, 401);
  assert.equal((await f.request('/api/login', { method: 'POST', body: { username: user.username, password: 'Changed-Member-Password-42!' } })).status, 401);
  const opened = await change(user.id, { revision: locked.body.user.revision, disabled: false, admin: true });
  assert.equal(opened.status, 200);
  const second = await f.request('/api/login', { method: 'POST', body: { username: user.username, password: 'Changed-Member-Password-42!' } });
  const demoted = await f.request(`/api/users/${me.id}`, { method: 'POST', cookie: second.cookie, body: { revision: me.revision, admin: false } });
  assert.equal(demoted.status, 200);
  assert.equal((await f.request('/api/me', { cookie: admin })).status, 401);
  assert.equal((await f.request(`/api/users/${user.id}`, { method: 'POST', cookie: second.cookie, body: { revision: opened.body.user.revision, disabled: true } })).status, 400);
});

test('admin resets temporary passwords and revokes all sessions with audit; plaintext never appears in responses', async t => {
  const f = await fixture(t), admin = await owner(f), user = await member(f, admin);
  const path = `/api/users/${user.id}`;
  const command = (action, body, cookie = admin) => f.request(`${path}/${action}`, { method: 'POST', cookie, body });
  const reset = await command('reset-password', { revision: user.revision, password });
  assert.equal(reset.status, 200);
  assert.equal(reset.body.user.mustChangePassword, true);
  assert.equal((await f.request('/api/me', { cookie: user.cookie })).status, 401);
  assert.equal((await f.request('/api/login', { method: 'POST', body: { username: user.username, password: 'Changed-Member-Password-42!' } })).status, 401);
  const login = await f.request('/api/login', { method: 'POST', body: { username: user.username, password } });
  assert.equal(login.status, 200);
  assert.equal((await f.request('/api/tournaments', { cookie: login.cookie })).status, 403);
  const changed = await f.request('/api/password', { method: 'POST', cookie: login.cookie, body: { currentPassword: password, newPassword: 'Member-Another-Password-42!' } });
  const rev = changed.body.user.revision;
  assert.equal((await command('revoke-sessions', { revision: rev }, changed.cookie)).status, 403);
  assert.equal((await command('revoke-sessions', { revision: rev })).status, 200);
  assert.equal((await f.request('/api/me', { cookie: changed.cookie })).status, 401);
  assert.equal((await command('reset-password', { revision: rev, password })).status, 409);
  const history = await f.request(`${path}/history`, { cookie: admin });
  assert.equal(history.body.history[0].action, 'sessions_revoked');
  assert.ok(history.body.history.some(item => item.action === 'password_reset'));
  assert.ok(history.body.history.some(item => item.action === 'account_created'));
  assert.doesNotMatch(JSON.stringify(history.body), /Temporary-Test|Member-Another|password_hash|token_hash/);
  const me = (await f.request('/api/me', { cookie: admin })).body.user;
  assert.equal((await f.request(`/api/users/${me.id}/reset-password`, { method: 'POST', cookie: admin, body: { revision: me.revision, password } })).status, 400);
});

test('account list and audit show a single global role without exposing access to members', async t => {
  const f = await fixture(t), admin = await owner(f), user = await member(f, admin);
  assert.equal((await f.request('/api/users', { cookie: user.cookie })).status, 403);
  assert.equal((await f.request('/api/users', { cookie: admin })).body.users.find(u => u.id === user.id).role, 'caster');
  await f.request(`/api/users/${user.id}`, { method: 'POST', cookie: admin, body: { revision: user.revision, role: 'operator' } });
  const history = (await f.request(`/api/users/${user.id}/history`, { cookie: admin })).body.history;
  assert.equal(history[0].action, 'account_update');
  assert.equal(history[0].before.role, 'caster');
  assert.equal(history[0].after.role, 'operator');
});

test('a password change audits the actual latest account name when an admin rename overlaps hashing', async t => {
  const f = await fixture(t), admin = await owner(f), user = await member(f, admin);
  const changing = f.request('/api/password', { method: 'POST', cookie: user.cookie, body: { currentPassword: 'Changed-Member-Password-42!', newPassword: 'Concurrent-Name-Password-42!' } });
  const renamed = await f.request(`/api/users/${user.id}`, { method: 'POST', cookie: admin, body: { revision: user.revision, displayName: 'New member name' } });
  assert.equal(renamed.status, 200);
  assert.equal((await changing).status, 200);
  const history = (await f.request(`/api/users/${user.id}/history`, { cookie: admin })).body.history;
  assert.equal(history[0].action, 'password_changed');
  assert.equal(history[0].before.displayName, 'New member name');
  assert.equal(history[0].before.revision, renamed.body.user.revision);
});
