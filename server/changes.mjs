import { createHmac, randomBytes } from 'node:crypto';
import { tieDefinitions } from './standings.mjs';

function fail(status, message) { throw Object.assign(new Error(message), { status }); }
const outcome = match => ({ teams: match.teams, winnerId: match.winnerId, status: match.status });

export function createChanges(db, results, history) {
  db.exec(`BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS game_decisions (tournament_id TEXT NOT NULL,match_id TEXT NOT NULL,number INTEGER NOT NULL,decision_json TEXT NOT NULL,PRIMARY KEY(tournament_id,match_id,number),FOREIGN KEY(tournament_id,match_id,number) REFERENCES games(tournament_id,match_id,number));
    INSERT OR IGNORE INTO schema_version VALUES (7);
    COMMIT;`);
  const signingKey = randomBytes(32);
  function command(body, match, event) {
    if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 1000) fail(400, 'Cần lý do sửa từ 1–1000 ký tự.');
    if (body.matchRevision !== match.revision) fail(409, 'Trận vừa thay đổi. Tải lại và xem trước lần nữa.');
    const common = { kind: body.kind, matchRevision: body.matchRevision, reason: body.reason.trim() };
    if (body.kind === 'match_walkover') {
      if (!['ready', 'in_progress', 'completed'].includes(match.status) || !match.teams.includes(body.winnerId)) fail(409, 'Chỉ xử thắng trận đã có đủ hai đội và được phép đấu.');
      return { ...common, winnerId: body.winnerId };
    }
    if (!['game_edit', 'game_walkover'].includes(body.kind)) fail(400, 'Loại sửa không được hỗ trợ.');
    const game = match.games.find(game => game.number === body.number);
    if (body.gameRevision !== (game?.revision || 0)) fail(409, 'Game vừa thay đổi. Tải lại trước khi sửa.');
    if (body.kind === 'game_edit' && (!game || game.state !== 'confirmed')) fail(409, 'Chỉ sửa game đã xác nhận qua luồng này.');
    if (body.kind === 'game_walkover' && (!Number.isInteger(body.number) || body.number < 1 || body.number > match.bo || !['ready', 'in_progress', 'completed'].includes(match.status) || (!game && match.status === 'completed') || match.decision || match.games.filter(game => game.number < body.number && game.state === 'confirmed').length !== body.number - 1)) fail(409, 'Game chưa được phép xử thắng. Xác nhận game trước trước.');
    const data = results.validateData(body.kind === 'game_walkover' ? { ...(game?.data || {}), winnerId: body.winnerId } : body.data, match, event);
    if (!data.winnerId) fail(400, 'Game chính thức cần đội thắng.');
    if (match.decision && game && data.winnerId !== game.data.winnerId) fail(409, 'Trận có quyết định xử thắng. Sửa quyết định cả trận để đổi kết quả chính thức.');
    return { ...common, number: body.number, gameRevision: body.gameRevision, data };
  }
  function signature(userId, tournamentId, matchId, change, snapshot, expires) {
    return createHmac('sha256', signingKey).update(JSON.stringify([userId, tournamentId, matchId, change, snapshot, expires])).digest('hex');
  }
  function run(tournamentId, matchId, body, userId, apply = false) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const current = results.view(tournamentId), before = current.read(matchId), change = command(body, before, current.event), beforeMatches = current.list();
      const snapshot = [current.event.revision, beforeMatches.map(match => [match.id, match.revision])];
      let expires;
      if (apply) {
        const parts = typeof body.previewToken === 'string' ? body.previewToken.split('.') : [];
        expires = Number(parts[0]);
        if (!Number.isSafeInteger(expires) || expires < Date.now() || parts[1] !== signature(userId, tournamentId, matchId, change, snapshot, expires)) fail(409, 'Bản xem trước đã hết hạn hoặc dữ liệu thay đổi. Xem trước lại.');
      } else expires = Date.now() + 10 * 60 * 1000;
      const now = new Date().toISOString();
      const decision = { reason: change.reason, actorId: userId, createdAt: now };
      if (change.kind === 'match_walkover') {
        const row = db.prepare('SELECT state_json FROM matches WHERE tournament_id=? AND id=?').get(tournamentId, matchId);
        db.prepare('UPDATE matches SET state_json=? WHERE tournament_id=? AND id=?').run(JSON.stringify({ ...JSON.parse(row.state_json), startedAt: before.startedAt || now, decision: { ...decision, winnerId: change.winnerId } }), tournamentId, matchId);
      } else if (change.kind === 'game_walkover') {
        db.prepare("INSERT INTO games (tournament_id,match_id,number,state,data_json,confirmed_by,confirmed_at) VALUES (?,?,?,'confirmed',?,?,?) ON CONFLICT(tournament_id,match_id,number) DO UPDATE SET state='confirmed',data_json=excluded.data_json,confirmed_by=excluded.confirmed_by,confirmed_at=excluded.confirmed_at,revision=games.revision+1").run(tournamentId, matchId, change.number, JSON.stringify(change.data), userId, now);
        db.prepare('INSERT INTO game_decisions VALUES (?,?,?,?) ON CONFLICT(tournament_id,match_id,number) DO UPDATE SET decision_json=excluded.decision_json').run(tournamentId, matchId, change.number, JSON.stringify(decision));
        if (!before.startedAt) db.prepare('UPDATE matches SET state_json=? WHERE tournament_id=? AND id=?').run(JSON.stringify({ startedAt: now }), tournamentId, matchId);
      } else db.prepare('UPDATE games SET data_json=?,revision=revision+1 WHERE tournament_id=? AND match_id=? AND number=?').run(JSON.stringify(change.data), tournamentId, matchId, change.number);
      if (!before.startedAt) for (const teamId of before.teams) db.prepare('UPDATE registrations SET locked_at=COALESCE(locked_at,?) WHERE tournament_id=? AND team_id=?').run(now, tournamentId, teamId);
      db.prepare('UPDATE matches SET revision=revision+1 WHERE tournament_id=? AND id=?').run(tournamentId, matchId);
      const updated = results.view(tournamentId), after = updated.read(matchId), afterMatches = updated.list();
      if (!after.decision) {
        const score = new Map();
        for (const game of after.games) if (game.state === 'confirmed') {
          score.set(game.data.winnerId, (score.get(game.data.winnerId) || 0) + 1);
          if (score.get(game.data.winnerId) >= (after.bo + 1) / 2 && after.games.some(later => later.number > game.number)) fail(400, 'Kết quả mới kết thúc trận trước một game đã nhập. Không thể giữ game thừa.');
        }
      }
      const affected = beforeMatches.filter(match => match.id !== matchId && JSON.stringify(outcome(match)) !== JSON.stringify(outcome(afterMatches.find(item => item.id === match.id)))).map(match => ({ id: match.id, revision: match.revision, startedAt: match.startedAt, before: outcome(match), after: outcome(afterMatches.find(item => item.id === match.id)) }));
      const blocked = affected.some(match => match.startedAt);
      const newMatches = updated.standings().groups.flatMap(group => tieDefinitions(group.stageId, group.pending)).filter(match => !afterMatches.some(existing => existing.id === match.id));
      if (apply && blocked) fail(409, 'Trận phụ thuộc đã bắt đầu. Không thể đổi kết quả này.');
      if (apply) {
        history.record(tournamentId, userId, change.kind, matchId, change.reason, before, after);
        results.materializeTies(tournamentId);
        db.exec('COMMIT');
        return { match: results.view(tournamentId).read(matchId) };
      }
      db.exec('ROLLBACK');
      return { before, after, affected, newMatches, blocked, previewToken: blocked ? null : `${expires}.${signature(userId, tournamentId, matchId, change, snapshot, expires)}` };
    } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
  }
  return { preview: (...args) => run(...args), apply: (...args) => run(...args, true) };
}
