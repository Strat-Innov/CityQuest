#!/usr/bin/env bash
# Runs the database integration tests against a throw-away local Postgres.
#
# Requires PostgreSQL 15+ server binaries (initdb, pg_ctl) on PATH or in
# /usr/lib/postgresql/<version>/bin. Nothing here touches a real Supabase project.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PG_BIN:$PATH"

WORK="$(mktemp -d)"
PORT="${TEST_PG_PORT:-54329}"
cleanup() {
  pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

# initdb refuses to run as root; use the postgres OS user when needed.
RUN=()
if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$WORK"
  RUN=(runuser -u postgres --)
fi

"${RUN[@]}" initdb -D "$WORK/data" -U postgres -A trust >/dev/null
"${RUN[@]}" pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null

PSQL=(psql -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/supabase_stub.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "Applying $(basename "$migration")"
  "${PSQL[@]}" -f "$migration"
done
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql" >/dev/null
# Tests use their own fixtures; start from an empty catalog.
"${PSQL[@]}" -c "truncate public.rewards, public.stations, public.audit_logs cascade;"
"${PSQL[@]}" -f "$ROOT/supabase/tests/city_quest.test.sql"
