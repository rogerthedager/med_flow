#!/usr/bin/env bash
# Run from any directory: bash bin/seed.sh [local|rds]
set -euo pipefail

TARGET="${1:-local}"
case "$TARGET" in
  local)
    export DATABASE_URL="${DATABASE_URL:-postgresql+asyncpg://postgres:postgres@localhost:5432/medflow_dev}"
    ;;
  rds)
    : "${DATABASE_URL:?Set DATABASE_URL to your PostgreSQL asyncpg URL before seeding RDS.}"
    ;;
  *)
    echo "Invalid target. Use local or rds." >&2
    exit 1
    ;;
esac

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR/backend"
if [[ -x .venv/Scripts/python.exe ]]; then
  PYTHON_BIN=.venv/Scripts/python.exe
elif [[ -x .venv/bin/python ]]; then
  PYTHON_BIN=.venv/bin/python
else
  PYTHON_BIN=python
fi

echo "Seeding MedFlow coverage fixtures ($TARGET)"
"$PYTHON_BIN" -m scripts.seed_coverage
