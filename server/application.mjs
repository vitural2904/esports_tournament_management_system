import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const derive = promisify(scrypt);
const SESSION_MS = 12 * 60 * 60 * 1000;
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
const publicUser = row => ({ id: row.id, username: row.username, displayName: row.display_name, admin: Boolean(row.admin), mustChangePassword: Boolean(row.must_change) });
async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  const value = await derive(password, salt, 64);
  return `${salt}:${value.toString('hex')}`;
}
async function passwordMatches(password, saved) {
  const [salt, hex] = saved.split(':');
  const value = await derive(password, salt, 64);
  return timingSafeEqual(value, Buffer.from(hex, 'hex'));
}
function credentials(body) {
  if (typeof body.username !== 'string' || !/^[a-z0-9_.-]{3,40}$/i.test(body.username)) fail(400, 'Tên đăng nhập cần 3–40 chữ, số hoặc . _ -');
  if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) fail(400, 'Mật khẩu cần 12–128 ký tự.');
}
async function jsonBody(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) fail(415, 'Yêu cầu dữ liệu JSON.');
  let length = 0;
  const chunks = [];
  for await (const chunk of request) { length += chunk.length; if (length > 32768) fail(413, 'Dữ liệu quá lớn.'); chunks.push(chunk); }
  try { const body = JSON.parse(Buffer.concat(chunks).toString()); if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Dữ liệu không hợp lệ.'); return body; }
  catch { fail(400, 'Dữ liệu không hợp lệ.'); }
}

export async function createApplication({ databasePath, allowedOrigins = ['http://127.0.0.1:5173'], secureCookies = false }) {
  await mkdir(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
    INSERT OR IGNORE INTO schema_version VALUES (1);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE COLLATE NOCASE NOT NULL, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, admin INTEGER NOT NULL DEFAULT 0, must_change INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);`);
  const findUser = id => db.prepare('SELECT * FROM users WHERE id=?').get(id);
  const loginFailures = new Map();
  const unknownPassword = await passwordHash(randomBytes(32).toString('hex'));
  const tokenHash = token => createHash('sha256').update(token).digest('hex');
  function sessionCookie(token, maxAge = SESSION_MS / 1000) { return `bracket_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureCookies ? '; Secure' : ''}`; }
  function createSession(user) {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(tokenHash(token), user.id, Date.now() + SESSION_MS);
    return sessionCookie(token);
  }
  function currentUser(request) {
    const token = request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('bracket_session='))?.slice(16);
    if (!token) fail(401, 'Cần đăng nhập.');
    const session = db.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?').get(tokenHash(token), Date.now());
    if (!session) fail(401, 'Phiên đã hết hạn. Đăng nhập lại.');
    const user = findUser(session.user_id);
    if (!user) fail(401, 'Tài khoản không còn tồn tại.');
    return user;
  }
  async function handle(request, response) {
    const path = new URL(request.url, 'http://localhost').pathname;
    const method = request.method;
    const send = (status, body, cookie) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(cookie ? { 'Set-Cookie': cookie } : {}) }); response.end(JSON.stringify(body)); };
    try {
      if (!['GET', 'HEAD'].includes(method) && !allowedOrigins.includes(request.headers.origin)) fail(403, 'Nguồn yêu cầu không được phép.');
      if (path === '/api/setup' && method === 'GET') return send(200, { needed: db.prepare('SELECT COUNT(*) AS count FROM users').get().count === 0 });
      if (path === '/api/setup' && method === 'POST') {
        if (db.prepare('SELECT COUNT(*) AS count FROM users').get().count) fail(409, 'Đã tạo quản trị đầu tiên.');
        const body = await jsonBody(request); credentials(body);
        if (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.length > 80) fail(400, 'Nhập tên hiển thị tối đa 80 ký tự.');
        const hash = await passwordHash(body.password);
        db.exec('BEGIN IMMEDIATE');
        try {
          if (db.prepare('SELECT COUNT(*) AS count FROM users').get().count) fail(409, 'Đã tạo quản trị đầu tiên.');
          const id = randomUUID();
          db.prepare('INSERT INTO users VALUES (?,?,?,?,1,0)').run(id, body.username.toLowerCase(), body.displayName.trim(), hash);
          db.exec('COMMIT');
          const user = findUser(id);
          return send(201, { user: publicUser(user) }, createSession(user));
        } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
      }
      if (path === '/api/login' && method === 'POST') {
        const address = request.socket.remoteAddress;
        const failures = loginFailures.get(address);
        if (failures && failures.until > Date.now() && failures.count >= 10) fail(429, 'Thử đăng nhập quá nhiều. Chờ 15 phút.');
        const body = await jsonBody(request); credentials(body);
        const user = db.prepare('SELECT * FROM users WHERE username=?').get(body.username);
        const matches = await passwordMatches(body.password, user?.password_hash ?? unknownPassword);
        if (!user || !matches) {
          // Read the latest count after hashing so overlapping attempts also accumulate.
          const latest = loginFailures.get(address);
          const current = latest && latest.until > Date.now() ? latest : { count: 0, until: Date.now() + 15 * 60 * 1000 };
          loginFailures.set(address, { count: current.count + 1, until: current.until });
          fail(401, 'Tên đăng nhập hoặc mật khẩu chưa đúng.');
        }
        // Password changes may complete while scrypt runs. Never mint a session
        // from credentials that have been superseded during that wait.
        if (findUser(user.id)?.password_hash !== user.password_hash) fail(401, 'Tên đăng nhập hoặc mật khẩu chưa đúng.');
        loginFailures.delete(address);
        return send(200, { user: publicUser(user) }, createSession(user));
      }
      const user = currentUser(request);
      if (path === '/api/me' && method === 'GET') return send(200, { user: publicUser(user) });
      if (path === '/api/logout' && method === 'POST') {
        // Revoke this browser's session; other devices may remain signed in.
        const token = request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('bracket_session='))?.slice(16);
        db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token));
        return send(200, { ok: true }, sessionCookie('', 0));
      }
      if (path === '/api/password' && method === 'POST') {
        const body = await jsonBody(request);
        if (typeof body.currentPassword !== 'string' || body.currentPassword.length > 128 || !await passwordMatches(body.currentPassword, user.password_hash)) fail(400, 'Mật khẩu hiện tại chưa đúng.');
        credentials({ username: user.username, password: body.newPassword });
        if (body.newPassword === body.currentPassword) fail(400, 'Mật khẩu mới cần khác mật khẩu cũ.');
        const hash = await passwordHash(body.newPassword);
        db.exec('BEGIN IMMEDIATE');
        try {
          // An overlapping password change must not overwrite the newer password.
          if (findUser(user.id).password_hash !== user.password_hash) fail(409, 'Mật khẩu vừa thay đổi. Đăng nhập lại.');
          db.prepare('UPDATE users SET password_hash=?,must_change=0 WHERE id=?').run(hash, user.id);
          db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
          db.exec('COMMIT');
        } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
        const updated = findUser(user.id);
        return send(200, { user: publicUser(updated) }, createSession(updated));
      }
      if (user.must_change) fail(403, 'Đổi mật khẩu trước khi dùng ứng dụng.');
      if (path === '/api/users') {
        if (!user.admin) fail(403, 'Chỉ quản trị được quản lý tài khoản.');
        if (method === 'GET') return send(200, { users: db.prepare('SELECT * FROM users ORDER BY username').all().map(publicUser) });
        if (method === 'POST') {
          const body = await jsonBody(request); credentials(body);
          if (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.length > 80) fail(400, 'Nhập tên hiển thị tối đa 80 ký tự.');
          const hash = await passwordHash(body.password);
          const id = randomUUID();
          try { db.prepare('INSERT INTO users VALUES (?,?,?,?,0,1)').run(id, body.username.toLowerCase(), body.displayName.trim(), hash); }
          catch (error) { if (error.code === 'ERR_SQLITE_ERROR' && /UNIQUE/.test(error.message)) fail(409, 'Tên đăng nhập đã có.'); throw error; }
          return send(201, { user: publicUser(findUser(id)) });
        }
      }
      fail(404, 'Không tìm thấy chức năng.');
    } catch (error) {
      if (!error.status) console.error('API error:', error.message);
      send(error.status || 500, { error: error.status ? error.message : 'Không thể hoàn tất. Thử lại.' });
    }
  }
  const server = createServer((request, response) => { void handle(request, response); });
  return { server, close: async () => { if (server.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); db.close(); } };
}
