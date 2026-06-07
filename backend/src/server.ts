import './loadEnv.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { env } from './lib/env.js';
import { ensureOrgLogosDir } from './lib/orgLogoStorage.js';

const port = Number(env.PORT);
const app = createApp();

void ensureOrgLogosDir().catch((err) => {
  logger.warn({ err }, 'Impossible de créer le dossier uploads/logos au démarrage');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
});

app.listen(port, () => {
  logger.info(`SoftFacture France API → http://localhost:${port}`);
  logger.info(`Health: http://localhost:${port}/health`);
});
