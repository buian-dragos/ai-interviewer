#!/bin/sh
set -eu

if [ -z "${SUPABASE_DATABASE_URL:-}" ]; then
  echo "Error: SUPABASE_DATABASE_URL must be set in api/.env" >&2
  exit 1
fi

echo "Ensuring migration tracking table exists..."
psql "$SUPABASE_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

for migration in /migrations/*.sql; do
  if [ ! -f "$migration" ]; then
    continue
  fi

  filename=$(basename "$migration")
  applied=$(
    psql "$SUPABASE_DATABASE_URL" -tAc \
      "SELECT 1 FROM public.schema_migrations WHERE filename = '${filename}'"
  )

  if [ "$applied" = "1" ]; then
    echo "Skipping ${filename} (already applied)"
    continue
  fi

  echo "Applying ${filename}..."
  psql "$SUPABASE_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
  psql "$SUPABASE_DATABASE_URL" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO public.schema_migrations (filename) VALUES ('${filename}')"
done

echo "Migrations complete."
