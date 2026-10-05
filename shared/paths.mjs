import { isAbsolute, relative, sep } from 'node:path';

export function outside(root, path) {
  const location = relative(root, path);
  return location === '..' || location.startsWith(`..${sep}`) || isAbsolute(location);
}
