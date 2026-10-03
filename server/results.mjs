import { rankGroup, tieDefinitions } from './standings.mjs';

function fail(status, message) { throw Object.assign(new Error(message), { status }); }
const gameDto = row => ({ number: row.number, state: row.state, data: JSON.parse(row.data_json), revision: row.revision, submittedBy: row.submitted_by, submittedAt: row.submitted_at, confirmedBy: row.confirmed_by, confirmedAt: row.confirmed_at });
const object = value => value && typeof value === 'object' && !Array.isArray(value);

export function createResults(db, directory) {
  db.exec(`BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS games (tournament_id TEXT NOT NULL,match_id TEXT NOT NULL,number INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'draft',data_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,submitted_by TEXT REFERENCES users(id),submitted_at TEXT,confirmed_by TEXT REFERENCES users(id),confirmed_at TEXT,PRIMARY KEY(tournament_id,match_id,number),FOREIGN KEY(tournament_id,match_id) REFERENCES matches(tournament_id,id));
    INSERT OR IGNORE INTO schema_version VALUES (5);
    COMMIT;`);
  function view(tournamentId) {
    const event = directory.tournament(tournamentId);
    const rows = db.prepare('SELECT * FROM matches WHERE tournament_id=? ORDER BY rowid').all(tournamentId);
    const games = db.prepare('SELECT * FROM games WHERE tournament_id=? ORDER BY number').all(tournamentId);
    const byId = new Map(rows.map(row => [row.id, row])), cache = new Map(), groupCache = new Map(), stageCache = new Map();
    const definitions = rows.map(row => JSON.parse(row.definition_json));
    const stages = event.format?.stages || [];
    function groupStanding(stage, group) {
      const key = `${stage.id}:${group.id}`;
      if (!groupCache.has(key)) groupCache.set(key, rankGroup(stage, group, group.inputs.map(resolve), definitions.filter(match => match.stageId === stage.id && match.groupId === group.id && match.branch === 'group').map(match => read(match.id)), definitions.filter(match => match.stageId === stage.id && match.groupId === group.id && match.tiebreak).map(match => read(match.id))));
      return groupCache.get(key);
    }
    function finalMatch(stageId) {
      const stageMatches = definitions.filter(match => match.stageId === stageId && !match.tiebreak);
      if (!stageMatches.length) return null;
      let final = read(stageMatches.at(-1).id);
      if (final.status === 'skipped') final = read(stageMatches.at(-2).id);
      return final;
    }
    function stageComplete(stage) {
      if (!stageCache.has(stage.id)) stageCache.set(stage.id, stage.type === 'round_robin' ? stage.groups.every(group => groupStanding(stage, group).completed) : Boolean(finalMatch(stage.id)?.winnerId));
      return stageCache.get(stage.id);
    }
    function resolve(source) {
      if (source.kind === 'team') return source.teamId;
      if (source.kind === 'winner' || source.kind === 'loser') {
        const previous = read(source.matchId);
        return previous.winnerId ? source.kind === 'winner' ? previous.winnerId : previous.teams.find(id => id !== previous.winnerId) : null;
      }
      if (source.kind === 'placement') {
        const final = finalMatch(source.stageId);
        return final?.winnerId ? source.rank === 1 ? final.winnerId : final.teams.find(id => id !== final.winnerId) : null;
      }
      if (source.kind === 'seed') {
        const stage = stages.find(stage => stage.id === source.stageId), group = stage?.groups.find(group => group.id === source.groupId);
        if (!group) return null;
        const standing = groupStanding(stage, group);
        return standing.completed ? standing.rows.find(row => row.rank === source.rank)?.teamId || null : null;
      }
      return null;
    }
    function read(id) {
      if (cache.has(id)) return cache.get(id);
      const row = byId.get(id); if (!row) fail(404, 'Không tìm thấy trận đấu.');
      const definition = JSON.parse(row.definition_json), state = JSON.parse(row.state_json);
      const teams = definition.sources.map(resolve);
      const matchGames = games.filter(game => game.match_id === id).map(gameDto);
      const score = teams.map(teamId => matchGames.filter(game => game.state === 'confirmed' && game.data.winnerId === teamId).length);
      const winnerIndex = score.findIndex(value => value >= (definition.bo + 1) / 2);
      const winnerId = winnerIndex < 0 ? null : teams[winnerIndex];
      let status = winnerId ? 'completed' : state.startedAt ? 'in_progress' : teams.every(Boolean) ? 'ready' : 'waiting';
      if (definition.condition) {
        const previous = read(definition.condition.matchId), challenger = resolve(definition.condition.challenger);
        if (!previous.winnerId || !challenger) status = 'waiting';
        else if (previous.winnerId !== challenger) status = 'skipped';
      }
      if (status === 'ready' && !stages.slice(0, stages.findIndex(stage => stage.id === definition.stageId)).every(stageComplete)) status = 'waiting';
      const result = { ...definition, revision: row.revision, scheduledAt: row.scheduled_at, startedAt: state.startedAt || null, teams, score, winnerId, status, games: matchGames };
      cache.set(id, result); return result;
    }
    function standings() {
      const groups = stages.filter(stage => stage.type === 'round_robin').flatMap(stage => stage.groups.map(group => groupStanding(stage, group)));
      const completed = Boolean(event.lockedAt) && stages.length > 0 && stages.every(stageComplete);
      const last = stages.at(-1);
      const championId = !completed ? null : last.type === 'round_robin' ? (last.groups.length === 1 ? groupStanding(last, last.groups[0]).rows.find(row => row.rank === 1)?.teamId : null) : finalMatch(last.id)?.winnerId;
      return { groups, completed, championId: championId || null };
    }
    return { event, read, standings, list: () => rows.map(row => read(row.id)) };
  }
  function validateData(data, match, event) {
    const allowed = ['winnerId', 'durationSeconds', 'blueTeamId', 'redTeamId', 'lineups', 'pickBan', 'patch'];
    if (!object(data) || Object.keys(data).some(key => !allowed.includes(key))) fail(400, 'Dữ liệu game có trường không được hỗ trợ.');
    const result = {};
    for (const field of ['winnerId', 'blueTeamId', 'redTeamId']) if (data[field] !== undefined && data[field] !== null) {
      if (!match.teams.includes(data[field])) fail(400, 'Đội cần thuộc trận đang nhập.'); result[field] = data[field];
    }
    if (result.blueTeamId && result.blueTeamId === result.redTeamId) fail(400, 'Bên xanh và đỏ cần là hai đội khác nhau.');
    if (data.durationSeconds !== undefined && data.durationSeconds !== null) {
      if (!Number.isInteger(data.durationSeconds) || data.durationSeconds < 0 || data.durationSeconds > 86400) fail(400, 'Thời lượng cần từ 0 đến 86400 giây.'); result.durationSeconds = data.durationSeconds;
    }
    if (data.patch !== undefined && data.patch !== null) {
      if (typeof data.patch !== 'string' || data.patch.trim().length > 40) fail(400, 'Phiên bản game tối đa 40 ký tự.'); result.patch = data.patch.trim();
    }
    if (data.lineups !== undefined) {
      if (!object(data.lineups)) fail(400, 'Đội hình không hợp lệ.'); result.lineups = {};
      for (const [teamId, players] of Object.entries(data.lineups)) {
        const roster = event.registrations.find(item => item.team.id === teamId);
        if (!match.teams.includes(teamId) || !Array.isArray(players) || players.length > 5 || new Set(players).size !== players.length || players.some(id => !roster?.players.some(player => player.id === id))) fail(400, 'Đội hình cần tối đa 5 người trong danh sách đăng ký của đội.');
        result.lineups[teamId] = players;
      }
    }
    if (data.pickBan !== undefined) {
      const keys = ['bluePicks', 'redPicks', 'blueBans', 'redBans'];
      if (!object(data.pickBan) || Object.keys(data.pickBan).some(key => !keys.includes(key))) fail(400, 'Chọn/cấm tướng không hợp lệ.');
      result.pickBan = {};
      const all = [];
      for (const key of keys) if (data.pickBan[key] !== undefined) {
        const values = data.pickBan[key];
        if (!Array.isArray(values) || values.length > 5 || values.some(value => typeof value !== 'string' || !value.trim() || value.trim().length > 80)) fail(400, 'Mỗi bên chọn/cấm tối đa 5 tướng.');
        result.pickBan[key] = values.map(value => value.trim()); all.push(...result.pickBan[key].map(value => value.toLowerCase()));
      }
      if (new Set(all).size !== all.length) fail(400, 'Tướng chọn/cấm bị trùng.');
    }
    return result;
  }
  function game(tournamentId, matchId, number, action, body, userId) {
    const current = view(tournamentId), match = current.read(matchId);
    if (!Number.isInteger(number) || number < 1 || number > match.bo) fail(400, 'Số game vượt thể thức trận.');
    if (!['ready', 'in_progress'].includes(match.status)) fail(409, 'Trận chưa có đủ đội, đã xong hoặc chưa được phép diễn ra.');
    if (match.games.filter(game => game.number < number && game.state === 'confirmed').length !== number - 1) fail(409, 'Xác nhận game trước trước khi nhập game tiếp theo.');
    const existing = match.games.find(game => game.number === number);
    if (body.revision !== (existing?.revision || 0)) fail(409, 'Game vừa thay đổi. Tải lại trước khi lưu.');
    const now = new Date().toISOString();
    db.exec('BEGIN IMMEDIATE');
    try {
      if (action === 'save') {
        if (existing && existing.state !== 'draft') fail(409, 'Game đã gửi hoặc xác nhận. Không ghi đè bản nháp.');
        const data = validateData(body.data, match, current.event);
        db.prepare('INSERT INTO games (tournament_id,match_id,number,data_json) VALUES (?,?,?,?) ON CONFLICT(tournament_id,match_id,number) DO UPDATE SET data_json=excluded.data_json,revision=games.revision+1').run(tournamentId, matchId, number, JSON.stringify(data));
        if (!match.startedAt) {
          db.prepare('UPDATE matches SET state_json=? WHERE tournament_id=? AND id=?').run(JSON.stringify({ startedAt: now }), tournamentId, matchId);
          for (const teamId of match.teams) db.prepare('UPDATE registrations SET locked_at=COALESCE(locked_at,?) WHERE tournament_id=? AND team_id=?').run(now, tournamentId, teamId);
        }
      } else {
        if (!existing || existing.state !== (action === 'submit' ? 'draft' : 'submitted')) fail(409, 'Game không ở trạng thái phù hợp.');
        if (!existing.data.winnerId) fail(400, 'Chọn đội thắng trước khi gửi game.');
        const field = action === 'submit' ? 'submitted' : 'confirmed';
        db.prepare(`UPDATE games SET state=?,revision=revision+1,${field}_by=?,${field}_at=? WHERE tournament_id=? AND match_id=? AND number=?`).run(field, userId, now, tournamentId, matchId, number);
      }
      db.prepare('UPDATE matches SET revision=revision+1 WHERE tournament_id=? AND id=?').run(tournamentId, matchId);
      if (action === 'confirm') {
        const insert = db.prepare('INSERT OR IGNORE INTO matches (tournament_id,id,definition_json) VALUES (?,?,?)');
        for (const group of view(tournamentId).standings().groups) for (const definition of tieDefinitions(group.stageId, group.pending)) insert.run(tournamentId, definition.id, JSON.stringify(definition));
      }
      db.exec('COMMIT');
    } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
    return view(tournamentId).read(matchId).games.find(game => game.number === number);
  }
  function schedule(tournamentId, body) {
    if (!Array.isArray(body.updates) || !body.updates.length || body.updates.length > 250 || new Set(body.updates.map(item => item?.matchId)).size !== body.updates.length) fail(400, 'Chọn 1–250 trận khác nhau để đặt lịch.');
    const current = view(tournamentId);
    const changes = body.updates.map(update => {
      if (!object(update)) fail(400, 'Lịch không hợp lệ.');
      const match = current.read(update.matchId);
      if (update.revision !== match.revision) fail(409, 'Trận vừa thay đổi. Tải lại trước khi đặt lịch.');
      const value = update.scheduledAt;
      if (value !== null && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z'))) fail(400, 'Thời gian cần là ngày giờ hợp lệ.');
      return { matchId: match.id, scheduledAt: value };
    });
    db.exec('BEGIN IMMEDIATE');
    try {
      const update = db.prepare('UPDATE matches SET scheduled_at=?,revision=revision+1 WHERE tournament_id=? AND id=?');
      for (const change of changes) update.run(change.scheduledAt, tournamentId, change.matchId);
      db.exec('COMMIT');
    } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
    return view(tournamentId).list();
  }
  return { view, game, schedule };
}
