function fail(status, message) { throw Object.assign(new Error(message), { status }); }

export function createAccess(db, accounts) {
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
  function save(tournamentId, body, actorId) {
    if (typeof body.userId !== 'string' || !db.prepare('SELECT id FROM users WHERE id=? AND disabled=0').get(body.userId)) fail(400, 'Thành viên không hoạt động.');
    if (!Array.isArray(body.roles) || body.roles.some(role => !['operator', 'entry'].includes(role)) || new Set(body.roles).size !== body.roles.length) fail(400, 'Vị trí không hợp lệ.');
    const existing = db.prepare('SELECT revision FROM grants WHERE tournament_id=? AND user_id=?').get(tournamentId, body.userId);
    if (body.revision !== (existing?.revision || 0)) fail(409, 'Quyền vừa thay đổi. Tải lại trước khi sửa.');
    const ownsTransaction = !db.isTransaction;
    if (ownsTransaction) db.exec('BEGIN IMMEDIATE');
    try {
      const before = list(tournamentId).find(item => item.userId === body.userId) || { userId: body.userId, roles: [], revision: 0 };
      db.prepare('INSERT INTO grants (tournament_id,user_id,roles_json) VALUES (?,?,?) ON CONFLICT(tournament_id,user_id) DO UPDATE SET roles_json=excluded.roles_json,revision=grants.revision+1').run(tournamentId, body.userId, JSON.stringify(body.roles));
      const after = list(tournamentId).find(item => item.userId === body.userId);
      if (accounts && actorId) accounts.record(body.userId, actorId, 'grant_changed', { tournamentId, ...before }, { tournamentId, ...after });
      if (ownsTransaction) db.exec('COMMIT');
      return after;
    } catch (error) { if (ownsTransaction && db.isTransaction) db.exec('ROLLBACK'); throw error; }
  }
  return { roles, requireRole, managesDirectory, list, save };
}
