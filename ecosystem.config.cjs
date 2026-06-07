/** PM2 production — charge backend/.env et force PORT=4001 (nginx). */
const path = require('path');
const fs = require('fs');

function loadDotEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const root = __dirname;
const backendEnv = loadDotEnv(path.join(root, 'backend', '.env'));
const rootEnv = loadDotEnv(path.join(root, '.env'));

const apiEnv = {
  ...backendEnv,
  NODE_ENV: 'production',
  PORT: '4001',
};

const webEnv = {
  ...rootEnv,
  NODE_ENV: 'production',
  PORT: '3000',
};

module.exports = {
  apps: [
    {
      name: 'softfacturefrance-api',
      cwd: './backend',
      script: 'scripts/start-prod.sh',
      interpreter: 'bash',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: apiEnv,
    },
    {
      name: 'softfacturefrance-web',
      cwd: '.',
      script: '.next/standalone/server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '768M',
      env: webEnv,
    },
  ],
};
