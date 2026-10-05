const migrations = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE COLLATE NOCASE NOT NULL, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, admin INTEGER NOT NULL DEFAULT 0, must_change INTEGER NOT NULL DEFAULT 1);
   CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT NOT NULL UNIQUE,tag TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,archived INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY,name TEXT NOT NULL,handle TEXT NOT NULL,handle_key TEXT NOT NULL UNIQUE,revision INTEGER NOT NULL DEFAULT 1,archived INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE IF NOT EXISTS tournaments (id TEXT PRIMARY KEY,name TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,format_json TEXT,locked_at TEXT);
   CREATE TABLE IF NOT EXISTS registrations (tournament_id TEXT NOT NULL REFERENCES tournaments(id),team_id TEXT NOT NULL REFERENCES teams(id),snapshot_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,locked_at TEXT,PRIMARY KEY(tournament_id,team_id));`,
  `CREATE TABLE IF NOT EXISTS grants (tournament_id TEXT NOT NULL REFERENCES tournaments(id),user_id TEXT NOT NULL REFERENCES users(id),roles_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(tournament_id,user_id));`,
  `CREATE TABLE IF NOT EXISTS matches (tournament_id TEXT NOT NULL REFERENCES tournaments(id),id TEXT NOT NULL,definition_json TEXT NOT NULL,state_json TEXT NOT NULL DEFAULT '{}',revision INTEGER NOT NULL DEFAULT 1,scheduled_at TEXT,PRIMARY KEY(tournament_id,id));`,
  `CREATE TABLE IF NOT EXISTS games (tournament_id TEXT NOT NULL,match_id TEXT NOT NULL,number INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'draft',data_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,submitted_by TEXT REFERENCES users(id),submitted_at TEXT,confirmed_by TEXT REFERENCES users(id),confirmed_at TEXT,PRIMARY KEY(tournament_id,match_id,number),FOREIGN KEY(tournament_id,match_id) REFERENCES matches(tournament_id,id));`,
  `CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY,tournament_id TEXT NOT NULL REFERENCES tournaments(id),actor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,target_id TEXT NOT NULL,reason TEXT NOT NULL,before_json TEXT NOT NULL,after_json TEXT NOT NULL,created_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS game_decisions (tournament_id TEXT NOT NULL,match_id TEXT NOT NULL,number INTEGER NOT NULL,decision_json TEXT NOT NULL,PRIMARY KEY(tournament_id,match_id,number),FOREIGN KEY(tournament_id,match_id,number) REFERENCES games(tournament_id,match_id,number));`,
];
// v8 reconciles legacy startup DDL. Earlier builds wrote v1/v2 markers
// before all their tables existed; this one-time repair runs atomically.
migrations.push(migrations.join('\n') + '\nCREATE INDEX IF NOT EXISTS history_by_tournament ON history(tournament_id);');
migrations.push(`ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0;
 ALTER TABLE users ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
 CREATE TABLE account_history (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), actor_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, before_json TEXT NOT NULL, after_json TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE INDEX account_history_by_user ON account_history(user_id);`);

migrations.push(`ALTER TABLE teams ADD COLUMN media_json TEXT NOT NULL DEFAULT '{}';
 ALTER TABLE players ADD COLUMN media_json TEXT NOT NULL DEFAULT '{}';
 CREATE TABLE media_assets (id TEXT PRIMARY KEY,kind TEXT NOT NULL,subject_id TEXT NOT NULL,slot TEXT NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,source BLOB NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE media_images (asset_id TEXT NOT NULL REFERENCES media_assets(id),size INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(asset_id,size));`);
migrations.push(`ALTER TABLE players ADD COLUMN position TEXT NOT NULL DEFAULT '';
 ALTER TABLE teams ADD COLUMN description TEXT NOT NULL DEFAULT '';`);

migrations.push(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'caster' CHECK(role IN ('admin','operator','referee','caster'));
 UPDATE users SET role=CASE WHEN admin=1 THEN 'admin'
 WHEN EXISTS(SELECT 1 FROM grants g,json_each(g.roles_json) r WHERE g.user_id=users.id AND r.value='operator') THEN 'operator'
 WHEN EXISTS(SELECT 1 FROM grants g,json_each(g.roles_json) r WHERE g.user_id=users.id AND r.value='entry') THEN 'referee'
 ELSE 'caster' END;
 DELETE FROM sessions;`);

export function migrate(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)');
    const applied = db.prepare('SELECT version FROM schema_version ORDER BY version').all().map(row => row.version);
    if (applied.some((version, index) => version !== index + 1) || applied.at(-1) > migrations.length) throw new Error('Phiên bản database không được hỗ trợ. Giữ file và dùng đúng bản ứng dụng.');
    for (let i = applied.length; i < migrations.length; i++) {
      db.exec(migrations[i]);
      db.prepare('INSERT INTO schema_version VALUES (?)').run(i + 1);
    }
    db.exec('COMMIT');
  } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
}
