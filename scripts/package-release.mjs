import { cp, mkdir, stat, chmod } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { schemaVersion } from '../server/migrations.mjs';
import { writeJSON } from './production-files.mjs';

try {
  const [destination, releaseId] = process.argv.slice(2);
  if (!destination || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(releaseId || '')) throw new Error('Dùng: node scripts/package-release.mjs <thư-mục-mới> <release-id>. Build trước.');
  await stat('dist/index.html');
  const root = resolve(destination);
  await mkdir(root, { recursive: false });
  // Explicit allowlist excludes databases, secrets and dependencies for the wrong OS.
  for (const name of ['dist', 'server', 'shared', 'scripts', 'deploy', 'package.json', 'package-lock.json', '.env.example']) await cp(resolve(name), join(root, name), { recursive: true, errorOnExist: true, force: false });
  await cp(resolve('docs/operations'), join(root, 'docs/operations'), { recursive: true });
  await writeJSON(join(root, 'release.json'), { releaseId, schemaVersion, nodeVersion: '22.19.0', createdAt: new Date().toISOString() });
  await chmod(join(root, 'release.json'), 0o644);
  console.log(root);
} catch { console.error('Không đóng gói được. Cần build, release-id hợp lệ và thư mục đích mới.'); process.exitCode = 1; }
