import { createApplication } from '../server/application.mjs';
import { configuration } from '../server/config.mjs';

let app;
try {
  app = await createApplication(configuration());
  await app.close(); app = undefined;
  console.log('Database tương thích. Migration hoàn tất. Không mở cổng API.');
} catch { console.error('Bản mới không dùng được database. Dịch vụ phải dừng. Chọn cặp app/backup tương thích.'); process.exitCode = 1; }
finally { if (app) await app.close(); }
