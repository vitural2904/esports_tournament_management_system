import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, owner, password } from './helpers.mjs';
import { createPreset } from '../shared/format.mjs';

// Route authorization matrix. Allowed writes deliberately use invalid payloads:
// semantic successful writes are covered by results/corrections/rosters/accounts tests.
// This matrix must reach validation, never mutate the preserved pilot tournament.
for (const [name, roles] of [['admin', null], ['operator', ['operator']], ['entry', ['entry']], ['both', ['operator', 'entry']], ['unassigned', []]]) {
  test(`every protected route enforces ${name} permissions and anonymous access`, async t => {
    const f = await fixture(t), admin = await owner(f);
    const created = await f.request('/api/users', { method: 'POST', cookie: admin, body: { username: 'route-member', displayName: 'Route member', password } });
    const userId = created.body.user.id;
    const login = await f.request('/api/login', { method: 'POST', body: { username: 'route-member', password } });
    const changed = await f.request('/api/password', { method: 'POST', cookie: login.cookie, body: { currentPassword: password, newPassword: 'Route-Member-Password-42!' } });
    const cookie = roles === null ? admin : changed.cookie;
    const event = (await f.request('/api/tournaments', { method: 'POST', cookie: admin, body: { name: 'Routes cup' } })).body.tournament;
    const teams = [], players = [];
    for (let i = 0; i < 2; i++) {
      teams.push((await f.request('/api/teams', { method: 'POST', cookie: admin, body: { name: `Route team ${i}`, tag: `R${i}` } })).body.team.id);
      players.push((await f.request('/api/players', { method: 'POST', cookie: admin, body: { name: `Route player ${i}`, handle: `route${i}#VN2` } })).body.player.id);
      await f.request(`/api/tournaments/${event.id}/registrations`, { method: 'POST', cookie: admin, body: { teamId: teams[i], playerIds: [players[i]], revision: 0 } });
    }
    if (roles !== null) await f.request(`/api/tournaments/${event.id}/grants`, { method: 'POST', cookie: admin, body: { userId, roles, revision: 0 } });
    const base = `/api/tournaments/${event.id}`;
    const current = (await f.request(base, { cookie: admin })).body.tournament;
    const saved = (await f.request(`${base}/format`, { method: 'POST', cookie: admin, body: { revision: current.revision, format: createPreset('single_elimination', teams) } })).body.tournament;
    await f.request(`${base}/lock`, { method: 'POST', cookie: admin, body: { revision: saved.revision } });
    const match = (await f.request(`${base}/matches`, { cookie: admin })).body.matches[0];
    const matchPath = `${base}/matches/${encodeURIComponent(match.id)}`;
    const canAdmin = roles === null, canOperator = canAdmin || roles.includes('operator'), canEntry = canAdmin || roles.includes('entry'), canRead = canAdmin || roles.length > 0;
    const reads = [
      ['/api/me', true], ['/api/users', canAdmin], [`/api/users/${userId}/history`, canAdmin], ['/api/directory', canOperator], ['/api/tournaments', true],
      [base, canRead], [`${base}/grants`, canAdmin], [`${base}/matches`, canRead], [matchPath, canRead], [`${base}/standings`, canRead], [`${base}/history`, canRead],
    ];
    const writes = [
      ['/api/users', canAdmin], [`/api/users/${userId}`, canAdmin], [`/api/users/${userId}/reset-password`, canAdmin], [`/api/users/${userId}/revoke-sessions`, canAdmin],
      ['/api/teams', canOperator], [`/api/teams/${teams[0]}`, canOperator], ['/api/players', canOperator], [`/api/players/${players[0]}`, canOperator], ['/api/tournaments', canOperator],
      [`${base}/registrations`, canOperator], [`${base}/format`, canOperator], [`${base}/lock`, canOperator], [`${base}/grants`, canAdmin], [`${base}/schedule`, canOperator],
      [`${matchPath}/games/1/save`, canEntry], [`${matchPath}/games/1/submit`, canEntry], [`${matchPath}/games/1/confirm`, canOperator],
      [`${base}/registrations/${teams[0]}/additions`, canOperator], [`${matchPath}/changes/preview`, canOperator], [`${matchPath}/changes/apply`, canOperator],
    ];
    for (const [path, allowed] of reads) {
      assert.equal((await f.request(path)).status, 401, `anonymous GET ${path}`);
      const result = await f.request(path, { cookie });
      assert.equal(result.status, allowed ? 200 : 403, `${name} GET ${path}`);
    }
    for (const [path, allowed] of writes) {
      assert.equal((await f.request(path, { method: 'POST', body: {} })).status, 401, `anonymous POST ${path}`);
      const result = await f.request(path, { method: 'POST', cookie, body: {} });
      if (!allowed) assert.equal(result.status, 403, `${name} POST ${path}`);
      else assert.ok([400, 409].includes(result.status), `${name} reaches validation POST ${path}: ${result.status} ${result.body.error}`);
    }
    assert.equal((await f.request('/api/password', { method: 'POST', cookie, body: {} })).status, 400);
    const before = await f.request(matchPath, { cookie: admin });
    assert.equal(before.body.match.games.length, 0);
    assert.equal((await f.request('/api/logout', { method: 'POST', cookie, body: {} })).status, 200);
    assert.equal((await f.request('/api/me', { cookie })).status, 401);
  });
}
