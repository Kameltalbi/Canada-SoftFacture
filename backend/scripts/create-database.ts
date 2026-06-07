/**
 * Crée la base PostgreSQL nommée dans DATABASE_URL si elle n'existe pas encore.
 * Se connecte à la base système `postgres` avec les mêmes identifiants.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: path.join(backendRoot, '.env') });
loadEnv({ path: path.join(backendRoot, '.env.local'), override: true });

const target = process.env.DATABASE_URL?.trim();
if (!target) {
  console.error('DATABASE_URL est absent (voir backend/.env.example).');
  process.exit(1);
}

function extractDbName(urlStr: string): string {
  const noQuery = urlStr.split('?')[0] ?? urlStr;
  const parts = noQuery.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) throw new Error('Impossible de déduire le nom de la base depuis DATABASE_URL.');
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(last)) {
    throw new Error(
      `Nom de base « ${last} » : utilisez un identifiant PostgreSQL (lettre puis lettres/chiffres/_). Créez la base manuellement si besoin.`
    );
  }
  return last;
}

function connectionToPostgresDb(urlStr: string): string {
  const dbName = extractDbName(urlStr);
  return urlStr.replace(
    new RegExp(`/${dbName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?|$)`),
    '/postgres$1'
  );
}

async function main() {
  const dbName = extractDbName(target);
  const adminUrl = connectionToPostgresDb(target);
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    const { rows } = await client.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists',
      [dbName]
    );
    if (rows[0]?.exists) {
      console.log(`La base « ${dbName} » existe déjà.`);
      return;
    }
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`Base « ${dbName} » créée. Lancez : npx prisma migrate deploy && npm run db:seed`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
