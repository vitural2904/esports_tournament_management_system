import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, owner } from './helpers.mjs';
import { createPreset } from '../shared/format.mjs';

async function tournament(f, cookie, count, kind, customize = format => format) {
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Progression Cup' } })).body.tournament;
  const ids = [];
  for (let i = 0; i < count; i++) {
    const team = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: `Team ${i}`, tag: `T${i}` } })).body.team; ids.push(team.id);
    await f.request(`/api/tournaments/${event.id}/registrations`, { method: 'POST', cookie, body: { teamId: team.id, playerIds: [], revision: 0 } });
  }
  const current = (await f.request(`/api/tournaments/${event.id}`, { cookie })).body.tournament;
  const saved = (await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision: current.revision, format: customize(createPreset(kind, ids), ids) } })).body.tournament;
  await f.request(`/api/tournaments/${event.id}/lock`, { method: 'POST', cookie, body: { revision: saved.revision } });
  return { id: event.id, ids };
}

test('a final stage with independent groups cannot lock before adding a championship stage', async t => {
  const f = await fixture(t), cookie = await owner(f);
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'No champion yet' } })).body.tournament;
  const ids = [];
  for (let i = 0; i < 4; i++) {
    const team = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: `Final team ${i}`, tag: `F${i}` } })).body.team;
    ids.push(team.id); await f.request(`/api/tournaments/${event.id}/registrations`, { method: 'POST', cookie, body: { teamId: team.id, playerIds: [], revision: 0 } });
  }
  const format = createPreset('round_robin', ids);
  format.stages[0].groups = [{ id: 'A', name: 'A', inputs: format.stages[0].groups[0].inputs.slice(0, 2) }, { id: 'B', name: 'B', inputs: format.stages[0].groups[0].inputs.slice(2) }];
  const current = (await f.request(`/api/tournaments/${event.id}`, { cookie })).body.tournament;
  const saved = await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision: current.revision, format } });
  assert.equal(saved.status, 200);
  assert.equal((await f.request(`/api/tournaments/${event.id}/lock`, { method: 'POST', cookie, body: { revision: saved.body.tournament.revision } })).status, 400);
  assert.equal((await list(f, cookie, event.id)).length, 0);
});
async function play(f, cookie, tournamentId, match, winnerId) {
  const path = `/api/tournaments/${tournamentId}/matches/${encodeURIComponent(match.id)}`;
  for (let n = 1; n <= (match.bo + 1) / 2; n++) {
    for (const [action, body] of [['save', { revision: 0, data: { winnerId } }], ['submit', { revision: 1 }], ['confirm', { revision: 2 }]]) assert.equal((await f.request(`${path}/games/${n}/${action}`, { method: 'POST', cookie, body })).status, 200);
  }
}
const list = async (f, cookie, id) => (await f.request(`/api/tournaments/${id}/matches`, { cookie })).body.matches;

test('the full eight-team event assigns exact group seeds, finishes 38 matches and eliminates each non-champion after two DE losses', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await tournament(f, cookie, 8, 'demo');
  const original = await list(f, cookie, id);
  for (const match of original.filter(match => match.stageId === 'groups')) await play(f, cookie, id, match, match.teams.slice().sort((a, b) => ids.indexOf(a) - ids.indexOf(b))[0]);
  const standings = await f.request(`/api/tournaments/${id}/standings`, { cookie });
  assert.equal(standings.status, 200);
  assert.deepEqual(standings.body.groups[0].rows.map(row => [row.teamId, row.points, row.rank]), ids.slice(0, 4).map((id, i) => [id, 6 - 2 * i, i + 1]));
  const seeded = await list(f, cookie, id);
  assert.deepEqual(seeded.find(match => match.key === 'U1').teams, [ids[0], ids[7]]);
  let matches = seeded;
  while (matches.some(match => match.status === 'ready')) {
    const match = matches.find(match => match.status === 'ready'); await play(f, cookie, id, match, match.teams[0]); matches = await list(f, cookie, id);
  }
  assert.equal(matches.filter(match => match.status === 'completed').length, 38);
  assert.equal(matches.find(match => match.key === 'F2').status, 'skipped');
  const losses = new Map(ids.map(id => [id, 0]));
  for (const match of matches.filter(match => match.stageId === 'playoffs' && match.winnerId)) losses.set(match.teams.find(id => id !== match.winnerId), losses.get(match.teams.find(id => id !== match.winnerId)) + 1);
  assert.equal(losses.get(ids[0]), 0); for (const id of ids.slice(1)) assert.equal(losses.get(id), 2);
  const summary = (await f.request(`/api/tournaments/${id}/standings`, { cookie })).body;
  assert.equal(summary.championId, ids[0]); assert.equal(summary.completed, true);
  await f.restart(); assert.equal((await f.request(`/api/tournaments/${id}/standings`, { cookie })).body.championId, ids[0]);
});

test('a lower-bracket F1 win activates F2; the eight-team event has 39 completed matches', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await tournament(f, cookie, 8, 'demo');
  let matches = await list(f, cookie, id);
  while (matches.some(match => match.status === 'ready')) {
    const match = matches.find(match => match.status === 'ready');
    const winner = match.key === 'F1' || match.key === 'F2' ? match.teams[1] : match.teams.slice().sort((a, b) => ids.indexOf(a) - ids.indexOf(b))[0];
    await play(f, cookie, id, match, winner); matches = await list(f, cookie, id);
  }
  assert.equal(matches.filter(match => match.status === 'completed').length, 39);
  const final = matches.find(match => match.key === 'F2');
  const losses = new Map(ids.map(id => [id, 0]));
  for (const match of matches.filter(match => match.stageId === 'playoffs')) losses.set(match.teams.find(id => id !== match.winnerId), losses.get(match.teams.find(id => id !== match.winnerId)) + 1);
  for (const teamId of ids) assert.equal(losses.get(teamId), teamId === final.winnerId ? 1 : 2);
  assert.equal((await f.request(`/api/tournaments/${id}/standings`, { cookie })).body.championId, final.winnerId);
});

test('two tied teams receive one persisted BO1; drafts and submissions never assign a seed', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await tournament(f, cookie, 2, 'round_robin', format => { format.stages[0].rounds = 2; return format; });
  const original = await list(f, cookie, id);
  await play(f, cookie, id, original[0], ids[0]); await play(f, cookie, id, original[1], ids[1]);
  let matches = await list(f, cookie, id);
  const tie = matches.find(match => match.branch === 'tiebreak');
  assert.equal(tie.bo, 1); assert.equal(tie.status, 'ready');
  const path = `/api/tournaments/${id}/matches/${encodeURIComponent(tie.id)}/games/1`;
  await f.request(`${path}/save`, { method: 'POST', cookie, body: { revision: 0, data: { winnerId: ids[1] } } });
  await f.request(`${path}/submit`, { method: 'POST', cookie, body: { revision: 1 } });
  const pending = (await f.request(`/api/tournaments/${id}/standings`, { cookie })).body;
  assert.equal(pending.completed, false); assert.equal(pending.championId, null); assert.ok(pending.groups[0].rows.every(row => row.rank === null));
  assert.equal((await list(f, cookie, id)).length, matches.length);
  await f.restart(); assert.equal((await list(f, cookie, id)).filter(match => match.branch === 'tiebreak').length, 1);
  assert.equal((await f.request(`${path}/confirm`, { method: 'POST', cookie, body: { revision: 2 } })).status, 200);
  const ranked = (await f.request(`/api/tournaments/${id}/standings`, { cookie })).body;
  assert.equal(ranked.championId, ids[1]); assert.deepEqual(ranked.groups[0].rows.map(row => [row.teamId, row.points, row.rank]), [[ids[1], 1, 1], [ids[0], 1, 2]]);
  assert.equal((await f.request(`/api/tournaments/${id}/standings`)).status, 401);
});

test('three-way circular ties use a BO1 round robin and repeat only while unresolved', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await tournament(f, cookie, 3, 'round_robin');
  const cycleWinner = match => match.teams.includes(ids[0]) && match.teams.includes(ids[2]) ? ids[2] : match.teams.includes(ids[0]) ? ids[0] : ids[1];
  for (const match of await list(f, cookie, id)) await play(f, cookie, id, match, cycleWinner(match));
  let matches = await list(f, cookie, id);
  const first = matches.filter(match => match.branch === 'tiebreak'); assert.equal(first.length, 3);
  for (const match of first) await play(f, cookie, id, match, cycleWinner(match));
  matches = await list(f, cookie, id);
  const second = matches.filter(match => match.branch === 'tiebreak' && match.round === 2); assert.equal(second.length, 3);
  for (const match of second) await play(f, cookie, id, match, match.teams.slice().sort((a, b) => ids.indexOf(a) - ids.indexOf(b))[0]);
  const ranked = (await f.request(`/api/tournaments/${id}/standings`, { cookie })).body;
  assert.equal(ranked.completed, true); assert.deepEqual(ranked.groups[0].rows.map(row => row.teamId), ids);
  assert.equal((await list(f, cookie, id)).length, 9);
});

test('head-to-head breaks equal group points without extra games; direct entrants in later stages must wait', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await tournament(f, cookie, 4, 'round_robin', (format, ids) => {
    format.stages.push({ id: 'finals', name: 'Finals', type: 'single_elimination', bo: 1, finalBo: 1, inputs: ids.map(teamId => ({ kind: 'team', teamId })) }); return format;
  });
  const original = await list(f, cookie, id), upper = original.find(match => match.stageId === 'finals');
  assert.equal(upper.status, 'waiting');
  assert.equal((await f.request(`/api/tournaments/${id}/matches/${encodeURIComponent(upper.id)}/games/1/save`, { method: 'POST', cookie, body: { revision: 0, data: { winnerId: ids[0] } } })).status, 409);
  for (const match of original.filter(match => match.branch === 'group')) {
    const pair = match.teams.map(id => ids.indexOf(id)).sort();
    const winner = pair[0] === 0 && pair[1] === 3 ? ids[3] : ids[pair[0]];
    await play(f, cookie, id, match, winner);
  }
  const groups = (await f.request(`/api/tournaments/${id}/standings`, { cookie })).body.groups;
  assert.deepEqual(groups[0].rows.map(row => [row.teamId, row.points, row.rank]), [[ids[0], 2, 1], [ids[1], 2, 2], [ids[2], 1, 3], [ids[3], 1, 4]]);
  assert.equal((await list(f, cookie, id)).filter(match => match.branch === 'tiebreak').length, 0);
  let matches = await list(f, cookie, id);
  while (matches.some(match => match.status === 'ready')) { const match = matches.find(match => match.status === 'ready'); await play(f, cookie, id, match, match.teams[0]); matches = await list(f, cookie, id); }
  assert.equal((await f.request(`/api/tournaments/${id}/standings`, { cookie })).body.championId, ids[0]);
});

test('after a four-team tie round, only the unresolved three-team subset plays again', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await tournament(f, cookie, 4, 'round_robin', format => { format.stages[0].rounds = 2; return format; });
  for (const match of await list(f, cookie, id)) await play(f, cookie, id, match, match.teams[0]);
  let ties = (await list(f, cookie, id)).filter(match => match.branch === 'tiebreak');
  assert.equal(ties.length, 6);
  for (const match of ties) {
    const winner = match.teams.includes(ids[3]) ? match.teams.find(id => id !== ids[3]) : match.teams.includes(ids[0]) && match.teams.includes(ids[2]) ? ids[2] : match.teams.includes(ids[0]) ? ids[0] : ids[1];
    await play(f, cookie, id, match, winner);
  }
  ties = (await list(f, cookie, id)).filter(match => match.branch === 'tiebreak' && match.status === 'ready');
  assert.equal(ties.length, 3); assert.ok(ties.every(match => !match.teams.includes(ids[3])));
  const partial = (await f.request(`/api/tournaments/${id}/standings`, { cookie })).body.groups[0];
  assert.equal(partial.rows.find(row => row.teamId === ids[3]).rank, 4);
  for (const match of ties) await play(f, cookie, id, match, match.teams.slice().sort((a,b) => ids.indexOf(a) - ids.indexOf(b))[0]);
  assert.equal((await f.request(`/api/tournaments/${id}/standings`, { cookie })).body.completed, true);
  assert.equal((await list(f, cookie, id)).length, 21);
});
