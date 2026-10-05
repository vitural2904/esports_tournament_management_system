import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createApplication } from '../../server/application.mjs';
import { freePort } from '../ui/https-proxy.mjs';
import { password } from '../helpers.mjs';

test('tunnel listener requires hostname and edge IP; overwrites forged internal headers and separates clients', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'bracket-tunnel-'));
  const origin = 'https://cup.example.test';
  const app = await createApplication({ databasePath: join(directory, 'test.sqlite'), allowedOrigins: [origin], secureCookies: true, allowSetup: false, trustedProxy: '127.0.0.1' });
  await app.initializeAdmin({ username: 'owner', displayName: 'Owner', password });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const port = await freePort();
  const config = join(directory, 'Caddyfile');
  await writeFile(config, '{\n admin off\n}\n' + (await readFile('deploy/Caddyfile.tunnel', 'utf8')).replace('import Caddy.common', `import ${JSON.stringify(resolve('deploy/Caddy.common').replaceAll('\\', '/'))}`));
  const binary = process.env.CADDY_BIN || (process.platform === 'win32' ? resolve('.local/tools/caddy/caddy.exe') : 'caddy');
  const child = spawn(binary, ['run', '--config', config, '--adapter', 'caddyfile'], { env: { ...process.env, APP_HOST: 'cup.example.test', RELEASE_ROOT: process.cwd(), API_PORT: String(app.server.address().port), PROXY_PORT: String(port), XDG_DATA_HOME: directory, XDG_CONFIG_HOME: directory, APPDATA: directory }, stdio: ['ignore', 'ignore', 'pipe'] });
  let error;
  child.on('error', value => { error = value; }); child.stderr.resume();
  t.after(async () => {
    if (child.exitCode === null && !error) { const stopped = once(child, 'exit'); child.kill(); await stopped; }
    await app.close(); await rm(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  const send = (path, options) => new Promise((resolve, reject) => {
    const req = request(base + path, { method: options.method || 'GET', headers: options.headers }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: new Headers(response.headers), body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject); req.setTimeout(2000, () => req.destroy(new Error('Proxy request timeout'))); req.end(options.body);
  });
  const headers = { Host: 'cup.example.test', 'CF-Connecting-IP': '192.0.2.61', Origin: origin, 'Content-Type': 'application/json' };
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (error) throw error;
    if (child.exitCode !== null) throw new Error('Tunnel Caddy failed to start.');
    try { ready = (await send('/api/health', { headers })).status === 200; } catch { /* Wait for listener. */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true);
  assert.deepEqual(JSON.parse((await send('/api/health', { headers })).body), { ok: true });
  assert.equal((await send('/api/health', { headers: { Host: 'wrong.example.test', 'CF-Connecting-IP': '192.0.2.61' } })).status, 421);
  assert.equal((await send('/api/health', { headers: { Host: 'cup.example.test' } })).status, 400);
  const login = (value, extra = {}) => send('/api/login', { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify({ username: 'owner', password: value }) });
  for (let index = 0; index < 10; index++) assert.equal((await login('Wrong-Tunnel-Password-42!', { 'X-Bracket-Client-IP': `192.0.2.${index + 1}` })).status, 401);
  assert.equal((await login(password, { 'X-Bracket-Client-IP': '192.0.2.99' })).status, 429);
  const other = await login(password, { 'CF-Connecting-IP': '192.0.2.62' });
  assert.equal(other.status, 200); assert.match(other.headers.get('set-cookie'), /; Secure/);
});
