import { resolve, join, isAbsolute } from 'node:path';
import { copyDatabase } from './database-copy.mjs';
import { DatabaseSync } from 'node:sqlite';
import { digest, readJSON, outside } from './production-files.mjs';

try {
  const [bundlePath, destination, releaseRoot] = process.argv.slice(2);
  if (![bundlePath, destination, releaseRoot].every(value => value && isAbsolute(value))) throw new Error('Cần ba đường dẫn tuyệt đối: backup-bundle, database-mới, bản-app-tương-thích.');
  const bundle = resolve(bundlePath), target = resolve(destination), root = resolve(releaseRoot);
  if (!outside(root, target) || !outside(bundle, target)) throw new Error('Database phục hồi phải ngoài backup và bản phát hành.');
  const manifest = await readJSON(join(bundle, 'backup.json'));
  const release = await readJSON(join(root, 'release.json'));
  if (manifest.format !== 1 || manifest.release.releaseId !== release.releaseId || manifest.schemaVersion > release.schemaVersion) throw new Error('Chọn đúng cặp app và backup.');
  const source = join(bundle, 'database.sqlite');
  if (await digest(source) !== manifest.sha256) throw new Error('Backup checksum không khớp.');
  await copyDatabase(source, target);
  const db = new DatabaseSync(target);
  try { db.exec('DELETE FROM sessions; PRAGMA wal_checkpoint(TRUNCATE);'); } finally { db.close(); }
  console.log('Đã phục hồi vào database mới. Cần đăng nhập lại. Giữ database gốc.');
} catch { console.error('Không phục hồi được. Kiểm tra checksum, cặp app/backup và đường dẫn đích mới.'); process.exitCode = 1; }
