import { resolve, isAbsolute } from 'node:path';
import { createApplication } from '../server/application.mjs';

let app;
try {
  const databasePath = process.argv[2];
  if (!databasePath || !isAbsolute(databasePath)) throw new Error('Dùng: node scripts/initialize-admin.mjs <database-tuyệt-đối>; JSON username/displayName/password qua stdin riêng tư.');
  if (process.stdin.isTTY) throw new Error('Nhập JSON qua stdin riêng tư. Không truyền mật khẩu trong tham số lệnh.');
  const chunks = []; let length = 0;
  for await (const chunk of process.stdin) { length += chunk.length; if (length > 32768) throw new Error('Dữ liệu quá lớn.'); chunks.push(chunk); }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new Error('JSON không hợp lệ.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dữ liệu không hợp lệ.');
  app = await createApplication({ databasePath: resolve(databasePath), allowSetup: false });
  await app.initializeAdmin(body);
  console.log('Đã tạo quản trị đầu tiên. Không mở cổng mạng.');
} catch (error) { console.error(error.status || !app ? error.message : 'Không tạo được quản trị.'); process.exitCode = 1; }
finally { if (app) await app.close(); }
