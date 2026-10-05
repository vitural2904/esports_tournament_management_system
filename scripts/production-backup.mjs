import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, readdir, realpath, rm, lstat, rmdir } from 'node:fs/promises';
import { join, resolve, isAbsolute } from 'node:path';
import { copyDatabase } from './database-copy.mjs';
import { digest, readJSON, writeJSON, outside } from './production-files.mjs';

let lock;
try {
  const { DATABASE_PATH, RELEASE_ROOT, BACKUP_DIRECTORY, OFFSITE_DIRECTORY, BACKUP_KEEP_DAYS } = process.env;
  const days = Number(BACKUP_KEEP_DAYS);
  if (![DATABASE_PATH, RELEASE_ROOT, BACKUP_DIRECTORY, OFFSITE_DIRECTORY].every(value => value && isAbsolute(value)) || !Number.isInteger(days) || days < 1 || days > 3650) throw new Error('Cần cấu hình đường dẫn tuyệt đối và BACKUP_KEEP_DAYS từ 1 đến 3650.');
  const releaseRoot = await realpath(RELEASE_ROOT);
  await mkdir(BACKUP_DIRECTORY, { recursive: true, mode: 0o700 });
  const backupRoot = await realpath(BACKUP_DIRECTORY);
  // Offsite must already exist (mount configured by the operator). Never silently make a local substitute.
  const offsiteRoot = await realpath(OFFSITE_DIRECTORY);
  const source = await realpath(DATABASE_PATH);
  if (!outside(releaseRoot, source) || !outside(releaseRoot, backupRoot) || !outside(releaseRoot, offsiteRoot) || !outside(backupRoot, source) || !outside(backupRoot, offsiteRoot) || !outside(offsiteRoot, backupRoot)) throw new Error('Database, backup, offsite và bản phát hành phải tách riêng.');
  await mkdir(join(backupRoot, '.backup-lock'));
  lock = join(backupRoot, '.backup-lock');
  const name = `backup-${Date.now()}-${randomUUID()}`;
  const bundle = join(backupRoot, name);
  await mkdir(bundle, { mode: 0o700 });
  const database = await copyDatabase(source, join(bundle, 'database.sqlite'));
  const db = new DatabaseSync(database, { readOnly: true });
  let version;
  try { version = db.prepare('SELECT MAX(version) AS version FROM schema_version').get().version; } finally { db.close(); }
  const release = await readJSON(join(releaseRoot, 'release.json'));
  if (version > release.schemaVersion) throw new Error('Bản app không tương thích database. Giữ backup để kiểm tra.');
  const manifest = { format: 1, createdAt: new Date().toISOString(), schemaVersion: version, release, sha256: await digest(database), verifiedOffsite: false };
  await writeJSON(join(bundle, 'backup.json'), manifest);
  const remoteBundle = join(offsiteRoot, name);
  await mkdir(remoteBundle, { mode: 0o700 });
  await copyFile(database, join(remoteBundle, 'database.sqlite'), constants.COPYFILE_EXCL);
  await writeJSON(join(remoteBundle, 'backup.json'), manifest);
  if (await digest(join(remoteBundle, 'database.sqlite')) !== manifest.sha256) throw new Error('Checksum offsite không khớp. Không xóa backup cũ.');
  manifest.verifiedOffsite = true;
  await writeJSON(join(remoteBundle, 'backup.json'), manifest);
  if (JSON.stringify(await readJSON(join(remoteBundle, 'backup.json'))) !== JSON.stringify(manifest)) throw new Error('Metadata offsite không khớp.');
  await writeJSON(join(bundle, 'backup.json'), manifest);
  // Only prune locally after a new complete copy has been read back from offsite.
  for (const entry of await readdir(backupRoot)) {
    if (!/^backup-\d+-[a-f0-9-]{36}$/.test(entry) || entry === name) continue;
    const candidate = join(backupRoot, entry);
    if ((await lstat(candidate)).isSymbolicLink() || outside(backupRoot, await realpath(candidate))) continue;
    const old = await readJSON(join(candidate, 'backup.json'));
    if (old.verifiedOffsite && Date.parse(old.createdAt) < Date.now() - days * 86400000) {
      // A remote copy may have been removed by its own policy. Keep local if so.
      try {
        if (await digest(join(offsiteRoot, entry, 'database.sqlite')) === old.sha256) await rm(candidate, { recursive: true });
      } catch { /* Keep this local bundle; absence of an archive is not permission to delete it. */ }
    }
  }
  console.log(bundle);
} catch { console.error('Backup production thất bại. Giữ dữ liệu và backup cũ. Kiểm tra cấu hình, offsite và dung lượng.'); process.exitCode = 1; }
finally { if (lock) await rmdir(lock); }
