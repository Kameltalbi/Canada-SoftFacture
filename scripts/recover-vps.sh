#!/usr/bin/env bash
# Remise en route complète du VPS (502 sur tout le site).
# Usage : cd /var/www/softfacturefrance && ./scripts/recover-vps.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

API_PORT="${API_PORT:-4001}"
WEB_PORT="${WEB_PORT:-3000}"

log() { printf '\n▶ %s\n' "$*"; }
die() { printf '\n✗ %s\n' "$*" >&2; exit 1; }

command -v pm2 >/dev/null 2>&1 || die "pm2 introuvable"
command -v npm >/dev/null 2>&1 || die "npm introuvable"
command -v curl >/dev/null 2>&1 || die "curl introuvable"

[[ -f "$ROOT/ecosystem.config.cjs" ]] || die "ecosystem.config.cjs absent — lancez: git pull origin main"
[[ -f "$ROOT/backend/.env" ]] || die "backend/.env absent (DATABASE_URL, JWT_SECRET requis)"

log "Backend : install + migrations + build"
( cd backend && npm install && npm run db:migrate && npm run build )
[[ -f "$ROOT/backend/dist/server.js" ]] || die "Build API échoué (dist/server.js absent)"

log "Frontend : install + build"
npm install
npm run build

log "PM2 : démarrage propre"
pm2 delete softfacturefrance-api softfacturefrance-web 2>/dev/null || true
pm2 start "$ROOT/ecosystem.config.cjs" --update-env
pm2 save

log "Attente démarrage (6 s)"
sleep 6

log "Contrôles locaux"
API_HEALTH="$(curl -sf "http://127.0.0.1:${API_PORT}/health" 2>/dev/null || true)"
if [[ -z "$API_HEALTH" ]]; then
  pm2 logs softfacturefrance-api --lines 40 --nostream || true
  die "API injoignable sur :${API_PORT} — voir logs ci-dessus"
fi
printf '  API  : %s\n' "$API_HEALTH"

WEB_CODE="$(curl -sf -o /dev/null -w '%{http_code}' "http://127.0.0.1:${WEB_PORT}/" 2>/dev/null || echo '000')"
if [[ "$WEB_CODE" != "200" && "$WEB_CODE" != "307" && "$WEB_CODE" != "308" ]]; then
  pm2 logs softfacturefrance-web --lines 40 --nostream || true
  die "Frontend injoignable sur :${WEB_PORT} (HTTP ${WEB_CODE}) — voir logs ci-dessus"
fi
printf '  Web  : HTTP %s\n' "$WEB_CODE"

log "Statut PM2"
pm2 status

printf '\n✓ Site remis en route. Testez https://softfacture.fr\n'
