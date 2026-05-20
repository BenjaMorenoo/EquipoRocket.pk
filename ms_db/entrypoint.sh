#!/usr/bin/env bash
set -euo pipefail

# Wait for Postgres to be reachable
host="${PGHOST:-postgres}"
port="${PGPORT:-5432}"

echo "Waiting for Postgres at ${host}:${port}..."
# Wait loop using bash /dev/tcp (avoids needing nc/netcat in the image)
while ! bash -c "cat < /dev/tcp/${host}/${port}" >/dev/null 2>&1; do
  echo "Postgres not ready, sleeping..."
  sleep 1
done

echo "Postgres reachable, running DB init (idempotent)..."
# Run the init script (idempotent)
npm run init-db || true

echo "Starting ms_db server"
# Exec the CMD (node server.js)
exec "$@"
