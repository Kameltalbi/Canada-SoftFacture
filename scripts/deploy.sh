#!/usr/bin/env bash
# Déploiement production SoftFacture France (VPS).
# Usage : depuis la racine du repo
#   ./scripts/deploy.sh
#
# Détecte automatiquement ce qui a changé depuis le dernier pull et ne
# rebuild / redémarre que le frontend ou le backend si nécessaire.
#
# Variables optionnelles :
#   SKIP_PULL=1            — ne pas git pull
#   SKIP_MIGRATE=1         — ne pas lancer db:migrate
#   DEPLOY_FULL=1          — forcer frontend + backend
#   DEPLOY_FRONTEND_ONLY=1 — forcer frontend uniquement
#   DEPLOY_BACKEND_ONLY=1  — forcer backend uniquement
#   PUBLIC_URL=https://softfacture.fr — test health public
#   PM2_API=softfacturefrance-api
#   PM2_WEB=softfacturefrance-web

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PM2_API="${PM2_API:-softfacturefrance-api}"
PM2_WEB="${PM2_WEB:-softfacturefrance-web}"
PUBLIC_URL="${PUBLIC_URL:-https://softfacture.fr}"
API_PORT="${API_PORT:-4001}"

log() { printf '\n▶ %s\n' "$*"; }
die() { printf '\n✗ %s\n' "$*" >&2; exit 1; }

command -v pm2 >/dev/null 2>&1 || die "pm2 introuvable"
command -v npm >/dev/null 2>&1 || die "npm introuvable"
command -v curl >/dev/null 2>&1 || die "curl introuvable"

NEEDS_FRONTEND=0
NEEDS_BACKEND=0

classify_changed_file() {
  local f="$1"
  case "$f" in
    backend/*)
      NEEDS_BACKEND=1
      ;;
    src/*|public/*|next.config.*|tailwind.config.*|postcss.config.*|components.json|tsconfig.json)
      NEEDS_FRONTEND=1
      ;;
    package.json|package-lock.json)
      NEEDS_FRONTEND=1
      ;;
    scripts/deploy.sh|README*|docs/*|*.md|.github/*|.gitignore|.prettierrc*|eslint.config.*|.husky/*)
      ;;
    *)
      log "Changement hors périmètre connu : $f → déploiement complet par prudence"
      NEEDS_FRONTEND=1
      NEEDS_BACKEND=1
      ;;
  esac
}

if [[ "${DEPLOY_FULL:-0}" == "1" ]]; then
  NEEDS_FRONTEND=1
  NEEDS_BACKEND=1
elif [[ "${DEPLOY_FRONTEND_ONLY:-0}" == "1" ]]; then
  NEEDS_FRONTEND=1
elif [[ "${DEPLOY_BACKEND_ONLY:-0}" == "1" ]]; then
  NEEDS_BACKEND=1
else
  OLD_HEAD="$(git rev-parse HEAD)"

  if [[ "${SKIP_PULL:-0}" != "1" ]]; then
    log "Git pull (main)"
    git pull origin main
  fi

  NEW_HEAD="$(git rev-parse HEAD)"

  if [[ "$OLD_HEAD" == "$NEW_HEAD" ]]; then
    log "Aucun nouveau commit — rien à déployer (DEPLOY_FULL=1 pour forcer)."
    exit 0
  fi

  log "Analyse des changements ($OLD_HEAD → $NEW_HEAD)"
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    classify_changed_file "$f"
  done < <(git diff --name-only "$OLD_HEAD" "$NEW_HEAD")
fi

if [[ "$NEEDS_FRONTEND" == "0" && "$NEEDS_BACKEND" == "0" ]]; then
  log "Aucun changement applicatif (docs / script uniquement) — rien à déployer."
  exit 0
fi

if [[ "$NEEDS_FRONTEND" == "1" ]]; then
  log "Frontend : dépendances + build"
  npm install
  npm run build
else
  log "Frontend : inchangé — ignoré"
fi

if [[ "$NEEDS_BACKEND" == "1" ]]; then
  log "Backend : dépendances + migrations + build"
  ( cd backend && npm install )
  (
    cd backend
    if [[ "${SKIP_MIGRATE:-0}" != "1" ]]; then
      log "Backend : migrations base de données"
      npm run db:migrate
    else
      log "Backend : migrations ignorées (SKIP_MIGRATE=1)"
    fi
    npm run build
  )
else
  log "Backend : inchangé — ignoré"
fi

PM2_RESTART=()
if [[ "$NEEDS_BACKEND" == "1" ]]; then
  PM2_RESTART+=("$PM2_API")
fi
if [[ "$NEEDS_FRONTEND" == "1" ]]; then
  PM2_RESTART+=("$PM2_WEB")
fi

if [[ "${#PM2_RESTART[@]}" -gt 0 ]]; then
  if [[ -f "$ROOT/ecosystem.config.cjs" ]]; then
    log "PM2 via ecosystem.config.cjs (${PM2_RESTART[*]})"
    RELOAD_APPS=()
    [[ "$NEEDS_BACKEND" == "1" ]] && RELOAD_APPS+=("$PM2_API")
    [[ "$NEEDS_FRONTEND" == "1" ]] && RELOAD_APPS+=("$PM2_WEB")
    # startOrReload crée le process s'il n'existe pas ; start en secours
    if ! pm2 startOrReload "$ROOT/ecosystem.config.cjs" --update-env --only "${RELOAD_APPS[*]}"; then
      pm2 start "$ROOT/ecosystem.config.cjs" --update-env --only "${RELOAD_APPS[*]}"
    fi
  else
    log "Redémarrage PM2 (${PM2_RESTART[*]})"
    for app in "${PM2_RESTART[@]}"; do
      if pm2 describe "$app" >/dev/null 2>&1; then
        pm2 restart "$app"
      else
        die "Process PM2 « $app » introuvable — lancez: ./scripts/recover-vps.sh"
      fi
    done
  fi
  pm2 save >/dev/null 2>&1 || true
fi

log "Vérifications santé API"
LOCAL_HEALTH=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  LOCAL_HEALTH="$(curl -sf "http://127.0.0.1:${API_PORT}/health" 2>/dev/null || true)"
  if [[ -n "$LOCAL_HEALTH" ]]; then
    break
  fi
  sleep 2
done

if [[ -n "$LOCAL_HEALTH" ]]; then
  printf '  local  : %s\n' "$LOCAL_HEALTH"
elif [[ "$NEEDS_BACKEND" == "1" ]]; then
  die "API locale injoignable sur http://127.0.0.1:${API_PORT}/health — voir: pm2 logs $PM2_API --lines 50"
else
  printf '  local  : ⚠ API injoignable (backend non redémarré — vérifiez pm2 si le site ne répond pas)\n'
fi

PUBLIC_HEALTH="$(curl -sf "${PUBLIC_URL}/api/health" 2>/dev/null || true)"
if [[ -n "$PUBLIC_HEALTH" ]]; then
  printf '  public : %s\n' "$PUBLIC_HEALTH"
else
  printf '  public : ⚠ %s/api/health injoignable (nginx ?)\n' "$PUBLIC_URL"
fi

log "Déploiement terminé"
pm2 status "$PM2_API" "$PM2_WEB" 2>/dev/null || pm2 status
