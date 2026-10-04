import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, owner, password } from './helpers.mjs';
import { createPreset } from '../shared/format.mjs';

async function ready(f, cookie) {
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Roster Cup' } })).body.tournament;
  const teams = [], players = [];
  for (let i = 0; i < 2; i++) {
    const team = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: `Team ${i}`, tag: `T${i}` } })).body.team;
    const player = (await f.request('/api/players', { method: 'POST', cookie, body: { name: `Player ${i}`, handle: `P${i}#VN2` } })).body.player;
    teams.push(team); players.push(player);
    assert.equal((await f.request(`/api/tournaments/${event.id}/registrations`, { method: 'POST', cookie, body: { teamId: team.id, playerIds: [player.id], revision: 0 } })).status, 201);
  }
  const spare = (await f.request('/api/players', { method: 'POST', cookie, body: { name: 'Reserve', handle: 'Reserve#VN2' } })).body.player;
  const current = (await f.request(`/api/tournaments/${event.id}`, { cookie })).body.tournament;
  const format = createPreset('single_elimination', teams.map(team => team.id)); format.stages[0].finalBo = 3;
  const saved = (await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision: current.revision, format } })).body.tournament;
  assert.equal((await f.request(`/api/tournaments/${event.id}/lock`, { method: 'POST', cookie, body: { revision: saved.revision } })).status, 200);
  return { id: event.id, teams, players, spare, path: `/api/tournaments/${event.id}/matches/stage1%3AU1` };
}

test('operator approves a locked roster addition with immutable history; later games allow the substitute', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, teams, players, spare, path } = await ready(f, cookie);
  const game = (n, action, body) => f.request(`${path}/games/${n}/${action}`, { method: 'POST', cookie, body });
  const original = { winnerId: teams[0].id, lineups: { [teams[0].id]: [players[0].id] } };
  assert.equal((await game(1, 'save', { revision: 0, data: original })).status, 200);
  const before = (await f.request(`/api/tournaments/${id}`, { cookie })).body.tournament;
  assert.ok(before.registrations.every(item => item.lockedAt));
  assert.equal((await f.request(`/api/tournaments/${id}/registrations`, { method: 'POST', cookie, body: { teamId: teams[0].id, playerIds: [players[0].id, spare.id], revision: 1 } })).status, 409);
  assert.equal((await game(1, 'save', { revision: 1, data: { ...original, lineups: { [teams[0].id]: [spare.id] } } })).status, 400);
  const addition = await f.request(`/api/tournaments/${id}/registrations/${teams[0].id}/additions`, { method: 'POST', cookie, body: { revision: 1, playerIds: [spare.id], reason: 'Duyệt tuyển thủ dự bị' } });
  assert.equal(addition.status, 200);
  assert.deepEqual(addition.body.registration.players.map(player => player.id), [players[0].id, spare.id]);
  assert.equal(addition.body.registration.lockedAt, before.registrations[0].lockedAt);
  assert.equal(addition.body.registration.revision, 2);
  assert.equal((await game(1, 'submit', { revision: 1 })).status, 200);
  assert.equal((await game(1, 'confirm', { revision: 2 })).status, 200);
  assert.equal((await game(2, 'save', { revision: 0, data: { winnerId: teams[1].id, lineups: { [teams[0].id]: [spare.id] } } })).status, 200);
  await f.restart();
  const history = (await f.request(`/api/tournaments/${id}/history`, { cookie })).body.history;
  assert.equal(history.length, 1); assert.equal(history[0].action, 'roster_addition');
  assert.equal(history[0].actor.displayName, 'Owner'); assert.equal(history[0].reason, 'Duyệt tuyển thủ dự bị');
  assert.deepEqual(history[0].before, before.registrations[0]);
  assert.deepEqual(history[0].after, addition.body.registration);
  const match = (await f.request(path, { cookie })).body.match;
  assert.deepEqual(match.games[0].data, original);
  assert.deepEqual(match.games[1].data.lineups[teams[0].id], [spare.id]);
});

test('only the event operator can approve; invalid, duplicate, archived and stale additions leave no writes', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, teams, players, spare, path } = await ready(f, cookie);
  const route = `/api/tournaments/${id}/registrations/${teams[0].id}/additions`;
  const valid = { revision: 1, playerIds: [spare.id], reason: 'Duyệt dự bị' };
  const approve = (body, as = cookie) => f.request(route, { method: 'POST', cookie: as, body });
  assert.equal((await approve(valid)).status, 409);
  await f.request(`${path}/games/1/save`, { method: 'POST', cookie, body: { revision: 0, data: {} } });
  const before = (await f.request(`/api/tournaments/${id}`, { cookie })).body.tournament;
  let operatorCookie;
  for (const username of ['entry', 'operator', 'outsider']) {
    const user = (await f.request('/api/users', { method: 'POST', cookie, body: { username, displayName: username, password } })).body.user;
    let as = (await f.request('/api/login', { method: 'POST', body: { username, password } })).cookie;
    as = (await f.request('/api/password', { method: 'POST', cookie: as, body: { currentPassword: password, newPassword: 'Changed-Password-42!' } })).cookie;
    if (username !== 'outsider') await f.request(`/api/tournaments/${id}/grants`, { method: 'POST', cookie, body: { userId: user.id, roles: [username], revision: 0 } });
    if (username === 'operator') operatorCookie = as;
    assert.equal((await approve({ ...valid, playerIds: [] }, as)).status, username === 'operator' ? 400 : 403);
    if (username === 'entry') assert.equal((await f.request(`/api/tournaments/${id}/history`, { cookie: as })).status, 200);
  }
  const archived = (await f.request('/api/players', { method: 'POST', cookie, body: { name: 'Archived', handle: 'Archived#VN2', archived: true } })).body.player;
  for (const [body, status] of [
    [{ ...valid, reason: ' ' }, 400], [{ ...valid, reason: 'x'.repeat(1001) }, 400],
    [{ ...valid, playerIds: [] }, 400], [{ ...valid, playerIds: [spare.id, spare.id] }, 400],
    [{ ...valid, playerIds: [players[0].id] }, 409], [{ ...valid, playerIds: [players[1].id] }, 409],
    [{ ...valid, playerIds: ['missing'] }, 400], [{ ...valid, playerIds: [archived.id] }, 400],
    [{ ...valid, revision: 0 }, 409],
  ]) assert.equal((await approve(body)).status, status);
  assert.deepEqual((await f.request(`/api/tournaments/${id}`, { cookie })).body.tournament, before);
  assert.equal((await f.request(`/api/tournaments/${id}/history`, { cookie })).body.history.length, 0);
  assert.equal((await approve(valid, operatorCookie)).status, 200);
  assert.equal((await approve(valid)).status, 409);
  const history = (await f.request(`/api/tournaments/${id}/history`, { cookie })).body.history;
  assert.equal(history.length, 1); assert.equal(history[0].actor.displayName, 'operator');
});

test('approval retains earlier snapshots and other seasons while recording current details for the new player', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, teams, players, spare, path } = await ready(f, cookie);
  const other = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Other season' } })).body.tournament;
  await f.request(`/api/tournaments/${other.id}/registrations`, { method: 'POST', cookie, body: { teamId: teams[0].id, playerIds: [players[0].id], revision: 0 } });
  const otherBefore = (await f.request(`/api/tournaments/${other.id}`, { cookie })).body.tournament;
  await f.request(`${path}/games/1/save`, { method: 'POST', cookie, body: { revision: 0, data: {} } });
  await f.request(`/api/teams/${teams[0].id}`, { method: 'POST', cookie, body: { ...teams[0], name: 'Renamed team' } });
  await f.request(`/api/players/${players[0].id}`, { method: 'POST', cookie, body: { ...players[0], handle: 'Renamed#VN2' } });
  await f.request(`/api/players/${spare.id}`, { method: 'POST', cookie, body: { ...spare, handle: 'CurrentReserve#VN2' } });
  const added = await f.request(`/api/tournaments/${id}/registrations/${teams[0].id}/additions`, { method: 'POST', cookie, body: { revision: 1, playerIds: [spare.id], reason: 'Bổ sung cho mùa này' } });
  assert.equal(added.status, 200);
  assert.equal(added.body.registration.team.name, 'Team 0');
  assert.equal(added.body.registration.players[0].handle, 'P0#VN2');
  assert.equal(added.body.registration.players[1].handle, 'CurrentReserve#VN2');
  assert.deepEqual((await f.request(`/api/tournaments/${other.id}`, { cookie })).body.tournament, otherBefore);
});
