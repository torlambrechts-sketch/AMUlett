#!/usr/bin/env bash
# Apply all SQL files in supabase/migrations/ in lexical order.
# Requires a direct Postgres URL (not the anon key). Example:
#   export POSTGRES_URL_NON_POOLING="postgres://postgres.[ref]:PASSWORD@...:5432/postgres?sslmode=require"
#   ./scripts/apply-migrations.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"

if [[ -z "${POSTGRES_URL_NON_POOLING:-}" && -z "${DATABASE_URL:-}" ]]; then
  echo "Set POSTGRES_URL_NON_POOLING or DATABASE_URL to your Supabase direct Postgres connection string." >&2
  echo "Supabase: Project Settings → Database → Connection string → URI (use port 5432, not pooler)." >&2
  exit 1
fi

URL="${POSTGRES_URL_NON_POOLING:-${DATABASE_URL}}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install postgresql-client (e.g. apt install postgresql-client)." >&2
  exit 1
fi

shopt -s nullglob
files=( "$MIGRATIONS"/*.sql )
IFS=$'\n' files=( $(printf '%s\n' "${files[@]}" | sort) )

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No migration files in $MIGRATIONS" >&2
  exit 1
fi

for f in "${files[@]}"; do
  echo "Applying: $(basename "$f")"
  psql "$URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "Done. Applied ${#files[@]} file(s)."
