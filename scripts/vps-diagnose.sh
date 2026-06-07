#!/usr/bin/env bash
# Diagnostic VPS — coller sur le serveur : bash scripts/vps-diagnose.sh
set -uo pipefail
ROOT="${ROOT:-/var/www/softfacturefrance}"
cd "$ROOT" 2>/dev/null || { echo "✗ $ROOT introuvable"; exit 1; }

echo "========== PM2 =========="
pm2 status 2>/dev/null || echo "pm2 non disponible"

echo ""
echo "========== Fichiers =========="
for f in backend/.env backend/dist/server.js ecosystem.config.cjs .env; do
  [[ -f "$f" ]] && echo "OK  $f" || echo "MANQUANT  $f"
done

echo ""
echo "========== Ports API (4000 / 4001) =========="
for p in 4000 4001; do
  code=$(curl -sf -o /dev/null -w '%{http_code}' "http://127.0.0.1:${p}/health" 2>/dev/null || echo "000")
  echo "  :${p}/health → HTTP ${code}"
done

echo ""
echo "========== Nginx proxy_pass =========="
grep -r "proxy_pass" /etc/nginx/sites-enabled/ 2>/dev/null | grep -E "4000|4001|3000|api" || echo "(non trouvé)"

echo ""
echo "========== Dernières lignes logs API =========="
pm2 logs softfacturefrance-api --lines 15 --nostream 2>/dev/null || echo "(pas de logs)"

echo ""
echo "========== Test public =========="
curl -sf -o /dev/null -w "  softfacture.fr/api/health → HTTP %{http_code}\n" https://softfacture.fr/api/health 2>/dev/null || echo "  curl public échoué"
