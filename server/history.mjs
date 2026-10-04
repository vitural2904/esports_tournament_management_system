import { randomUUID } from 'node:crypto';

export function createHistory(db) {
  db.exec(`BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY,tournament_id TEXT NOT NULL REFERENCES tournaments(id),actor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,target_id TEXT NOT NULL,reason TEXT NOT NULL,before_json TEXT NOT NULL,after_json TEXT NOT NULL,created_at TEXT NOT NULL);
    INSERT OR IGNORE INTO schema_version VALUES (6);
    COMMIT;`);
  function record(tournamentId, actorId, action, targetId, reason, before, after) {
    db.prepare('INSERT INTO history VALUES (?,?,?,?,?,?,?,?,?)').run(randomUUID(), tournamentId, actorId, action, targetId, reason, JSON.stringify(before), JSON.stringify(after), new Date().toISOString());
  }
  function list(tournamentId) {
    return db.prepare('SELECT h.*,u.display_name FROM history h JOIN users u ON u.id=h.actor_id WHERE tournament_id=? ORDER BY h.rowid DESC').all(tournamentId).map(row => ({ id: row.id, actor: { id: row.actor_id, displayName: row.display_name }, action: row.action, targetId: row.target_id, reason: row.reason, before: JSON.parse(row.before_json), after: JSON.parse(row.after_json), createdAt: row.created_at }));
  }
  return { record, list };
}
