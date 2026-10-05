import { randomUUID } from 'node:crypto';

function fail(status, message) { throw Object.assign(new Error(message), { status }); }
export const publicUser = row => ({ id: row.id, username: row.username, displayName: row.display_name, role: row.role, admin: row.role === 'admin', mustChangePassword: Boolean(row.must_change), disabled: Boolean(row.disabled), revision: row.revision });

export function createAccounts(db) {
  const read = id => {
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
    if (!user) fail(404, 'Tài khoản không tồn tại.');
    return user;
  };
  function requireAdmin(id) {
    const actor = read(id);
    if (!actor.admin || actor.disabled || actor.must_change) fail(403, 'Chỉ quản trị được quản lý tài khoản.');
  }
  function requireReplacement(user) {
    if (user.admin && !user.disabled && !user.must_change && db.prepare('SELECT COUNT(*) n FROM users WHERE admin=1 AND disabled=0 AND must_change=0').get().n <= 1) fail(400, 'Cần giữ ít nhất một quản trị hoạt động.');
  }
  function record(userId, actorId, action, before, after) {
    db.prepare('INSERT INTO account_history VALUES(?,?,?,?,?,?,?)').run(randomUUID(), userId, actorId, action, JSON.stringify(before), JSON.stringify(after), new Date().toISOString());
  }
  function history(id) {
    read(id);
    return db.prepare('SELECT h.*,u.display_name FROM account_history h JOIN users u ON u.id=h.actor_id WHERE h.user_id=? ORDER BY h.rowid DESC').all(id).map(row => ({ id: row.id, action: row.action, actor: { id: row.actor_id, displayName: row.display_name }, before: JSON.parse(row.before_json), after: JSON.parse(row.after_json), createdAt: row.created_at }));
  }
  function list() {
    return db.prepare('SELECT * FROM users ORDER BY username').all().map(publicUser);
  }
  function update(id, body, actorId) {
    if (Object.keys(body).some(key => !['revision', 'displayName', 'role', 'admin', 'disabled'].includes(key)) || !['displayName', 'role', 'admin', 'disabled'].some(key => key in body)) fail(400, 'Thao tác tài khoản không hợp lệ.');
    if ('role' in body && !['admin', 'operator', 'referee', 'caster'].includes(body.role)) fail(400, 'Role không hợp lệ.');
    if ('role' in body && 'admin' in body) fail(400, 'Chỉ gửi một role.');
    if ('displayName' in body && (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.length > 80)) fail(400, 'Nhập tên hiển thị tối đa 80 ký tự.');
    for (const key of ['admin', 'disabled']) if (key in body && typeof body[key] !== 'boolean') fail(400, 'Quyền và trạng thái không hợp lệ.');
    db.exec('BEGIN IMMEDIATE');
    try {
      requireAdmin(actorId);
      const user = read(id);
      if (body.revision !== user.revision) fail(409, 'Tài khoản vừa thay đổi. Tải lại trước khi sửa.');
      const role = body.role ?? ('admin' in body ? (body.admin ? 'admin' : 'caster') : user.role);
      const admin = role === 'admin', disabled = body.disabled ?? Boolean(user.disabled);
      const securityChanged = role !== user.role || disabled !== Boolean(user.disabled);
      if (id === actorId && securityChanged) fail(400, 'Không thể tự khóa hoặc tự đổi quyền quản trị.');
      if (!admin || disabled) requireReplacement(user);
      db.prepare('UPDATE users SET display_name=?,role=?,admin=?,disabled=?,revision=revision+1 WHERE id=?').run(body.displayName?.trim() ?? user.display_name, role, Number(admin), Number(disabled), id);
      if (securityChanged) db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
      const updated = publicUser(read(id));
      record(id, actorId, 'account_update', publicUser(user), updated);
      db.exec('COMMIT');
      return updated;
    } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
  }
  function credentials(id, body, actorId, hash) {
    if (Object.keys(body).some(key => !['revision', ...(hash ? ['password'] : [])].includes(key))) fail(400, 'Thao tác không hợp lệ.');
    db.exec('BEGIN IMMEDIATE');
    try {
      requireAdmin(actorId);
      const user = read(id);
      if (body.revision !== user.revision) fail(409, 'Tài khoản vừa thay đổi. Tải lại trước khi sửa.');
      if (id === actorId) fail(400, 'Dùng Đổi mật khẩu hoặc Đăng xuất cho tài khoản của bạn.');
      if (hash) requireReplacement(user);
      if (hash) db.prepare('UPDATE users SET password_hash=?,must_change=1,revision=revision+1 WHERE id=?').run(hash, id);
      else db.prepare('UPDATE users SET revision=revision+1 WHERE id=?').run(id);
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
      const updated = publicUser(read(id));
      record(id, actorId, hash ? 'password_reset' : 'sessions_revoked', publicUser(user), updated);
      db.exec('COMMIT');
      return updated;
    } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
  }
  return { read, requireAdmin, record, history, list, update, credentials };
}
