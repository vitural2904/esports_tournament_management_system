import { createApplication } from './application.mjs';
import { configuration } from './config.mjs';

try {
  const config = configuration();
  const app = await createApplication(config);
  app.server.on('error', () => { console.error('Không mở được cổng API.'); void app.close().finally(() => process.exit(1)); });
  app.server.listen(config.port, '127.0.0.1', () => console.log(`Bracket API: http://127.0.0.1:${config.port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void app.close().then(() => process.exit(0)); });
} catch (error) { console.error(error.message); process.exitCode = 1; }
