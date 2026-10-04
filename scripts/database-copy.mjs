import { DatabaseSync, backup } from 'node:sqlite';
import { mkdir, open } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export async function copyDatabase(source, destination) {
  const db = new DatabaseSync(resolve(source), { readOnly: true });
  try {
    if (db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('Database chưa vượt kiểm tra toàn vẹn. Giữ file để kiểm tra.');
    db.prepare('SELECT version FROM schema_version').all();
    db.prepare('SELECT token_hash FROM sessions LIMIT 0').all();
    const path = resolve(destination);
    await mkdir(dirname(path), { recursive: true });
    // Exclusive reservation protects existing backups and working databases.
    const file = await open(path, 'wx', 0o600); await file.close();
    await backup(db, path);
    return path;
  } finally { db.close(); }
}
