import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, owner, password } from './helpers.mjs';
import { createPreset } from '../shared/format.mjs';

test('two members operate the eight-team demo through groups, DE reset and champion; restart retains all results', async t => {
  const f = await fixture(t), admin = await owner(f);
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie: admin, body: { name: 'Complete LoL Cup' } })).body.tournament;
  const teams = [];
  for (let i = 0; i < 8; i++) {
    const team = (await f.request('/api/teams', { method: 'POST', cookie: admin, body: { name: `Demo ${i + 1}`, tag: `D${i + 1}` } })).body.team;
    teams.push(team.id);
    await f.request(`/api/tournaments/${event.id}/registrations`, { method: 'POST', cookie: admin, body: { teamId: team.id, playerIds: [], revision: 0 } });
  }
  const members = {};
  for (const role of ['entry', 'operator']) {
    const user = (await f.request('/api/users', { method: 'POST', cookie: admin, body: { username: role, displayName: role, password } })).body.user;
    let cookie = (await f.request('/api/login', { method: 'POST', body: { username: role, password } })).cookie;
    cookie = (await f.request('/api/password', { method: 'POST', cookie, body: { currentPassword: password, newPassword: 'Changed-Member-Password-42!' } })).cookie;
    await f.request(`/api/tournaments/${event.id}/grants`, { method: 'POST', cookie: admin, body: { userId: user.id, roles: [role], revision: 0 } });
    members[role] = { id: user.id, cookie };
  }
  const current = (await f.request(`/api/tournaments/${event.id}`, { cookie: admin })).body.tournament;
  const saved = (await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie: members.operator.cookie, body: { revision: current.revision, format: createPreset('demo', teams) } })).body.tournament;
  assert.equal((await f.request(`/api/tournaments/${event.id}/lock`, { method: 'POST', cookie: members.operator.cookie, body: { revision: saved.revision } })).status, 200);
  const list = async () => (await f.request(`/api/tournaments/${event.id}/matches`, { cookie: members.entry.cookie })).body.matches;
  async function play(match, winnerId) {
    for (let number = 1; number <= Math.floor(match.bo / 2) + 1; number++) {
      const path = `/api/tournaments/${event.id}/matches/${encodeURIComponent(match.id)}/games/${number}`;
      assert.equal((await f.request(`${path}/save`, { method: 'POST', cookie: members.entry.cookie, body: { revision: 0, data: { winnerId } } })).status, 200);
      assert.equal((await f.request(`${path}/submit`, { method: 'POST', cookie: members.entry.cookie, body: { revision: 1 } })).status, 200);
      assert.equal((await f.request(`${path}/confirm`, { method: 'POST', cookie: members.operator.cookie, body: { revision: 2 } })).status, 200);
    }
  }
  const groups = (await list()).filter(match => match.branch === 'group');
  assert.equal(groups.length, 24);
  for (const match of groups) await play(match, teams.indexOf(match.teams[0]) < teams.indexOf(match.teams[1]) ? match.teams[0] : match.teams[1]);
  await f.restart();
  const rankings = (await f.request(`/api/tournaments/${event.id}/standings`, { cookie: members.operator.cookie })).body;
  assert.deepEqual(rankings.groups.map(group => group.rows.map(row => row.points)), [[6, 4, 2, 0], [6, 4, 2, 0]]);
  assert.equal(rankings.championId, null);
  let matches = await list();
  while (matches.some(match => match.status === 'ready')) {
    const match = matches.find(match => match.status === 'ready');
    await play(match, match.key === 'F1' ? match.teams[1] : match.teams[0]);
    matches = await list();
  }
  const playoffs = matches.filter(match => match.stageId === 'playoffs');
  assert.equal(playoffs.length, 15); assert.ok(playoffs.every(match => match.status === 'completed'));
  assert.equal(matches.flatMap(match => match.games).length, 58);
  assert.ok(matches.flatMap(match => match.games).every(game => game.submittedBy === members.entry.id && game.confirmedBy === members.operator.id));
  const losses = new Map(teams.map(id => [id, 0]));
  for (const match of playoffs) { const loser = match.teams.find(id => id !== match.winnerId); losses.set(loser, losses.get(loser) + 1); }
  for (const id of teams) assert.equal(losses.get(id), id === teams[0] ? 1 : 2);
  await f.restart();
  assert.deepEqual(await list(), matches);
  const final = (await f.request(`/api/tournaments/${event.id}/standings`, { cookie: members.entry.cookie })).body;
  assert.equal(final.completed, true); assert.equal(final.championId, teams[0]);
});
