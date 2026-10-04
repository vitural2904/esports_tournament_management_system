import { copyDatabase } from './database-copy.mjs';

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error('Dùng: node scripts/backup.mjs <database> <file-backup-mới>');
console.log(`Đã sao lưu: ${await copyDatabase(source, destination)}`);
