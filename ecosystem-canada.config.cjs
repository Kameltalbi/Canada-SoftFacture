/** PM2 — SoftFacture Canada (ports 3100 / 4100). Ne pas confondre avec France. */
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

module.exports = {
  apps: [
    {
      name: 'softfacture-canada-api',
      cwd: './backend',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        ...backendEnv,
        NODE_ENV: 'production',
        PORT: '4100',
      },
    },
    {
      name: 'softfacture-canada-web',
      cwd: '.',
      script: '.next/standalone/server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '768M',
      env: {
        ...rootEnv,
        NODE_ENV: 'production',
        PORT: '3100',
        HOSTNAME: '127.0.0.1',
      },
    },
  ],
};
