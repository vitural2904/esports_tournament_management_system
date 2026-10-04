import { DatabaseSync } from 'node:sqlite';
import { copyDatabase } from './database-copy.mjs';

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error('Dùng: node scripts/restore.mjs <backup> <database-mới>');
const path = await copyDatabase(source, destination);
const restored = new DatabaseSync(path);
try { restored.exec('DELETE FROM sessions'); }
finally { restored.close(); }
console.log(`Đã phục hồi vào file mới: ${path}. Cần đăng nhập lại.`);
