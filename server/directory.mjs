import { randomUUID } from 'node:crypto';

function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function text(value, label, max = 80) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400, `${label} cần 1–${max} ký tự.`);
  return value.trim().normalize('NFC');
}
const key = value => value.normalize('NFKC').toLocaleLowerCase('vi');
const teamDto = row => ({ id: row.id, name: row.name, tag: row.tag, revision: row.revision, archived: Boolean(row.archived) });
const playerDto = row => ({ id: row.id, name: row.name, handle: row.handle, revision: row.revision, archived: Boolean(row.archived) });

export function createDirectory(db) {
  const tables = { teams: { dto: teamDto, field: 'tag', keyField: 'name_key' }, players: { dto: playerDto, field: 'handle', keyField: 'handle_key' } };
  function list() {
    return { teams: db.prepare('SELECT * FROM teams ORDER BY name').all().map(teamDto), players: db.prepare('SELECT * FROM players ORDER BY handle').all().map(playerDto) };
  }
  function save(kind, body, id) {
    const config = tables[kind];
    const name = text(body.name, 'Tên');
    const field = text(body[config.field], kind === 'teams' ? 'Tên viết tắt' : 'Tên trong game', kind === 'teams' ? 12 : 80);
    const normalized = key(kind === 'teams' ? name : field);
    const existing = id ? db.prepare(`SELECT * FROM ${kind} WHERE id=?`).get(id) : null;
    if (id && !existing) fail(404, 'Không tìm thấy trong danh bạ.');
    if (existing && body.revision !== existing.revision) fail(409, 'Thông tin vừa thay đổi. Tải lại trước khi sửa.');
    if (body.archived !== undefined && typeof body.archived !== 'boolean') fail(400, 'Trạng thái danh bạ không hợp lệ.');
    const archived = body.archived === undefined ? existing?.archived || 0 : Number(body.archived);
    const recordId = id || randomUUID();
    try {
      if (existing) db.prepare(`UPDATE ${kind} SET name=?,${config.field}=?,${config.keyField}=?,revision=revision+1,archived=? WHERE id=?`).run(name, field, normalized, archived, id);
      else db.prepare(`INSERT INTO ${kind} (id,name,${config.field},${config.keyField},archived) VALUES (?,?,?,?,?)`).run(recordId, name, field, normalized, archived);
    } catch (error) { if (/UNIQUE constraint/.test(error.message)) fail(409, kind === 'teams' ? 'Tên đội đã có.' : 'Tên trong game đã có.'); throw error; }
    return config.dto(db.prepare(`SELECT * FROM ${kind} WHERE id=?`).get(recordId));
  }
  function tournament(id) {
    const row = db.prepare('SELECT * FROM tournaments WHERE id=?').get(id);
    if (!row) fail(404, 'Không tìm thấy giải đấu.');
    const registrations = db.prepare('SELECT * FROM registrations WHERE tournament_id=? ORDER BY rowid').all(id).map(registration => ({ ...JSON.parse(registration.snapshot_json), revision: registration.revision, lockedAt: registration.locked_at }));
    return { id: row.id, name: row.name, revision: row.revision, format: row.format_json ? JSON.parse(row.format_json) : null, lockedAt: row.locked_at, registrations };
  }
  function createTournament(body) {
    const name = text(body.name, 'Tên giải', 120), id = randomUUID();
    db.prepare('INSERT INTO tournaments (id,name) VALUES (?,?)').run(id, name);
    return tournament(id);
  }
  function register(tournamentId, body) {
    const event = tournament(tournamentId);
    const team = db.prepare('SELECT * FROM teams WHERE id=?').get(typeof body.teamId === 'string' ? body.teamId : '');
    if (!team || team.archived) fail(400, 'Đội không có trong danh bạ hiện tại.');
    if (!Array.isArray(body.playerIds) || body.playerIds.length > 20 || body.playerIds.some(id => typeof id !== 'string') || new Set(body.playerIds).size !== body.playerIds.length) fail(400, 'Danh sách tuyển thủ không hợp lệ hoặc bị trùng.');
    const existing = event.registrations.find(item => item.team.id === team.id);
    if (body.revision !== (existing?.revision || 0)) fail(409, 'Đăng ký vừa thay đổi. Tải lại trước khi sửa.');
    if (existing?.lockedAt) fail(409, 'Danh sách đăng ký đã khóa. Cần duyệt bổ sung.');
    if (event.lockedAt && !existing) fail(409, 'Thể thức đã chốt. Không thêm đội mới.');
    const assigned = new Set(event.registrations.filter(item => item.team.id !== team.id).flatMap(item => item.players.map(player => player.id)));
    if (body.playerIds.some(id => assigned.has(id))) fail(409, 'Tuyển thủ đã đăng ký cho đội khác trong giải.');
    const players = body.playerIds.map(id => {
      const row = db.prepare('SELECT * FROM players WHERE id=?').get(id);
      if (!row || row.archived) fail(400, 'Tuyển thủ không có trong danh bạ hiện tại.');
      const previous = existing?.players.find(player => player.id === id);
      return previous || { id: row.id, name: row.name, handle: row.handle };
    });
    const snapshot = { team: existing?.team || { id: team.id, name: team.name, tag: team.tag }, players };
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('INSERT INTO registrations (tournament_id,team_id,snapshot_json) VALUES (?,?,?) ON CONFLICT(tournament_id,team_id) DO UPDATE SET snapshot_json=excluded.snapshot_json,revision=registrations.revision+1').run(tournamentId, team.id, JSON.stringify(snapshot));
      db.prepare('UPDATE tournaments SET revision=revision+1 WHERE id=?').run(tournamentId);
      db.exec('COMMIT');
    } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
    return { registration: tournament(tournamentId).registrations.find(item => item.team.id === team.id), created: !existing };
  }
  const tournaments = () => db.prepare('SELECT id FROM tournaments ORDER BY rowid DESC').all().map(row => tournament(row.id));
  return { list, save, tournament, tournaments, createTournament, register };
}
