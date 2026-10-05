import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, owner } from './helpers.mjs';
import { createPreset } from '../shared/format.mjs';

async function cup(f, cookie, kind = 'single_elimination', count = 4, customize = () => {}) {
  const event = (await f.request('/api/tournaments', { method: 'POST', cookie, body: { name: 'Correction Cup' } })).body.tournament;
  const ids = [];
  for (let i = 0; i < count; i++) {
    const team = (await f.request('/api/teams', { method: 'POST', cookie, body: { name: `Team ${i}`, tag: `T${i}` } })).body.team;
    ids.push(team.id); await f.request(`/api/tournaments/${event.id}/registrations`, { method: 'POST', cookie, body: { teamId: team.id, playerIds: [], revision: 0 } });
  }
  const format = createPreset(kind, ids); format.stages[0].bo = 1; format.stages[0].finalBo = 1;
  if (kind === 'round_robin') format.stages[0].rounds = 2;
  customize(format, ids);
  const current = (await f.request(`/api/tournaments/${event.id}`, { cookie })).body.tournament;
  const saved = (await f.request(`/api/tournaments/${event.id}/format`, { method: 'POST', cookie, body: { revision: current.revision, format } })).body.tournament;
  await f.request(`/api/tournaments/${event.id}/lock`, { method: 'POST', cookie, body: { revision: saved.revision } });
  return { id: event.id, ids };
}
async function confirm(f, cookie, path, winnerId) {
  for (const [action, body] of [['save', { revision: 0, data: { winnerId } }], ['submit', { revision: 1 }], ['confirm', { revision: 2 }]]) assert.equal((await f.request(`${path}/games/1/${action}`, { method: 'POST', cookie, body })).status, 200);
}

test('preview is read-only; correction changes an unstarted dependent, keeps audit and blocks replay', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await cup(f, cookie);
  const path = `/api/tournaments/${id}/matches/stage1%3AU1`;
  await confirm(f, cookie, path, ids[0]);
  const before = (await f.request(path, { cookie })).body.match;
  const command = { kind: 'game_edit', matchRevision: before.revision, number: 1, gameRevision: before.games[0].revision, data: { winnerId: ids[1] }, reason: 'Sửa đội thắng nhập nhầm' };
  const preview = await f.request(`${path}/changes/preview`, { method: 'POST', cookie, body: command });
  assert.equal(preview.status, 200); assert.equal(preview.body.blocked, false);
  assert.equal(preview.body.affected[0].id, 'stage1:U3');
  assert.equal((await f.request(path, { cookie })).body.match.winnerId, ids[0]);
  const apply = () => f.request(`${path}/changes/apply`, { method: 'POST', cookie, body: { ...command, previewToken: preview.body.previewToken } });
  assert.equal((await apply()).status, 200); assert.equal((await apply()).status, 409);
  assert.equal((await f.request(path, { cookie })).body.match.winnerId, ids[1]);
  await f.restart();
  const history = (await f.request(`/api/tournaments/${id}/history`, { cookie })).body.history;
  assert.equal(history.length, 1); assert.equal(history[0].reason, command.reason); assert.equal(history[0].actor.displayName, 'Owner');
  assert.equal(history[0].before.winnerId, ids[0]); assert.equal(history[0].after.winnerId, ids[1]);
});

test('a correction withdraws an obsolete unstarted tie; a started tie blocks the same change', async t => {
  for (const started of [false, true]) {
    const f = await fixture(t), cookie = await owner(f), { id, ids } = await cup(f, cookie, 'round_robin', 2);
    const original = (await f.request(`/api/tournaments/${id}/matches`, { cookie })).body.matches;
    const path = `/api/tournaments/${id}/matches/${encodeURIComponent(original[0].id)}`;
    await confirm(f, cookie, path, ids[0]);
    await confirm(f, cookie, `/api/tournaments/${id}/matches/${encodeURIComponent(original[1].id)}`, ids[1]);
    const tie = (await f.request(`/api/tournaments/${id}/matches`, { cookie })).body.matches.find(match => match.branch === 'tiebreak');
    const tiePath = `/api/tournaments/${id}/matches/${encodeURIComponent(tie.id)}`;
    if (started) await f.request(`${tiePath}/games/1/save`, { method: 'POST', cookie, body: { revision: 0, data: {} } });
    const before = (await f.request(path, { cookie })).body.match;
    const command = { kind: 'game_edit', matchRevision: before.revision, number: 1, gameRevision: before.games[0].revision, data: { winnerId: ids[1] }, reason: 'Điều chỉnh kết quả bảng' };
    const preview = (await f.request(`${path}/changes/preview`, { method: 'POST', cookie, body: command })).body;
    assert.equal(preview.blocked, started); assert.equal(preview.affected[0].id, tie.id);
    if (!started) {
      assert.equal((await f.request(`${path}/changes/apply`, { method: 'POST', cookie, body: { ...command, previewToken: preview.previewToken } })).status, 200);
      assert.equal((await f.request(tiePath, { cookie })).body.match.status, 'skipped');
      assert.equal((await f.request(`${tiePath}/games/1/save`, { method: 'POST', cookie, body: { revision: 0, data: { winnerId: ids[0] } } })).status, 409);
      assert.equal((await f.request(`/api/tournaments/${id}/standings`, { cookie })).body.championId, ids[1]);
    }
  }
});

test('match and game walkovers record official decisions without fabricated game metadata', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await cup(f, cookie);
  for (const [key, kind, winnerId] of [['U1', 'match_walkover', ids[0]], ['U2', 'game_walkover', ids[2]], ['U3', 'game_walkover', ids[0]]]) {
    const path = `/api/tournaments/${id}/matches/stage1%3A${key}`;
    const match = (await f.request(path, { cookie })).body.match;
    const command = { kind, matchRevision: match.revision, number: 1, gameRevision: 0, winnerId, reason: 'Đối thủ bỏ cuộc' };
    const preview = await f.request(`${path}/changes/preview`, { method: 'POST', cookie, body: command });
    assert.equal(preview.status, 200); assert.equal(preview.body.blocked, false);
    assert.equal((await f.request(`${path}/changes/apply`, { method: 'POST', cookie, body: { ...command, previewToken: preview.body.previewToken } })).status, 200);
    const completed = (await f.request(path, { cookie })).body.match;
    assert.equal(completed.winnerId, winnerId);
    if (kind === 'match_walkover') { assert.equal(completed.games.length, 0); assert.equal(completed.decision.reason, command.reason); assert.deepEqual(completed.score, [0, 0]); }
    else { assert.deepEqual(completed.games[0].data, { winnerId }); assert.equal(completed.games[0].decision.reason, command.reason); }
  }
  const standings = (await f.request(`/api/tournaments/${id}/standings`, { cookie })).body;
  assert.equal(standings.completed, true); assert.equal(standings.championId, ids[0]);
  await f.restart(); assert.equal((await f.request(`/api/tournaments/${id}/history`, { cookie })).body.history.length, 3);
});

test('winner changes are blocked once the affected final starts; metadata changes still audit safely', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await cup(f, cookie);
  const path = `/api/tournaments/${id}/matches/stage1%3AU1`, finalPath = `/api/tournaments/${id}/matches/stage1%3AU3`;
  await confirm(f, cookie, path, ids[0]); await confirm(f, cookie, `/api/tournaments/${id}/matches/stage1%3AU2`, ids[2]);
  const before = (await f.request(path, { cookie })).body.match;
  const command = { kind: 'game_edit', matchRevision: before.revision, number: 1, gameRevision: before.games[0].revision, data: { winnerId: ids[1] }, reason: 'Sửa sai đội thắng' };
  const old = await f.request(`${path}/changes/preview`, { method: 'POST', cookie, body: command });
  await f.request(`${finalPath}/games/1/save`, { method: 'POST', cookie, body: { revision: 0, data: {} } });
  assert.equal((await f.request(`${path}/changes/apply`, { method: 'POST', cookie, body: { ...command, previewToken: old.body.previewToken } })).status, 409);
  const blocked = await f.request(`${path}/changes/preview`, { method: 'POST', cookie, body: command });
  assert.equal(blocked.status, 200); assert.equal(blocked.body.blocked, true); assert.equal(blocked.body.previewToken, null);
  assert.ok(blocked.body.affected[0].startedAt);
  assert.equal((await f.request(path, { cookie })).body.match.winnerId, ids[0]);
  const metadata = { ...command, data: { winnerId: ids[0], durationSeconds: 1800, patch: '26.20' }, reason: 'Bổ sung thông tin game' };
  const preview = await f.request(`${path}/changes/preview`, { method: 'POST', cookie, body: metadata });
  assert.equal(preview.body.blocked, false); assert.equal(preview.body.affected.length, 0);
  assert.equal((await f.request(`${path}/changes/apply`, { method: 'POST', cookie, body: { ...metadata, previewToken: preview.body.previewToken } })).status, 200);
  assert.equal((await f.request(finalPath, { cookie })).body.match.games[0].state, 'draft');
  assert.equal((await f.request(path, { cookie })).body.match.games[0].data.durationSeconds, 1800);
  assert.equal((await f.request(`/api/tournaments/${id}/history`, { cookie })).body.history.length, 1);
});

test('preview tokens bind the exact change and all event match revisions; rejected writes leave no history', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await cup(f, cookie);
  const path = `/api/tournaments/${id}/matches/stage1%3AU1`;
  await confirm(f, cookie, path, ids[0]);
  const before = (await f.request(path, { cookie })).body.match;
  const command = { kind: 'game_edit', matchRevision: before.revision, number: 1, gameRevision: before.games[0].revision, data: { winnerId: ids[1] }, reason: 'Điều chỉnh' };
  assert.equal((await f.request(`${path}/changes/preview`, { method: 'POST', cookie, body: { ...command, reason: ' ' } })).status, 400);
  assert.equal((await f.request(`${path}/changes/apply`, { method: 'POST', cookie, body: command })).status, 409);
  const preview = (await f.request(`${path}/changes/preview`, { method: 'POST', cookie, body: command })).body;
  assert.equal((await f.request(`${path}/changes/apply`, { method: 'POST', cookie, body: { ...command, data: { winnerId: ids[0] }, previewToken: preview.previewToken } })).status, 409);
  const other = (await f.request(`/api/tournaments/${id}/matches/stage1%3AU2`, { cookie })).body.match;
  await f.request(`/api/tournaments/${id}/schedule`, { method: 'POST', cookie, body: { updates: [{ matchId: other.id, revision: other.revision, scheduledAt: '2026-10-05T12:00:00.000Z' }] } });
  assert.equal((await f.request(`${path}/changes/apply`, { method: 'POST', cookie, body: { ...command, previewToken: preview.previewToken } })).status, 409);
  assert.deepEqual((await f.request(path, { cookie })).body.match, before);
  assert.equal((await f.request(`/api/tournaments/${id}/history`, { cookie })).body.history.length, 0);
});

test('correcting an earlier circular tie withdraws later unstarted tie rounds instead of ignoring the correction', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await cup(f, cookie, 'round_robin', 3);
  const list = async () => (await f.request(`/api/tournaments/${id}/matches`, { cookie })).body.matches;
  for (const match of await list()) await confirm(f, cookie, `/api/tournaments/${id}/matches/${encodeURIComponent(match.id)}`, match.teams[0]);
  const first = (await list()).filter(match => match.branch === 'tiebreak');
  for (const match of first) {
    const winner = match.teams.includes(ids[0]) && match.teams.includes(ids[2]) ? ids[2] : match.teams.includes(ids[0]) ? ids[0] : ids[1];
    await confirm(f, cookie, `/api/tournaments/${id}/matches/${encodeURIComponent(match.id)}`, winner);
  }
  assert.equal((await list()).filter(match => match.branch === 'tiebreak' && match.round === 2).length, 3);
  const target = (await list()).find(match => match.branch === 'tiebreak' && match.round === 1 && match.teams.includes(ids[0]) && match.teams.includes(ids[2]));
  const path = `/api/tournaments/${id}/matches/${encodeURIComponent(target.id)}`;
  const command = { kind: 'game_edit', matchRevision: target.revision, number: 1, gameRevision: target.games[0].revision, data: { winnerId: ids[0] }, reason: 'Sửa kết quả lượt phụ đầu' };
  const preview = (await f.request(`${path}/changes/preview`, { method: 'POST', cookie, body: command })).body;
  assert.equal(preview.affected.length, 3); assert.equal(preview.blocked, false);
  assert.equal((await f.request(`${path}/changes/apply`, { method: 'POST', cookie, body: { ...command, previewToken: preview.previewToken } })).status, 200);
  assert.ok((await list()).filter(match => match.branch === 'tiebreak' && match.round === 2).every(match => match.status === 'skipped'));
  assert.equal((await f.request(`/api/tournaments/${id}/standings`, { cookie })).body.championId, ids[0]);
});

test('a whole-match walkover counts one DE loss and preserves the loser route', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await cup(f, cookie, 'double_elimination');
  const list = async () => (await f.request(`/api/tournaments/${id}/matches`, { cookie })).body.matches;
  let matches = await list();
  while (matches.some(match => match.status === 'ready')) {
    const match = matches.find(match => match.status === 'ready');
    const path = `/api/tournaments/${id}/matches/${encodeURIComponent(match.id)}`;
    const command = { kind: 'match_walkover', matchRevision: match.revision, winnerId: match.teams[0], reason: 'Quyết định thử nghiệm của điều hành' };
    const preview = (await f.request(`${path}/changes/preview`, { method: 'POST', cookie, body: command })).body;
    assert.equal((await f.request(`${path}/changes/apply`, { method: 'POST', cookie, body: { ...command, previewToken: preview.previewToken } })).status, 200);
    matches = await list();
  }
  const completed = matches.filter(match => match.status === 'completed'); assert.equal(completed.length, 6);
  assert.ok(completed.every(match => match.games.length === 0));
  const champion = (await f.request(`/api/tournaments/${id}/standings`, { cookie })).body.championId;
  const losses = new Map(ids.map(id => [id, 0]));
  for (const match of completed) { const loser = match.teams.find(id => id !== match.winnerId); losses.set(loser, losses.get(loser) + 1); }
  for (const id of ids) assert.equal(losses.get(id), id === champion ? 0 : 2);
});

test('caster can read history but cannot preview or apply corrections', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await cup(f, cookie);
  const path = `/api/tournaments/${id}/matches/stage1%3AU1`;
  await confirm(f, cookie, path, ids[0]);
  const match = (await f.request(path, { cookie })).body.match;
  const command = { kind: 'game_edit', matchRevision: match.revision, number: 1, gameRevision: match.games[0].revision, data: { winnerId: ids[1] }, reason: 'Điều chỉnh' };
  const memberPassword = 'Temporary-Member-Password-42!';
  const member = (await f.request('/api/users', { method: 'POST', cookie, body: { username: 'entry', displayName: 'Entry', password: memberPassword } })).body.user;
  let memberCookie = (await f.request('/api/login', { method: 'POST', body: { username: 'entry', password: memberPassword } })).cookie;
  memberCookie = (await f.request('/api/password', { method: 'POST', cookie: memberCookie, body: { currentPassword: memberPassword, newPassword: 'Changed-Member-Password-42!' } })).cookie;
  assert.equal((await f.request(`/api/tournaments/${id}/history`, { cookie: memberCookie })).status, 200);
  assert.equal((await f.request(`${path}/changes/preview`, { method: 'POST', cookie: memberCookie, body: command })).status, 403);
  const preview = (await f.request(`${path}/changes/preview`, { method: 'POST', cookie, body: command })).body;
  assert.equal((await f.request(`${path}/changes/apply`, { method: 'POST', cookie: memberCookie, body: { ...command, previewToken: preview.previewToken } })).status, 403);
  assert.equal((await f.request(path, { cookie })).body.match.winnerId, ids[0]);
});

test('preview lists new tiebreak games without materializing them before approval', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await cup(f, cookie, 'round_robin', 2);
  const list = async () => (await f.request(`/api/tournaments/${id}/matches`, { cookie })).body.matches;
  for (const match of await list()) await confirm(f, cookie, `/api/tournaments/${id}/matches/${encodeURIComponent(match.id)}`, ids[0]);
  const match = (await list())[0], path = `/api/tournaments/${id}/matches/${encodeURIComponent(match.id)}`;
  const command = { kind: 'game_edit', matchRevision: match.revision, number: 1, gameRevision: match.games[0].revision, data: { winnerId: ids[1] }, reason: 'Sửa kết quả tạo hòa bảng' };
  const preview = (await f.request(`${path}/changes/preview`, { method: 'POST', cookie, body: command })).body;
  assert.equal(preview.newMatches.length, 1); assert.equal(preview.newMatches[0].bo, 1);
  assert.equal((await list()).length, 2);
  assert.equal((await f.request(`${path}/changes/apply`, { method: 'POST', cookie, body: { ...command, previewToken: preview.previewToken } })).status, 200);
  assert.equal((await list()).length, 3);
});

test('a correction cannot reopen an earlier stage after a later direct-entry stage has started', async t => {
  const f = await fixture(t), cookie = await owner(f), { id, ids } = await cup(f, cookie, 'round_robin', 2, (format, ids) => {
    format.stages.push({ id: 'finals', name: 'Finals', type: 'single_elimination', bo: 1, finalBo: 1, inputs: ids.map(teamId => ({ kind: 'team', teamId })) });
  });
  const original = (await f.request(`/api/tournaments/${id}/matches`, { cookie })).body.matches;
  for (const match of original.filter(match => match.branch === 'group')) await confirm(f, cookie, `/api/tournaments/${id}/matches/${encodeURIComponent(match.id)}`, ids[0]);
  await f.request(`/api/tournaments/${id}/matches/finals%3AU1/games/1/save`, { method: 'POST', cookie, body: { revision: 0, data: {} } });
  const path = `/api/tournaments/${id}/matches/${encodeURIComponent(original[0].id)}`, match = (await f.request(path, { cookie })).body.match;
  const command = { kind: 'game_edit', matchRevision: match.revision, number: 1, gameRevision: match.games[0].revision, data: { winnerId: ids[1] }, reason: 'Đổi kết quả thành hòa bảng' };
  const preview = (await f.request(`${path}/changes/preview`, { method: 'POST', cookie, body: command })).body;
  assert.equal(preview.blocked, true); assert.equal(preview.affected[0].id, 'finals:U1');
  assert.deepEqual(preview.affected[0].before.teams, preview.affected[0].after.teams);
  assert.equal(preview.affected[0].after.status, 'waiting');
  assert.equal((await f.request(path, { cookie })).body.match.winnerId, ids[0]);
});
