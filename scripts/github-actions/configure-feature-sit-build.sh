#!/usr/bin/env bash
set -euo pipefail

host="${SIT_HOSTNAME:-}"
content_sha="${SIT_CONTENT_SHA:-}"
[[ "${SIT_ENVIRONMENT:-}" == sit ]] || { echo 'Feature build requires SIT environment' >&2; exit 1; }
[[ "${GITHUB_EVENT_NAME:-}" == workflow_dispatch && "${GITHUB_REF:-}" == refs/heads/main ]] || { echo 'Feature build requires Main dispatch' >&2; exit 1; }
[[ "$host" =~ ^[a-z0-9]+(-[a-z0-9]+)*-sit\.onwalk\.net$ ]] || { echo 'Invalid SIT hostname' >&2; exit 1; }
label="${host%.onwalk.net}"
(( ${#label} <= 54 )) || { echo 'SIT service hostname too long' >&2; exit 1; }
[[ "$content_sha" =~ ^[0-9a-f]{40}$ ]] || { echo 'Content must be a full fixed SHA' >&2; exit 1; }
{
  printf 'CANONICAL_DOMAIN=%s\n' "$host"
  printf 'SERVED_DOMAINS=%s\n' "$host"
  printf 'APP_BASE_URL=https://%s\n' "$host"
  printf 'NEXT_PUBLIC_APP_BASE_URL=https://%s\n' "$host"
  printf 'NEXT_PUBLIC_SITE_URL=https://%s\n' "$host"
  printf 'NEXT_PUBLIC_LOGIN_URL=https://%s/login\n' "$host"
  printf 'NEXT_PUBLIC_DOCS_BASE_URL=https://%s/docs\n' "$host"
  printf 'RUNTIME_HOSTNAME=%s\n' "$host"
  printf 'NEXT_RUNTIME_HOSTNAME=%s\n' "$host"
  printf 'ACCOUNT_SERVICE_URL=https://accounts-%s\n' "$host"
  printf 'WEBSITE_CONTENT_REF=%s\n' "$content_sha"
} >> "${GITHUB_ENV:?GITHUB_ENV is required}"
