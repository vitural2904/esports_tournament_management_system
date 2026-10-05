import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
export { outside } from '../shared/paths.mjs';

export async function digest(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
export const readJSON = async path => JSON.parse(await readFile(path, 'utf8'));
export const writeJSON = (path, data) => writeFile(path, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
