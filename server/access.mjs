function fail(status, message) { throw Object.assign(new Error(message), { status }); }

export function createAccess(db) {
  db.exec(`BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS grants (tournament_id TEXT NOT NULL REFERENCES tournaments(id),user_id TEXT NOT NULL REFERENCES users(id),roles_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(tournament_id,user_id));
    INSERT OR IGNORE INTO schema_version VALUES (3);
    COMMIT;`);
  const roles = (user, tournamentId) => user.admin ? ['operator', 'entry'] : JSON.parse(db.prepare('SELECT roles_json FROM grants WHERE tournament_id=? AND user_id=?').get(tournamentId, user.id)?.roles_json || '[]');
  function requireRole(user, tournamentId, role) {
    const granted = roles(user, tournamentId);
    if (role ? !granted.includes(role) : !granted.length) fail(403, 'Chưa có quyền cho giải này.');
  }
  function managesDirectory(user) {
    if (user.admin) return true;
    return db.prepare('SELECT roles_json FROM grants WHERE user_id=?').all(user.id).some(row => JSON.parse(row.roles_json).includes('operator'));
  }
  function list(tournamentId) {
    return db.prepare('SELECT user_id,roles_json,revision FROM grants WHERE tournament_id=? ORDER BY rowid').all(tournamentId).map(row => ({ userId: row.user_id, roles: JSON.parse(row.roles_json), revision: row.revision }));
  }
  function save(tournamentId, body) {
    if (typeof body.userId !== 'string' || !db.prepare('SELECT id FROM users WHERE id=?').get(body.userId)) fail(400, 'Thành viên không tồn tại.');
    if (!Array.isArray(body.roles) || body.roles.some(role => !['operator', 'entry'].includes(role)) || new Set(body.roles).size !== body.roles.length) fail(400, 'Vị trí không hợp lệ.');
    const existing = db.prepare('SELECT revision FROM grants WHERE tournament_id=? AND user_id=?').get(tournamentId, body.userId);
    if (body.revision !== (existing?.revision || 0)) fail(409, 'Quyền vừa thay đổi. Tải lại trước khi sửa.');
    db.prepare('INSERT INTO grants (tournament_id,user_id,roles_json) VALUES (?,?,?) ON CONFLICT(tournament_id,user_id) DO UPDATE SET roles_json=excluded.roles_json,revision=grants.revision+1').run(tournamentId, body.userId, JSON.stringify(body.roles));
    return list(tournamentId).find(item => item.userId === body.userId);
  }
  return { roles, requireRole, managesDirectory, list, save };
}
