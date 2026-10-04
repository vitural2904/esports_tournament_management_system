import { DatabaseSync, backup } from 'node:sqlite';
import { mkdir, open } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error('Dùng: node scripts/backup.mjs <database> <file-backup-mới>');
const db = new DatabaseSync(resolve(source), { readOnly: true });
try {
  if (db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('Database chưa vượt kiểm tra toàn vẹn. Giữ file để kiểm tra.');
  await mkdir(dirname(resolve(destination)), { recursive: true });
  // Reserve exclusively. Never let SQLite overwrite an existing backup.
  const file = await open(resolve(destination), 'wx', 0o600); await file.close();
  await backup(db, resolve(destination));
  console.log(`Đã sao lưu: ${resolve(destination)}`);
} finally { db.close(); }
