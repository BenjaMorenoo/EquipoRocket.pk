#!/usr/bin/env bash
NET="equiporocket-net"
set -e

if docker network inspect "$NET" >/dev/null 2>&1; then
  echo "Docker network '$NET' already exists."
  exit 0
fi

docker network create "$NET"
echo "Created Docker network '$NET'."
