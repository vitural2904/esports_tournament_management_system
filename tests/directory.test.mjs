import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, owner, password } from './helpers.mjs';

test('archived directory records cannot join a new tournament while existing snapshots remain readable', async t => {
  const f = await fixture(t), cookie = await owner(f);
  const team = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: 'Archive Team', tag: 'ARC' } })).body.team;
  const player = (await f.request('/api/players', { method: 'POST', cookie, body: { name: 'Archive Player', handle: 'Archived#VN2' } })).body.player;
  const old = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Old season' } })).body.tournament;
  await f.request(`/api/tournaments/${old.id}/registrations`, { method: 'POST', cookie, body: { teamId: team.id, playerIds: [player.id], revision: 0 } });
  assert.equal((await f.request(`/api/players/${player.id}`, { method: 'POST', cookie, body: { ...player, archived: true } })).status, 200);
  const current = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'New season' } })).body.tournament;
  assert.equal((await f.request(`/api/tournaments/${current.id}/registrations`, { method: 'POST', cookie, body: { teamId: team.id, playerIds: [player.id], revision: 0 } })).status, 400);
  assert.equal((await f.request(`/api/teams/${team.id}`, { method: 'POST', cookie, body: { ...team, archived: true } })).status, 200);
  assert.equal((await f.request(`/api/tournaments/${current.id}/registrations`, { method: 'POST', cookie, body: { teamId: team.id, playerIds: [], revision: 0 } })).status, 400);
  await f.restart();
  const stored = (await f.request(`/api/tournaments/${old.id}`, { cookie })).body.tournament;
  assert.equal(stored.registrations[0].team.name, team.name);
  assert.equal(stored.registrations[0].players[0].handle, player.handle);
});

test('directory rejects unauthorized writes, duplicate identities, bad IDs and duplicate tournament players', async t => {
  const f = await fixture(t), cookie = await owner(f);
  assert.equal((await f.request('/api/directory')).status, 401);
  await f.request('/api/users', { method: 'POST', cookie, body: { username: 'entry', displayName: 'Entry', password } });
  const login = await f.request('/api/login', { method: 'POST', body: { username: 'entry', password } });
  const changed = await f.request('/api/password', { method: 'POST', cookie: login.cookie, body: { currentPassword: password, newPassword: 'Changed-Test-Password-42!' } });
  assert.equal(changed.status, 200);
  assert.equal((await f.request('/api/teams', { method: 'POST', cookie: changed.cookie, body: { name: 'Forbidden', tag: 'NO' } })).status, 403);
  assert.equal((await f.request('/api/directory', { cookie: changed.cookie })).status, 403);
  const team = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: 'GAM', tag: 'GAM' } })).body.team;
  assert.equal((await f.request('/api/teams', { method: 'POST', cookie, body: { name: ' gam ', tag: 'COPY' } })).status, 409);
  assert.equal((await f.request('/api/teams', { method: 'POST', cookie, body: { name: ' ', tag: 'EMPTY' } })).status, 400);
  const player = (await f.request('/api/players', { method: 'POST', cookie, body: { name: 'Player', handle: 'Player#VN2' } })).body.player;
  assert.equal((await f.request('/api/players', { method: 'POST', cookie, body: { name: 'Copy', handle: 'player#vn2' } })).status, 409);
  const second = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: 'VKE', tag: 'VKE' } })).body.team;
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Test season' } })).body.tournament;
  const path = `/api/tournaments/${event.id}/registrations`;
  const register = body => f.request(path, { method: 'POST', cookie, body });
  assert.equal((await register({ teamId: 'missing', playerIds: [], revision: 0 })).status, 400);
  assert.equal((await register({ teamId: team.id, playerIds: ['missing'], revision: 0 })).status, 400);
  assert.equal((await register({ teamId: team.id, playerIds: [player.id, player.id], revision: 0 })).status, 400);
  assert.equal((await register({ teamId: team.id, playerIds: [player.id], revision: 0 })).status, 201);
  assert.equal((await register({ teamId: second.id, playerIds: [player.id], revision: 0 })).status, 409);
  assert.equal((await register({ teamId: team.id, playerIds: [], revision: 0 })).status, 409);
  const stored = (await f.request(`/api/tournaments/${event.id}`, { cookie })).body.tournament;
  assert.equal(stored.revision, 2);
  assert.equal(stored.registrations.length, 1);
  assert.equal(stored.registrations[0].players.length, 1);
});

test('organizer creates and edits teams and players, retains them after restart, and rejects stale edits', async t => {
  const f = await fixture(t), cookie = await owner(f);
  const team = await f.request('/api/teams', { method: 'POST', cookie, body: { name: 'GAM Esports', tag: 'GAM' } });
  assert.equal(team.status, 201);
  const player = await f.request('/api/players', { method: 'POST', cookie, body: { name: 'Nguyễn Văn A', handle: 'PlayerA#VN2' } });
  assert.equal(player.status, 201);
  const edited = await f.request(`/api/teams/${team.body.team.id}`, { method: 'POST', cookie, body: { name: 'GAM Academy', tag: 'GAMA', revision: 1 } });
  assert.equal(edited.status, 200);
  assert.equal((await f.request(`/api/teams/${team.body.team.id}`, { method: 'POST', cookie, body: { name: 'Stale', tag: 'OLD', revision: 1 } })).status, 409);
  await f.restart();
  const directory = await f.request('/api/directory', { cookie });
  assert.equal(directory.body.teams[0].name, 'GAM Academy');
  assert.equal(directory.body.players[0].handle, 'PlayerA#VN2');
});

test('registrations preserve historical names and handles while later tournaments use the updated directory', async t => {
  const f = await fixture(t), cookie = await owner(f);
  const team = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: 'GAM Esports', tag: 'GAM' } })).body.team;
  const player = (await f.request('/api/players', { method: 'POST', cookie, body: { name: 'Nguyễn Văn A', handle: 'OldHandle#VN2' } })).body.player;
  const season1 = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Mùa 1' } })).body.tournament;
  assert.ok(season1);
  assert.equal((await f.request(`/api/tournaments/${season1.id}/registrations`, { method: 'POST', cookie, body: { teamId: team.id, playerIds: [player.id], revision: 0 } })).status, 201);
  await f.request(`/api/teams/${team.id}`, { method: 'POST', cookie, body: { name: 'GAM Academy', tag: 'GAMA', revision: 1 } });
  await f.request(`/api/players/${player.id}`, { method: 'POST', cookie, body: { name: 'Nguyễn Văn A', handle: 'NewHandle#VN2', revision: 1 } });
  const season2 = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Mùa 2' } })).body.tournament;
  await f.request(`/api/tournaments/${season2.id}/registrations`, { method: 'POST', cookie, body: { teamId: team.id, playerIds: [player.id], revision: 0 } });
  await f.restart();
  const old = (await f.request(`/api/tournaments/${season1.id}`, { cookie })).body.tournament;
  const current = (await f.request(`/api/tournaments/${season2.id}`, { cookie })).body.tournament;
  assert.equal(old.registrations[0].team.name, 'GAM Esports');
  assert.equal(old.registrations[0].players[0].handle, 'OldHandle#VN2');
  assert.equal(current.registrations[0].team.name, 'GAM Academy');
  assert.equal(current.registrations[0].players[0].handle, 'NewHandle#VN2');
});
