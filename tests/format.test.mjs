import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, owner } from './helpers.mjs';
import { createPreset } from '../shared/format.mjs';

async function eventWithTeams(f, cookie, count = 8) {
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Community Cup' } })).body.tournament;
  const ids = [];
  for (let i = 0; i < count; i++) {
    const team = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: `Team ${i}`, tag: `T${i}` } })).body.team;
    ids.push(team.id);
    await f.request(`/api/tournaments/${event.id}/registrations`, { method: 'POST', cookie, body: { teamId: team.id, playerIds: [], revision: 0 } });
  }
  return { event: (await f.request(`/api/tournaments/${event.id}`, { cookie })).body.tournament, ids };
}
const teamSource = teamId => ({ kind: 'team', teamId });
const seed = (groupId, rank) => ({ kind: 'seed', stageId: 'groups', groupId, rank });
function hybrid(ids) {
  return { version: 1, stages: [
    { id: 'groups', name: 'Vòng bảng', type: 'round_robin', bo: 1, rounds: 2, groups: [{ id: 'A', name: 'Bảng A', inputs: ids.slice(0, 4).map(teamSource) }, { id: 'B', name: 'Bảng B', inputs: ids.slice(4).map(teamSource) }] },
    { id: 'playoffs', name: 'Loại kép', type: 'double_elimination', bo: 3, finalBo: 5, reset: true, inputs: [seed('A', 1), seed('B', 4), seed('B', 2), seed('A', 3), seed('B', 1), seed('A', 4), seed('A', 2), seed('B', 3)] },
  ] };
}

test('the eight-team preset persists 24 group matches and a seeded 14-match DE graph with conditional reset', async t => {
  const f = await fixture(t), cookie = await owner(f), { event, ids } = await eventWithTeams(f, cookie);
  const saved = await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision: event.revision, format: hybrid(ids) } });
  assert.equal(saved.status, 200);
  const matches = saved.body.tournament.graph;
  assert.equal(matches.filter(match => match.stageId === 'groups').length, 24);
  assert.equal(matches.filter(match => match.stageId === 'playoffs' && !match.condition).length, 14);
  assert.equal(matches.length, 39);
  assert.deepEqual(matches.find(match => match.key === 'U1').sources, [seed('A', 1), seed('B', 4)]);
  assert.deepEqual(matches.find(match => match.key === 'L3').sources, [{ kind: 'winner', matchId: 'playoffs:L1' }, { kind: 'loser', matchId: 'playoffs:U6' }]);
  for (const key of ['U7', 'L6', 'F1', 'F2']) assert.equal(matches.find(match => match.key === key).bo, 5);
  assert.equal(matches.find(match => match.key === 'F2').condition.matchId, 'playoffs:F1');
  const locked = await f.request(`/api/tournaments/${event.id}/lock`, { method: 'POST', cookie, body: { revision: saved.body.tournament.revision } });
  assert.equal(locked.status, 200);
  assert.ok(locked.body.tournament.lockedAt);
  assert.equal((await f.request(`/api/tournaments/${event.id}/lock`, { method: 'POST', cookie, body: { revision: locked.body.tournament.revision } })).status, 409);
  assert.equal((await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision: locked.body.tournament.revision, format: hybrid(ids) } })).status, 409);
  await f.restart();
  const read = (await f.request(`/api/tournaments/${event.id}`, { cookie })).body.tournament;
  assert.deepEqual(read.graph, matches);
  assert.equal(read.lockedAt, locked.body.tournament.lockedAt);
});

test('format validation rejects duplicate teams, unknown seeds, forward dependencies, invalid BO and stale edits without changing the draft', async t => {
  const f = await fixture(t), cookie = await owner(f), { event, ids } = await eventWithTeams(f, cookie);
  const path = `/api/tournaments/${event.id}/format`;
  const original = hybrid(ids);
  const saved = (await f.request(path, { method: 'POST', cookie, body: { revision: event.revision, format: original } })).body.tournament;
  for (const change of [
    value => { value.stages[0].groups[1].inputs[0] = teamSource(ids[0]); },
    value => { value.stages[1].inputs[0] = seed('A', 5); },
    value => { value.stages[0].groups[0].inputs[0] = seed('A', 1); },
    value => { value.stages[1].inputs[0] = { kind: 'winner', matchId: 'playoffs:U7' }; },
    value => { value.stages[1].bo = 7; },
    value => { value.stages[1].matchBo = { 'Missing': 3 }; },
  ]) {
    const invalid = structuredClone(original); change(invalid);
    assert.equal((await f.request(path, { method: 'POST', cookie, body: { revision: saved.revision, format: invalid } })).status, 400);
  }
  assert.equal((await f.request(path, { method: 'POST', cookie, body: { revision: event.revision, format: original } })).status, 409);
  const read = (await f.request(`/api/tournaments/${event.id}`, { cookie })).body.tournament;
  assert.equal(read.revision, saved.revision);
  assert.deepEqual(read.format, saved.format);
});

test('each preset supports direct teams and multi-stage advancement; incomplete registration coverage prevents locking', async t => {
  const f = await fixture(t), cookie = await owner(f), { event, ids } = await eventWithTeams(f, cookie, 4);
  let revision = event.revision;
  for (const [type, count] of [['round_robin', 6], ['single_elimination', 3], ['double_elimination', 7]]) {
    const saved = await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision, format: createPreset(type, ids) } });
    assert.equal(saved.status, 200); revision = saved.body.tournament.revision;
    assert.equal(saved.body.tournament.graph.length, count);
  }
  const format = createPreset('single_elimination', ids);
  format.stages[0].matchBo = { U1: 1 };
  format.stages.push({ id: 'placement', name: 'Phân hạng', type: 'round_robin', bo: 1, rounds: 1, groups: [{ id: 'P', name: 'Bảng phụ', inputs: [{ kind: 'winner', matchId: 'stage1:U3' }, { kind: 'loser', matchId: 'stage1:U3' }] }] });
  const saved = await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision, format } });
  assert.equal(saved.status, 200); revision = saved.body.tournament.revision;
  assert.equal(saved.body.tournament.graph[0].bo, 1);
  assert.equal(saved.body.tournament.graph.length, 4);
  const partial = createPreset('single_elimination', ids.slice(0, 2));
  const incomplete = await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision, format: partial } });
  assert.equal(incomplete.status, 200);
  assert.equal((await f.request(`/api/tournaments/${event.id}/lock`, { method: 'POST', cookie, body: { revision: incomplete.body.tournament.revision } })).status, 400);
  assert.equal((await f.request(`/api/tournaments/${event.id}`, { cookie })).body.tournament.lockedAt, null);
});

test('conditional reset outcomes cannot feed another stage, while final placements can', async t => {
  const f = await fixture(t), cookie = await owner(f), { event, ids } = await eventWithTeams(f, cookie, 2);
  const format = createPreset('double_elimination', ids);
  format.stages.push({ id: 'next', name: 'Next stage', type: 'single_elimination', bo: 3, finalBo: 5, inputs: [{ kind: 'winner', matchId: 'stage1:F2' }, { kind: 'loser', matchId: 'stage1:F2' }] });
  assert.equal((await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision: event.revision, format } })).status, 400);
  format.stages[1].inputs = [{ kind: 'placement', stageId: 'stage1', rank: 1 }, { kind: 'placement', stageId: 'stage1', rank: 2 }];
  assert.equal((await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision: event.revision, format } })).status, 200);
});
