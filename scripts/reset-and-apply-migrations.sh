#!/usr/bin/env bash
# Wipes public schema, then applies every file in supabase/migrations/ in order.
# Use when ALL_MIGRATIONS.sql fails with "already exists" on an existing project.
#
#   export POSTGRES_URL_NON_POOLING="postgres://postgres:...@db....supabase.co:5432/postgres?sslmode=require"
#   ./scripts/reset-and-apply-migrations.sh
#
# WARNING: Deletes all application data in public (organizations, wiki, tasks, …).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESET_SQL="$ROOT/supabase/reset_public_schema.sql"

if [[ -z "${POSTGRES_URL_NON_POOLING:-}" && -z "${DATABASE_URL:-}" ]]; then
  echo "Set POSTGRES_URL_NON_POOLING or DATABASE_URL." >&2
  exit 1
fi

URL="${POSTGRES_URL_NON_POOLING:-${DATABASE_URL}}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install postgresql-client." >&2
  exit 1
fi

echo ">>> Resetting public schema (DESTRUCTIVE)..."
psql "$URL" -v ON_ERROR_STOP=1 -f "$RESET_SQL"

echo ">>> Applying migrations..."
exec "$ROOT/scripts/apply-migrations.sh"
