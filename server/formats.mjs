import { compileFormat } from '../shared/format.mjs';
function fail(status, message) { throw Object.assign(new Error(message), { status }); }

export function createFormats(db, directory) {
  function read(id) {
    const event = directory.tournament(id);
    return { ...event, graph: event.format ? compileFormat(event.format, event.registrations.map(item => item.team.id)).matches : [] };
  }
  function update(id, body, lock = false) {
    const event = directory.tournament(id);
    if (event.lockedAt) fail(409, 'Thể thức đã chốt. Không thể đổi cấu trúc.');
    if (event.revision !== body.revision) fail(409, 'Giải vừa thay đổi. Tải lại trước khi lưu.');
    const compiled = compileFormat(lock ? event.format : body.format, event.registrations.map(item => item.team.id), { requireAllTeams: lock });
    const lockedAt = lock ? new Date().toISOString() : null;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE tournaments SET format_json=?,locked_at=?,revision=revision+1 WHERE id=?').run(JSON.stringify(compiled.format), lockedAt, id);
      if (lock) {
        const insert = db.prepare('INSERT INTO matches (tournament_id,id,definition_json) VALUES (?,?,?)');
        for (const match of compiled.matches) insert.run(id, match.id, JSON.stringify(match));
      }
      db.exec('COMMIT');
    } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
    return read(id);
  }
  return { read, update };
}
