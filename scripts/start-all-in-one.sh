#!/usr/bin/env bash
set -euo pipefail

# Docker injects HOSTNAME with the container ID. Next standalone treats that
# value as a bind address, which makes 127.0.0.1 unavailable to local Nginx.
HOSTNAME=0.0.0.0 node server.js &
frontend_server_pid=$!

nginx -g 'daemon off;' &
nginx_pid=$!

shutdown() {
  kill -TERM "$frontend_server_pid" "$nginx_pid" 2>/dev/null || true
  wait "$frontend_server_pid" "$nginx_pid" 2>/dev/null || true
}

trap shutdown EXIT INT TERM

wait -n "$frontend_server_pid" "$nginx_pid"
