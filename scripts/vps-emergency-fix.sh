#!/usr/bin/env bash
# Réparation d'urgence VPS — fonctionne SANS git pull.
# Usage : bash /var/www/softfacturefrance/scripts/vps-emergency-fix.sh

set -euo pipefail

ROOT="/var/www/softfacturefrance"
cd "$ROOT"

echo "=== 1. Migration base de données ==="
if [[ -f backend/.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source backend/.env 2>/dev/null || true
  set +a
fi

if [[ -d backend/prisma/migrations ]]; then
  echo "Via prisma migrate deploy..."
  (cd backend && npm run db:migrate) || echo "WARN: prisma migrate échoué"
elif [[ -n "${DATABASE_URL:-}" ]] && command -v psql >/dev/null 2>&1; then
  # psql ne comprend pas ?schema=public (format Prisma)
  PSQL_URL="${DATABASE_URL%%\?*}"
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 <<'SQL'
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "applyVat" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "applyFiscalStamp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "fiscalStamp" DECIMAL(14,3) NOT NULL DEFAULT 1.000;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "discountEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "discountRate" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "showCurrencyOnLines" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "applyVat" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "applyFiscalStamp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "fiscalStamp" DECIMAL(14,3) NOT NULL DEFAULT 1.000;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "discountEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "discountRate" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "showCurrencyOnLines" BOOLEAN NOT NULL DEFAULT true;
SQL
  echo "Migration SQL OK"
else
  echo "WARN: ni prisma/migrations ni psql — migration ignorée"
fi

echo "=== 2. Build API ==="
( cd backend && npm install && npm run build )
test -f backend/dist/server.js || { echo "ERREUR: backend/dist/server.js absent"; exit 1; }

echo "=== 3. Démarrage API sur port 4001 ==="
pm2 delete softfacturefrance-api 2>/dev/null || true

if [[ -f ecosystem.config.cjs ]]; then
  pm2 start ecosystem.config.cjs --only softfacturefrance-api --update-env
elif [[ -f backend/scripts/start-prod.sh ]]; then
  pm2 start backend/scripts/start-prod.sh --name softfacturefrance-api --interpreter bash
else
  cd backend
  PORT=4001 NODE_ENV=production pm2 start dist/server.js --name softfacturefrance-api
  cd "$ROOT"
fi

pm2 save

echo "=== 4. Vérification ==="
sleep 4
curl -sf http://127.0.0.1:4001/health && echo "" || {
  echo "API toujours down — logs :"
  pm2 logs softfacturefrance-api --lines 30 --nostream
  exit 1
}

echo "=== OK — rafraîchissez https://softfacture.fr ==="
pm2 status
