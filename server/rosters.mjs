function fail(status, message) { throw Object.assign(new Error(message), { status }); }

export function createRosters(db, directory, history) {
  function approve(tournamentId, teamId, body, actorId) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const event = directory.tournament(tournamentId);
      const before = event.registrations.find(item => item.team.id === teamId);
      if (!before) fail(404, 'Đội chưa đăng ký trong giải.');
      if (body.revision !== before.revision) fail(409, 'Đăng ký vừa thay đổi. Tải lại trước khi duyệt.');
      if (!before.lockedAt) fail(409, 'Danh sách chưa khóa. Dùng chỉnh đăng ký.');
      if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 1000) fail(400, 'Nhập lý do duyệt từ 1–1000 ký tự.');
      const ids = body.playerIds;
      if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length || before.players.length + ids.length > 20) fail(400, 'Chọn tuyển thủ bổ sung. Tổng danh sách tối đa 20 người.');
      const assigned = new Set(event.registrations.flatMap(item => item.players.map(player => player.id)));
      if (ids.some(id => assigned.has(id))) fail(409, 'Tuyển thủ đã đăng ký trong giải.');
      const additions = ids.map(id => {
        const player = db.prepare('SELECT * FROM players WHERE id=?').get(id);
        if (!player || player.archived) fail(400, 'Tuyển thủ không có trong danh bạ hiện tại.');
        return { id: player.id, name: player.name, handle: player.handle, media: JSON.parse(player.media_json || '{}') };
      });
      const snapshot = { team: before.team, players: [...before.players, ...additions] };
      db.prepare('UPDATE registrations SET snapshot_json=?,revision=revision+1 WHERE tournament_id=? AND team_id=?').run(JSON.stringify(snapshot), tournamentId, teamId);
      db.prepare('UPDATE tournaments SET revision=revision+1 WHERE id=?').run(tournamentId);
      const registration = directory.tournament(tournamentId).registrations.find(item => item.team.id === teamId);
      history.record(tournamentId, actorId, 'roster_addition', teamId, body.reason.trim(), before, registration);
      db.exec('COMMIT');
      return registration;
    } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
  }
  return { approve };
}
