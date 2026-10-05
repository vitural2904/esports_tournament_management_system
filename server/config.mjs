import { isAbsolute, resolve } from 'node:path';
import { outside } from '../shared/paths.mjs';

export function configuration(env = process.env) {
  if (env.NODE_ENV && !['development', 'test', 'production'].includes(env.NODE_ENV)) throw new Error('NODE_ENV không hợp lệ.');
  const production = env.NODE_ENV === 'production';
  const port = Number(env.API_PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT cần từ 1 đến 65535.');
  const databasePath = resolve(env.DATABASE_PATH || 'data/bracket.sqlite');
  if (production) {
    let url;
    try { url = new URL(env.APP_ORIGIN); } catch { throw new Error('Production cần APP_ORIGIN HTTPS.'); }
    if (url.protocol !== 'https:' || url.origin !== env.APP_ORIGIN) throw new Error('APP_ORIGIN cần origin HTTPS chính xác, không có path hoặc dấu / cuối.');
    if (!env.DATABASE_PATH || !isAbsolute(env.DATABASE_PATH) || !outside(process.cwd(), databasePath)) throw new Error('DATABASE_PATH production cần đường dẫn tuyệt đối ngoài bản phát hành.');
    if (env.TRUSTED_PROXY !== '127.0.0.1') throw new Error('Production cần TRUSTED_PROXY=127.0.0.1; API chỉ nghe loopback.');
  }
  return { port, databasePath, allowedOrigins: production ? [env.APP_ORIGIN] : ['http://127.0.0.1:5173', 'http://localhost:5173'], secureCookies: production, allowSetup: !production, trustedProxy: production ? env.TRUSTED_PROXY : undefined };
}
