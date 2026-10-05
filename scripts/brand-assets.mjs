import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

// Format/size conversions only. The transparent masters were made with imagegen.
await sharp('public/brand/landing-original.jpg').webp({ quality: 88 }).toFile('public/brand/landing.webp');
for (const size of [16, 32, 48, 64, 180, 192, 512]) {
  await sharp('public/brand/chv-mark.png').resize(size, size).png().toFile(`public/brand/icon-${size}.png`);
}

const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(size => sharp('public/brand/chv-mark.png').resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile('public/favicon.ico', Buffer.concat([header, ...frames]));
