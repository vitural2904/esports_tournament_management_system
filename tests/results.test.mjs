import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, owner, password } from './helpers.mjs';
import { createPreset } from '../shared/format.mjs';

async function ready(f, cookie, bo = 3) {
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: `BO${bo} Cup` } })).body.tournament;
  const teamIds = [], playerIds = [];
  for (let i = 0; i < 2; i++) {
    const team = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: `Team ${bo}-${i}`, tag: `T${i}` } })).body.team;
    teamIds.push(team.id);
    const player = (await f.request('/api/players', { method: 'POST', cookie, body: { name: `Player ${bo}-${i}`, handle: `P${bo}${i}#VN2` } })).body.player;
    playerIds.push(player.id);
    await f.request(`/api/tournaments/${event.id}/registrations`, { method: 'POST', cookie, body: { teamId: team.id, playerIds: [player.id], revision: 0 } });
  }
  const current = (await f.request(`/api/tournaments/${event.id}`, { cookie })).body.tournament;
  const format = createPreset('single_elimination', teamIds); format.stages[0].bo = bo; format.stages[0].finalBo = bo;
  const saved = (await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision: current.revision, format } })).body.tournament;
  const locked = (await f.request(`/api/tournaments/${event.id}/lock`, { method: 'POST', cookie, body: { revision: saved.revision } })).body.tournament;
  return { event: locked, teamIds, playerIds, matchId: locked.graph[0].id, path: `/api/tournaments/${event.id}/matches/${encodeURIComponent(locked.graph[0].id)}` };
}

test('drafts may be incomplete; only confirmed games score, BO3 ends at two wins and rejects duplicate or excess games', async t => {
  const f = await fixture(t), cookie = await owner(f), { path, teamIds } = await ready(f, cookie);
  const command = (number, action, body) => f.request(`${path}/games/${number}/${action}`, { method: 'POST', cookie, body });
  const blank = await command(1, 'save', { revision: 0, data: {} });
  assert.equal(blank.status, 200);
  assert.equal(blank.body.game.state, 'draft');
  assert.equal((await command(1, 'submit', { revision: 1 })).status, 400);
  assert.deepEqual((await f.request(path, { cookie })).body.match.score, [0, 0]);
  assert.equal((await command(1, 'save', { revision: 1, data: { winnerId: teamIds[0], durationSeconds: 1820, patch: '26.19' } })).status, 200);
  assert.equal((await command(1, 'save', { revision: 1, data: { winnerId: teamIds[1] } })).status, 409);
  assert.equal((await command(1, 'submit', { revision: 2 })).status, 200);
  assert.equal((await command(1, 'submit', { revision: 3 })).status, 409);
  assert.equal((await command(2, 'save', { revision: 0, data: {} })).status, 409);
  assert.deepEqual((await f.request(path, { cookie })).body.match.score, [0, 0]);
  assert.equal((await command(1, 'confirm', { revision: 3 })).status, 200);
  assert.equal((await command(1, 'confirm', { revision: 4 })).status, 409);
  assert.deepEqual((await f.request(path, { cookie })).body.match.score, [1, 0]);
  assert.equal((await command(2, 'save', { revision: 0, data: { winnerId: teamIds[0] } })).status, 200);
  assert.equal((await command(2, 'submit', { revision: 1 })).status, 200);
  assert.equal((await command(2, 'confirm', { revision: 2 })).status, 200);
  const completed = (await f.request(path, { cookie })).body.match;
  assert.equal(completed.winnerId, teamIds[0]); assert.equal(completed.status, 'completed');
  assert.equal((await command(3, 'save', { revision: 0, data: {} })).status, 409);
  await f.restart();
  const persisted = (await f.request(path, { cookie })).body.match;
  assert.deepEqual(persisted.score, [2, 0]);
  assert.equal(persisted.games[0].data.patch, '26.19');
});

test('BO1 and BO5 end at their win thresholds, including a full five-game series', async t => {
  const f = await fixture(t), cookie = await owner(f);
  for (const bo of [1, 5]) {
    const { path, teamIds } = await ready(f, cookie, bo);
    const winners = bo === 1 ? [0] : [0, 1, 0, 1, 0];
    for (let i = 0; i < winners.length; i++) {
      const endpoint = `${path}/games/${i + 1}`;
      assert.equal((await f.request(`${endpoint}/save`, { method: 'POST', cookie, body: { revision: 0, data: { winnerId: teamIds[winners[i]] } } })).status, 200);
      assert.equal((await f.request(`${endpoint}/submit`, { method: 'POST', cookie, body: { revision: 1 } })).status, 200);
      assert.equal((await f.request(`${endpoint}/confirm`, { method: 'POST', cookie, body: { revision: 2 } })).status, 200);
      if (i < winners.length - 1) assert.equal((await f.request(path, { cookie })).body.match.winnerId, null);
    }
    const done = (await f.request(path, { cookie })).body.match;
    assert.equal(done.winnerId, teamIds[0]); assert.deepEqual(done.score, bo === 1 ? [1, 0] : [3, 2]);
  }
});

async function member(f, admin, username) {
  const user = (await f.request('/api/users', { method: 'POST', cookie: admin, body: { username, displayName: username, password, role: username === 'entry' ? 'referee' : username === 'operator' ? 'operator' : 'caster' } })).body.user;
  const login = await f.request('/api/login', { method: 'POST', body: { username, password } });
  const changed = await f.request('/api/password', { method: 'POST', cookie: login.cookie, body: { currentPassword: password, newPassword: 'Changed-Member-Password-42!' } });
  return { id: user.id, cookie: changed.cookie };
}

test('entry submits and operator confirms; foreign teams, invalid lineups, pick/ban duplicates and stat fields are rejected', async t => {
  const f = await fixture(t), admin = await owner(f), { event, path, teamIds, playerIds, matchId } = await ready(f, admin);
  const entry = await member(f, admin, 'entry'), operator = await member(f, admin, 'operator'), outsider = await member(f, admin, 'outsider');
  assert.equal((await f.request(path, { cookie: outsider.cookie })).status, 200);
  const endpoint = `${path}/games/1`;
  const action = (command, cookie, body) => f.request(`${endpoint}/${command}`, { method: 'POST', cookie, body });
  assert.equal((await action('save', outsider.cookie, { revision: 0, data: {} })).status, 403);
  for (const data of [
    { winnerId: 'foreign' }, { durationSeconds: -1 }, { durationSeconds: 1.5 }, { blueTeamId: teamIds[0], redTeamId: teamIds[0] },
    { lineups: { [teamIds[0]]: [playerIds[1]] } }, { lineups: { [teamIds[0]]: [playerIds[0], playerIds[0]] } },
    { pickBan: { bluePicks: ['Ahri'], redBans: ['ahri'] } }, { equipment: [] }, { kda: '1/0/1' },
  ]) assert.equal((await action('save', entry.cookie, { revision: 0, data })).status, 400);
  assert.equal((await f.request(path, { cookie: admin })).body.match.games.length, 0);
  const data = { winnerId: teamIds[0], blueTeamId: teamIds[0], redTeamId: teamIds[1], lineups: { [teamIds[0]]: [playerIds[0]], [teamIds[1]]: [playerIds[1]] }, pickBan: { bluePicks: ['Ahri'], redBans: ['Yasuo'] }, patch: '26.19', durationSeconds: 1500 };
  assert.equal((await action('save', entry.cookie, { revision: 0, data })).status, 200);
  assert.equal((await action('submit', entry.cookie, { revision: 1 })).status, 200);
  assert.equal((await action('confirm', outsider.cookie, { revision: 2 })).status, 403);
  assert.equal((await f.request(`/api/tournaments/${event.id}/schedule`, { method: 'POST', cookie: entry.cookie, body: { updates: [{ matchId, revision: 3, scheduledAt: null }] } })).status, 403);
  const confirmed = await action('confirm', operator.cookie, { revision: 2 });
  assert.equal(confirmed.status, 200); assert.equal(confirmed.body.game.submittedBy, entry.id); assert.equal(confirmed.body.game.confirmedBy, operator.id);
  await f.restart();
  assert.deepEqual((await f.request(path, { cookie: operator.cookie })).body.match.games[0].data, data);
});

test('schedule edits remain allowed after format locking and batch writes are atomic', async t => {
  const f = await fixture(t), cookie = await owner(f), { event, path, matchId } = await ready(f, cookie);
  const schedule = updates => f.request(`/api/tournaments/${event.id}/schedule`, { method: 'POST', cookie, body: { updates } });
  assert.equal((await schedule([{ matchId, revision: 1, scheduledAt: '2026-10-05T08:00:00.000Z' }])).status, 200);
  assert.equal((await schedule([{ matchId, revision: 1, scheduledAt: null }])).status, 409);
  assert.equal((await schedule([{ matchId, revision: 2, scheduledAt: null }, { matchId: 'missing', revision: 1, scheduledAt: null }])).status, 404);
  assert.equal((await f.request(path, { cookie })).body.match.scheduledAt, '2026-10-05T08:00:00.000Z');
  assert.equal((await schedule([{ matchId, revision: 2, scheduledAt: 'not-a-date' }])).status, 400);
  assert.equal((await schedule([{ matchId, revision: 2, scheduledAt: '2026-10-06T09:00:00.000Z' }])).status, 200);
});
