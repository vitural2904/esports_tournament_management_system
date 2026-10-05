import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, owner } from './helpers.mjs';

test('nickname-only player can join and position snapshots survive directory edits and restart', async t => {
  const f = await fixture(t), cookie = await owner(f);
  const player = await f.request('/api/players', { method: 'POST', cookie, body: { handle: 'Eight', position: 'Mid' } });
  assert.equal(player.status, 201);
  assert.equal(player.body.player.name, '');
  const team = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: 'Eight Team', tag: 'E8' } })).body.team;
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Eight Cup' } })).body.tournament;
  await f.request(`/api/tournaments/${event.id}/registrations`, { method: 'POST', cookie, body: { teamId: team.id, playerIds: [player.body.player.id], revision: 0 } });
  await f.request(`/api/players/${player.body.player.id}`, { method: 'POST', cookie, body: { handle: 'Renamed', name: 'New name', position: 'Top', revision: 1 } });
  await f.restart();
  const stored = (await f.request(`/api/tournaments/${event.id}`, { cookie })).body.tournament;
  assert.equal(stored.registrations[0].players[0].handle, 'Eight');
  assert.equal(stored.registrations[0].players[0].position, 'Mid');
  assert.equal((await f.request('/api/players', { method: 'POST', cookie, body: { handle: 'Bad', position: 'Coach' } })).status, 400);
});

test('profile adds eight members atomically, preserving the roster on duplicate or stale requests', async t => {
  const f = await fixture(t), cookie = await owner(f);
  const team = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: 'Eight Team', tag: 'E8' } })).body.team;
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Eight Cup' } })).body.tournament;
  const path = `/api/tournaments/${event.id}/teams/${team.id}/members`;
  for (let i = 0; i < 8; i++) {
    const response = await f.request(path, { method: 'POST', cookie, body: { revision: i, player: { handle: `Member ${i}` } } });
    assert.equal(response.status, i === 0 ? 201 : 200);
    assert.equal(response.body.registration.players.length, i + 1);
  }
  assert.equal((await f.request(path, { method: 'POST', cookie, body: { revision: 0, player: { handle: 'Must rollback' } } })).status, 409);
  assert.equal((await f.request(path, { method: 'POST', cookie, body: { revision: 8, player: { handle: 'member 0' } } })).status, 409);
  const directory = (await f.request('/api/directory', { cookie })).body;
  assert.equal(directory.players.length, 8);
  const profile = await f.request(`/api/tournaments/${event.id}/teams/${team.id}/profile`, { cookie });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.profile.registration.players.length, 8);
  assert.deepEqual(profile.body.profile.matches, []);
});

test('scoped profile exposes only granted snapshots and locked atomic additions require audit reason', async t => {
  const { createPreset } = await import('../shared/format.mjs');
  const { password } = await import('./helpers.mjs');
  const f = await fixture(t), cookie = await owner(f);
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Visible Cup' } })).body.tournament;
  const privateEvent = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Private Cup' } })).body.tournament;
  const teams = [];
  for (let i = 0; i < 2; i++) {
    const team = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: `Team ${i}`, tag: `T${i}` } })).body.team; teams.push(team);
    await f.request(`/api/tournaments/${event.id}/teams/${team.id}/members`, { method: 'POST', cookie, body: { revision: 0, player: { handle: `First ${i}`, position: 'Mid' } } });
  }
  await f.request(`/api/tournaments/${privateEvent.id}/registrations`, { method: 'POST', cookie, body: { teamId: teams[0].id, playerIds: [], revision: 0 } });
  const fresh = (await f.request(`/api/tournaments/${event.id}`, { cookie })).body.tournament;
  const saved = (await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision: fresh.revision, format: createPreset('single_elimination', teams.map(team => team.id)) } })).body.tournament;
  await f.request(`/api/tournaments/${event.id}/lock`, { method: 'POST', cookie, body: { revision: saved.revision } });
  await f.request(`/api/tournaments/${event.id}/matches/stage1%3AU1/games/1/save`, { method: 'POST', cookie, body: { revision: 0, data: {} } });
  const path = `/api/tournaments/${event.id}/teams/${teams[0].id}/members`;
  assert.equal((await f.request(path, { method: 'POST', cookie, body: { revision: 1, player: { handle: 'Reserve', position: 'Support' } } })).status, 400);
  assert.equal((await f.request('/api/directory', { cookie })).body.players.length, 2);
  assert.equal((await f.request(path, { method: 'POST', cookie, body: { revision: 1, player: { handle: 'Reserve', position: 'Support' }, reason: 'Approved reserve' } })).status, 200);
  assert.equal((await f.request(`/api/tournaments/${event.id}/history`, { cookie })).body.history[0].reason, 'Approved reserve');
  const user = (await f.request('/api/users', { method: 'POST', cookie, body: { username: 'reader', displayName: 'Reader', password } })).body.user;
  let as = (await f.request('/api/login', { method: 'POST', body: { username: 'reader', password } })).cookie;
  as = (await f.request('/api/password', { method: 'POST', cookie: as, body: { currentPassword: password, newPassword: 'Changed-Password-42!' } })).cookie;
  await f.request(`/api/teams/${teams[0].id}`, { method: 'POST', cookie, body: { ...teams[0], name: 'Private changed identity' } });
  await f.restart();
  const profile = (await f.request(`/api/tournaments/${event.id}/teams/${teams[0].id}/profile`, { cookie: as })).body.profile;
  assert.equal(profile.team.name, 'Team 0');
  assert.equal(profile.registration.players.length, 2);
  assert.equal(profile.registration.players[1].position, 'Support');
  assert.equal(profile.directoryTeam, null);
  assert.equal(profile.participations.length, 2);
  assert.equal(profile.matches.length, 1);
  assert.equal(profile.canAdd, false);
  assert.equal((await f.request(`/api/teams/${teams[0].id}/profile`, { cookie: as })).status, 200);
  assert.equal((await f.request(`/api/tournaments/${privateEvent.id}/teams/${teams[0].id}/profile`, { cookie: as })).status, 200);
  assert.equal((await f.request(path, { method: 'POST', cookie: as, body: { revision: 2, player: { handle: 'Forbidden' }, reason: 'No' } })).status, 403);
});

test('profile provides the whole authorized tournament for schedule signals before filtering team matches', async t => {
  const { createPreset } = await import('../shared/format.mjs');
  const { matchSignals } = await import('../shared/match-signals.mjs');
  const f = await fixture(t), cookie = await owner(f);
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Signal Cup' } })).body.tournament;
  const teams = [];
  for (let i = 0; i < 4; i++) {
    const team = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: `Signal ${i}`, tag: `S${i}` } })).body.team; teams.push(team);
    await f.request(`/api/tournaments/${event.id}/registrations`, { method: 'POST', cookie, body: { teamId: team.id, revision: 0, playerIds: [] } });
  }
  const fresh = (await f.request(`/api/tournaments/${event.id}`, { cookie })).body.tournament;
  const saved = (await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision: fresh.revision, format: createPreset('single_elimination', teams.map(team => team.id)) } })).body.tournament;
  await f.request(`/api/tournaments/${event.id}/lock`, { method: 'POST', cookie, body: { revision: saved.revision } });
  const all = (await f.request(`/api/tournaments/${event.id}/matches`, { cookie })).body.matches;
  const own = all.find(match => match.teams.includes(teams[0].id));
  const other = all.find(match => match.status === 'ready' && !match.teams.includes(teams[0].id));
  await f.request(`/api/tournaments/${event.id}/schedule`, { method: 'POST', cookie, body: { updates: [{ matchId: own.id, revision: own.revision, scheduledAt: '2026-10-05T10:00:00Z' }, { matchId: other.id, revision: other.revision, scheduledAt: '2026-10-05T09:00:00Z' }] } });
  const profile = (await f.request(`/api/tournaments/${event.id}/teams/${teams[0].id}/profile`, { cookie })).body.profile;
  assert.equal(profile.matches.length, 1);
  assert.equal(profile.signalMatches.length, 3);
  const signals = matchSignals(profile.signalMatches, Date.parse('2026-10-05T08:00:00Z'));
  assert.equal(signals[own.id].isNext, false);
  assert.equal(signals[other.id].isNext, true);
  const directory = (await f.request(`/api/teams/${teams[0].id}/profile`, { cookie })).body.profile;
  assert.deepEqual(directory.signalMatches, []);
});
