import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplication } from '../server/application.mjs';
import { DatabaseSync } from 'node:sqlite';

export const ORIGIN = 'http://127.0.0.1:5173';
export const password = 'Temporary-Test-Password-42!';
export async function fixture(t, prepareDatabase) {
  const directory = await mkdtemp(join(tmpdir(), 'bracket-api-'));
  if (prepareDatabase) {
    const db = new DatabaseSync(join(directory, 'test.sqlite'));
    try { prepareDatabase(db); } finally { db.close(); }
  }
  let app;
  let base;
  async function restart() {
    if (app) await app.close();
    app = await createApplication({ databasePath: join(directory, 'test.sqlite'), allowedOrigins: [ORIGIN] });
    await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${app.server.address().port}`;
  }
  await restart();
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }); });
  async function request(path, { method = 'GET', body, cookie, origin = ORIGIN } = {}) {
    const response = await fetch(base + path, { method, headers: { ...(method !== 'GET' ? { 'Content-Type': 'application/json', Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], cookieHeader: response.headers.get('set-cookie') };
  }
  return { request, restart, databasePath: join(directory, 'test.sqlite'), directory };
}
export async function owner(f) {
  const result = await f.request('/api/setup', { method: 'POST', body: { username: 'owner', displayName: 'Owner', password } });
  return result.cookie;
}
