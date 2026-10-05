import { spawn } from 'node:child_process';
import { writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { request } from 'node:https';

export async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

export async function httpsProxy(directory, apiPort) {
  const port = await freePort();
  // Certificate belongs only to this disposable test. No system trust install.
  const config = join(directory, 'Caddyfile');
  const common = resolve('deploy/Caddy.common').replaceAll('\\', '/');
  await writeFile(config, (await readFile('deploy/Caddyfile.test', 'utf8')).replace('import Caddy.common', `import ${JSON.stringify(common)}`));
  const binary = process.env.CADDY_BIN || (process.platform === 'win32' ? resolve('.local/tools/caddy/caddy.exe') : 'caddy');
  const child = spawn(binary, ['run', '--config', config, '--adapter', 'caddyfile'], { env: { ...process.env, RELEASE_ROOT: process.cwd(), API_PORT: String(apiPort), PROXY_PORT: String(port), XDG_DATA_HOME: directory, XDG_CONFIG_HOME: directory, APPDATA: directory }, stdio: ['ignore', 'ignore', 'pipe'] });
  let failure, diagnostics = '';
  child.on('error', error => { failure = error; });
  child.stderr.on('data', value => { diagnostics = (diagnostics + value).slice(-2000); });
  const stop = async () => {
    if (child.exitCode !== null || failure) return;
    const closed = new Promise(resolve => child.once('exit', resolve));
    child.kill(); await closed;
  };
  const origin = `https://localhost:${port}`;
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (failure) throw failure;
      if (child.exitCode !== null) throw new Error(`Caddy không khởi động được: ${diagnostics}`);
      const ready = await new Promise(resolve => {
        const req = request(`${origin}/api/health`, { rejectUnauthorized: false, family: 4 }, response => { response.resume(); resolve(response.statusCode === 200); });
        req.on('error', () => resolve(false)); req.setTimeout(1000, () => req.destroy()); req.end();
      });
      if (ready) return { origin, close: stop };
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Proxy HTTPS chưa sẵn sàng.');
  } catch (error) { await stop(); throw error; }
}
