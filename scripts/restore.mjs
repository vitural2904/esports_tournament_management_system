import { DatabaseSync, backup } from 'node:sqlite';
import { mkdir, open } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error('Dùng: node scripts/restore.mjs <backup> <database-mới>');
const db = new DatabaseSync(resolve(source), { readOnly: true });
try {
  if (db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('Backup chưa vượt kiểm tra toàn vẹn.');
  db.prepare('SELECT version FROM schema_version').all();
  db.prepare('SELECT token_hash FROM sessions LIMIT 0').all();
  await mkdir(dirname(resolve(destination)), { recursive: true });
  const file = await open(resolve(destination), 'wx', 0o600); await file.close();
  await backup(db, resolve(destination));
} finally { db.close(); }
const restored = new DatabaseSync(resolve(destination));
try { restored.exec('DELETE FROM sessions'); }
finally { restored.close(); }
console.log(`Đã phục hồi vào file mới: ${resolve(destination)}. Cần đăng nhập lại.`);
