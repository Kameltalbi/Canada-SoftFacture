#!/usr/bin/env bash
# Démarre l'API en prod : charge backend/.env et force PORT=4001 (nginx).
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -f .env ]]; then set -a; source .env; set +a; fi
export NODE_ENV=production
export PORT=4001
exec node dist/server.js
