import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createDirectory } from './directory.mjs';
import { createAccess } from './access.mjs';
import { createFormats } from './formats.mjs';
import { createResults } from './results.mjs';
import { createHistory } from './history.mjs';
import { createChanges } from './changes.mjs';
import { createRosters } from './rosters.mjs';
import { migrate } from './migrations.mjs';
import { createAccounts, publicUser } from './accounts.mjs';

const derive = promisify(scrypt);
const SESSION_MS = 12 * 60 * 60 * 1000;
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
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
  try {
    db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    migrate(db);
  } catch (error) { db.close(); throw error; }
  const findUser = id => db.prepare('SELECT * FROM users WHERE id=?').get(id);
  const accounts = createAccounts(db);
  const directory = createDirectory(db);
  const access = createAccess(db, accounts);
  const formats = createFormats(db, directory);
  const results = createResults(db, directory);
  const history = createHistory(db);
  const changes = createChanges(db, results, history);
  const rosters = createRosters(db, directory, history);
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
    if (!user || user.disabled) fail(401, 'Tài khoản không còn hoạt động.');
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
          db.prepare('INSERT INTO users(id,username,display_name,password_hash,admin,must_change) VALUES (?,?,?,?,1,0)').run(id, body.username.toLowerCase(), body.displayName.trim(), hash);
          accounts.record(id, id, 'account_created', null, publicUser(findUser(id)));
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
        if (!user || !matches || user.disabled) {
          // Read the latest count after hashing so overlapping attempts also accumulate.
          const latest = loginFailures.get(address);
          const current = latest && latest.until > Date.now() ? latest : { count: 0, until: Date.now() + 15 * 60 * 1000 };
          loginFailures.set(address, { count: current.count + 1, until: current.until });
          fail(401, 'Tên đăng nhập hoặc mật khẩu chưa đúng.');
        }
        // Password changes may complete while scrypt runs. Never mint a session
        // from credentials that have been superseded during that wait.
        const fresh = findUser(user.id);
        if (!fresh || fresh.disabled || fresh.password_hash !== user.password_hash || fresh.revision !== user.revision) fail(401, 'Tên đăng nhập hoặc mật khẩu chưa đúng.');
        loginFailures.delete(address);
        return send(200, { user: publicUser(user) }, createSession(user));
      }
      let user = currentUser(request);
      async function authenticatedBody(allowPasswordChange = false) {
        const body = await jsonBody(request);
        user = currentUser(request);
        if (user.must_change && !allowPasswordChange) fail(403, 'Đổi mật khẩu trước khi dùng ứng dụng.');
        return body;
      }
      if (path === '/api/me' && method === 'GET') return send(200, { user: publicUser(user) });
      if (path === '/api/logout' && method === 'POST') {
        // Revoke this browser's session; other devices may remain signed in.
        const token = request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('bracket_session='))?.slice(16);
        db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token));
        return send(200, { ok: true }, sessionCookie('', 0));
      }
      if (path === '/api/password' && method === 'POST') {
        const body = await authenticatedBody(true);
        if (typeof body.currentPassword !== 'string' || body.currentPassword.length > 128 || !await passwordMatches(body.currentPassword, user.password_hash)) fail(400, 'Mật khẩu hiện tại chưa đúng.');
        credentials({ username: user.username, password: body.newPassword });
        if (body.newPassword === body.currentPassword) fail(400, 'Mật khẩu mới cần khác mật khẩu cũ.');
        const hash = await passwordHash(body.newPassword);
        currentUser(request);
        db.exec('BEGIN IMMEDIATE');
        try {
          // An overlapping password change must not overwrite the newer password.
          const before = findUser(user.id);
          if (before.password_hash !== user.password_hash) fail(409, 'Mật khẩu vừa thay đổi. Đăng nhập lại.');
          db.prepare('UPDATE users SET password_hash=?,must_change=0,revision=revision+1 WHERE id=?').run(hash, user.id);
          db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
          accounts.record(user.id, user.id, 'password_changed', publicUser(before), publicUser(findUser(user.id)));
          db.exec('COMMIT');
        } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
        const updated = findUser(user.id);
        return send(200, { user: publicUser(updated) }, createSession(updated));
      }
      if (user.must_change) fail(403, 'Đổi mật khẩu trước khi dùng ứng dụng.');
      const rosterRoute = path.match(/^\/api\/tournaments\/([a-zA-Z0-9-]+)\/registrations\/([a-zA-Z0-9-]+)\/additions$/);
      if (rosterRoute && method === 'POST') {
        const body = await authenticatedBody();
        access.requireRole(user, rosterRoute[1], 'operator');
        return send(200, { registration: rosters.approve(rosterRoute[1], rosterRoute[2], body, user.id) });
      }
      const historyRoute = path.match(/^\/api\/tournaments\/([a-zA-Z0-9-]+)\/history$/);
      if (historyRoute && method === 'GET') {
        access.requireRole(user, historyRoute[1]);
        directory.tournament(historyRoute[1]);
        return send(200, { history: history.list(historyRoute[1]) });
      }
      const changeRoute = path.match(/^\/api\/tournaments\/([a-zA-Z0-9-]+)\/matches\/([^/]+)\/changes\/(preview|apply)$/);
      if (changeRoute && method === 'POST') {
        const [, id, encodedMatchId, action] = changeRoute;
        const body = await authenticatedBody();
        access.requireRole(user, id, 'operator');
        let matchId;
        try { matchId = decodeURIComponent(encodedMatchId); } catch { fail(400, 'Mã trận không hợp lệ.'); }
        return send(200, changes[action](id, matchId, body, user.id));
      }
      const operationRoute = path.match(/^\/api\/tournaments\/([a-zA-Z0-9-]+)\/(schedule|matches|standings)(?:\/([^/]+)(?:\/games\/(\d+)\/(save|submit|confirm))?)?$/);
      if (operationRoute) {
        const [, id, section, encodedMatchId, number, action] = operationRoute;
        access.requireRole(user, id);
        let matchId;
        try { matchId = encodedMatchId ? decodeURIComponent(encodedMatchId) : null; } catch { fail(400, 'Mã trận không hợp lệ.'); }
        if (method === 'GET' && section === 'standings' && !matchId) return send(200, results.view(id).standings());
        if (method === 'GET' && section === 'matches' && !action) {
          const current = results.view(id);
          return send(200, matchId ? { match: current.read(matchId) } : { matches: current.list() });
        }
        if (method === 'POST') {
          const body = await authenticatedBody();
          access.requireRole(user, id, section === 'schedule' || action === 'confirm' ? 'operator' : 'entry');
          if (section === 'schedule' && !matchId) return send(200, { matches: results.schedule(id, body) });
          if (section === 'matches' && matchId && action) return send(200, { game: results.game(id, matchId, Number(number), action, body, user.id) });
        }
      }
      if (path === '/api/tournaments') {
        if (method === 'GET') return send(200, { tournaments: directory.tournaments().map(event => ({ ...event, roles: access.roles(user, event.id) })).filter(event => event.roles.length) });
        if (method === 'POST') {
          const body = await authenticatedBody();
          if (!access.managesDirectory(user)) fail(403, 'Chưa có quyền tạo giải.');
          db.exec('BEGIN IMMEDIATE');
          try {
            const tournament = directory.createTournament(body);
            if (!user.admin) access.save(tournament.id, { userId: user.id, roles: ['operator'], revision: 0 }, user.id);
            db.exec('COMMIT');
            return send(201, { tournament: { ...tournament, roles: access.roles(user, tournament.id) } });
          } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
        }
      }
      const tournamentRoute = path.match(/^\/api\/tournaments\/([a-zA-Z0-9-]+)(\/registrations|\/grants|\/format|\/lock)?$/);
      if (tournamentRoute) {
        const [, id, registrations] = tournamentRoute;
        if (registrations === '/grants') {
          if (!user.admin) fail(403, 'Chỉ quản trị được cấp quyền.');
          directory.tournament(id);
          if (method === 'GET') return send(200, { grants: access.list(id) });
          if (method === 'POST') {
            const body = await authenticatedBody();
            accounts.requireAdmin(user.id);
            return send(200, { grant: access.save(id, body, user.id) });
          }
        }
        access.requireRole(user, id);
        if (method === 'GET' && !registrations) return send(200, { tournament: { ...formats.read(id), roles: access.roles(user, id) } });
        if (method === 'POST' && ['/format', '/lock'].includes(registrations)) {
          const body = await authenticatedBody();
          access.requireRole(user, id, 'operator');
          return send(200, { tournament: { ...formats.update(id, body, registrations === '/lock'), roles: access.roles(user, id) } });
        }
        if (method === 'POST' && registrations === '/registrations') {
          const body = await authenticatedBody();
          access.requireRole(user, id, 'operator');
          const result = directory.register(id, body);
          return send(result.created ? 201 : 200, { registration: result.registration });
        }
      }
      if (path === '/api/directory' && method === 'GET') {
        if (!access.managesDirectory(user)) fail(403, 'Chưa có quyền quản lý danh bạ.');
        return send(200, directory.list());
      }
      const directoryRoute = path.match(/^\/api\/(teams|players)(?:\/([a-zA-Z0-9-]+))?$/);
      if (directoryRoute && method === 'POST') {
        const [, kind, id] = directoryRoute;
        const body = await authenticatedBody();
        if (!access.managesDirectory(user)) fail(403, 'Chưa có quyền sửa danh bạ.');
        const record = directory.save(kind, body, id);
        return send(id ? 200 : 201, { [kind === 'teams' ? 'team' : 'player']: record });
      }
      const accountRoute = path.match(/^\/api\/users\/([a-zA-Z0-9-]+)(?:\/(history|reset-password|revoke-sessions))?$/);
      if (accountRoute) {
        accounts.requireAdmin(user.id);
        if (method === 'GET' && accountRoute[2] === 'history') return send(200, { history: accounts.history(accountRoute[1]) });
        if (method === 'POST' && !accountRoute[2]) return send(200, { user: accounts.update(accountRoute[1], await authenticatedBody(), user.id) });
        if (method === 'POST' && ['reset-password', 'revoke-sessions'].includes(accountRoute[2])) {
          const body = await authenticatedBody();
          let hash;
          if (accountRoute[2] === 'reset-password') { credentials({ username: 'unused', password: body.password }); hash = await passwordHash(body.password); }
          user = currentUser(request);
          return send(200, { user: accounts.credentials(accountRoute[1], body, user.id, hash) });
        }
      }
      if (path === '/api/users') {
        if (!user.admin) fail(403, 'Chỉ quản trị được quản lý tài khoản.');
        if (method === 'GET') return send(200, { users: accounts.list() });
        if (method === 'POST') {
          const body = await authenticatedBody(); credentials(body);
          if (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.length > 80) fail(400, 'Nhập tên hiển thị tối đa 80 ký tự.');
          const hash = await passwordHash(body.password);
          const id = randomUUID();
          user = currentUser(request);
          db.exec('BEGIN IMMEDIATE');
          try {
            accounts.requireAdmin(user.id);
            db.prepare('INSERT INTO users(id,username,display_name,password_hash,admin,must_change) VALUES (?,?,?,?,0,1)').run(id, body.username.toLowerCase(), body.displayName.trim(), hash);
            accounts.record(id, user.id, 'account_created', null, publicUser(findUser(id)));
            db.exec('COMMIT');
          } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); if (error.code === 'ERR_SQLITE_ERROR' && /UNIQUE/.test(error.message)) fail(409, 'Tên đăng nhập đã có.'); throw error; }
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
