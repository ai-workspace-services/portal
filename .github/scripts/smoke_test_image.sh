#!/usr/bin/env bash
set -euo pipefail

TARGET="${TARGET:?TARGET must be set}"
CONTAINER_PORT="${CONTAINER_PORT:?CONTAINER_PORT must be set}"

container="portal-${TARGET}-validation"
docker run --rm -d \
  --name "$container" \
  -p "18080:${CONTAINER_PORT}" \
  -e RUNTIME_ENV=prod \
  -e REGION=cn \
  "portal-${TARGET}:validation"
trap 'docker stop "$container" >/dev/null 2>&1 || true' EXIT

for attempt in $(seq 1 30); do
  if curl --fail --silent --output /dev/null http://127.0.0.1:18080/; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    docker logs "$container"
    exit 1
  fi
  sleep 1
done

curl --fail --silent --output /dev/null http://127.0.0.1:18080/
if [ "$TARGET" = "static-dashboard" ]; then
  test "$(curl --silent --output /dev/null --write-out '%{http_code}' http://127.0.0.1:18080/api/ping)" = "404"
else
  curl --fail --silent http://127.0.0.1:18080/api/ping | grep '"status":"ok"'
fi
