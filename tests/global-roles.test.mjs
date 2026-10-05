import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, owner, password } from './helpers.mjs';
import { createPreset } from '../shared/format.mjs';

test('an admin assigns exactly one global role and role changes revoke existing sessions', async t => {
  const f = await fixture(t), admin = await owner(f);
  const created = await f.request('/api/users', { method: 'POST', cookie: admin, body: { username: 'referee-test', displayName: 'Referee', password, role: 'referee' } });
  assert.equal(created.status, 201);
  assert.equal(created.body.user.role, 'referee');
  const login = await f.request('/api/login', { method: 'POST', body: { username: 'referee-test', password } });
  const changed = await f.request('/api/password', { method: 'POST', cookie: login.cookie, body: { currentPassword: password, newPassword: 'Changed-Referee-Password-42!' } });
  assert.equal((await f.request(`/api/users/${created.body.user.id}`, { method: 'POST', cookie: admin, body: { revision: changed.body.user.revision, role: 'caster' } })).status, 200);
  assert.equal((await f.request('/api/me', { cookie: changed.cookie })).status, 401);
  assert.equal((await f.request('/api/users', { method: 'POST', cookie: admin, body: { username: 'invalid-role', displayName: 'Invalid', password, role: 'entry' } })).status, 400);
});

test('referee confirms and corrects a completed match while caster views every event without business writes', async t => {
  const f = await fixture(t), admin = await owner(f);
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie: admin, body: { name: 'Global Roles Cup' } })).body.tournament;
  const teams = [];
  for (const name of ['First', 'Second']) {
    const team = (await f.request('/api/teams', { method: 'POST', cookie: admin, body: { name, tag: name } })).body.team;
    teams.push(team.id);
    await f.request(`/api/tournaments/${event.id}/registrations`, { method: 'POST', cookie: admin, body: { teamId: team.id, playerIds: [], revision: 0 } });
  }
  const base = `/api/tournaments/${event.id}`;
  const current = (await f.request(base, { cookie: admin })).body.tournament;
  const format = createPreset('single_elimination', teams);
  format.stages[0].bo = 1; format.stages[0].finalBo = 1;
  const saved = (await f.request(`${base}/format`, { method: 'POST', cookie: admin, body: { revision: current.revision, format } })).body.tournament;
  await f.request(`${base}/lock`, { method: 'POST', cookie: admin, body: { revision: saved.revision } });
  const cookies = {};
  for (const role of ['referee', 'caster']) {
    await f.request('/api/users', { method: 'POST', cookie: admin, body: { username: `${role}-global`, displayName: role, role, password } });
    const login = await f.request('/api/login', { method: 'POST', body: { username: `${role}-global`, password } });
    cookies[role] = (await f.request('/api/password', { method: 'POST', cookie: login.cookie, body: { currentPassword: password, newPassword: 'Changed-Global-Password-42!' } })).cookie;
  }
  const match = (await f.request(`${base}/matches`, { cookie: cookies.referee })).body.matches[0];
  const path = `${base}/matches/${encodeURIComponent(match.id)}`;
  for (const [action, body] of [['save', { revision: 0, data: { winnerId: teams[0] } }], ['submit', { revision: 1 }], ['confirm', { revision: 2 }]]) {
    assert.equal((await f.request(`${path}/games/1/${action}`, { method: 'POST', cookie: cookies.referee, body })).status, 200);
  }
  const completed = (await f.request(path, { cookie: cookies.referee })).body.match;
  assert.equal(completed.winnerId, teams[0]);
  const command = { kind: 'game_edit', number: 1, matchRevision: completed.revision, gameRevision: completed.games[0].revision, data: { winnerId: teams[1] }, reason: 'Correct old result' };
  const preview = await f.request(`${path}/changes/preview`, { method: 'POST', cookie: cookies.referee, body: command });
  assert.equal(preview.status, 200);
  assert.equal((await f.request(`${path}/changes/apply`, { method: 'POST', cookie: cookies.referee, body: { ...command, previewToken: preview.body.previewToken } })).status, 200);
  assert.equal((await f.request(path, { cookie: cookies.caster })).body.match.winnerId, teams[1]);
  assert.equal((await f.request(`${base}/standings`, { cookie: cookies.caster })).body.championId, teams[1]);
  assert.equal((await f.request(`${base}/standings`, { cookie: cookies.referee })).status, 403);
  assert.equal((await f.request('/api/directory', { cookie: cookies.referee })).status, 403);
  assert.equal((await f.request(`/api/teams/${teams[0]}/profile`, { cookie: cookies.referee })).status, 403);
  assert.equal((await f.request(`${path}/changes/preview`, { method: 'POST', cookie: cookies.caster, body: command })).status, 403);
  assert.equal((await f.request(`${base}/schedule`, { method: 'POST', cookie: cookies.referee, body: { updates: [{ matchId: match.id, revision: completed.revision, scheduledAt: null }] } })).status, 403);
});
