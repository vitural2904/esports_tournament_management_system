import assert from 'node:assert/strict';
import sharp from 'sharp';

// Disposable GitHub runner only. This is never pointed at the operator's app.
assert.equal(process.env.GITHUB_ACTIONS, 'true');
const base = 'http://127.0.0.1:3001';
const origin = 'https://cup.example.test';
const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Bracket-Client-IP': '192.0.2.50' }, body: JSON.stringify({ username: 'ci-owner', password: 'Temporary-CI-Password-42!' }) });
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie').split(';')[0];
async function request(path, body) {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.equal(response.ok, true, `${path} status ${response.status}`);
  return response;
}
if (process.argv[2] === 'seed') {
  const { team } = await (await request('/api/teams', { name: 'Linux persistence team', tag: 'LIN' })).json();
  const png = await sharp({ create: { width: 32, height: 32, channels: 4, background: '#123456' } }).png().toBuffer();
  await request(`/api/teams/${team.id}/media/logo`, { revision: team.revision, data: png.toString('base64'), mime: 'image/png', light: false, x: 50, y: 50 });
  await request('/api/tournaments', { name: 'Linux persistence cup' });
}
const { teams } = await (await request('/api/directory')).json();
const team = teams.find(item => item.name === 'Linux persistence team');
assert.ok(team?.media.logo.id);
const image = await request(`/api/media/${team.media.logo.id}/128`);
assert.equal((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).width, 32);
const { tournaments } = await (await request('/api/tournaments')).json();
assert.equal(tournaments.filter(item => item.name === 'Linux persistence cup').length, 1);
console.log('Linux data and media verified.');
