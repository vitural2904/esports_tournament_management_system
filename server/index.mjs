import { resolve } from 'node:path';
import { createApplication } from './application.mjs';

const port = Number(process.env.API_PORT || 3001);
const app = await createApplication({ databasePath: resolve(process.env.DATABASE_PATH || 'data/bracket.sqlite'), allowedOrigins: ['http://127.0.0.1:5173', 'http://localhost:5173'] });
app.server.listen(port, '127.0.0.1', () => console.log(`Bracket API: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void app.close().then(() => process.exit(0)); });
