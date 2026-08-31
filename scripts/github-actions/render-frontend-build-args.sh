#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---github-output}"

require_env() {
  local key="$1"
  local value="${!key-}"
  if [[ -z "${value}" ]]; then
    echo "Missing required environment variable: ${key}" >&2
    exit 1
  fi
}

emit_lines() {
  require_env CANONICAL_DOMAIN

  local canonical_domain="${CANONICAL_DOMAIN}"
  local release_image_ref="${IMAGE_REF-}"
  local release_image_tag=""
  local release_commit=""
  local release_version=""

  if [[ -n "${release_image_ref}" ]]; then
    release_image_tag="$(printf '%s' "${release_image_ref}" | sed -E 's#^.*:([^:@]+)$#\1#')"
    release_version="${release_image_tag}"

    if [[ "${release_image_tag}" =~ ^sha-([0-9a-f]{7,40})$ ]]; then
      release_commit="${BASH_REMATCH[1]}"
    elif [[ "${release_image_tag}" =~ ^[0-9a-f]{7,40}$ ]]; then
      release_commit="${release_image_tag}"
    fi
  fi

  printf 'NODE_BUILDER_IMAGE=%s\n' "${NODE_BUILDER_IMAGE:-node:22-bookworm}"
  printf 'NODE_RUNTIME_IMAGE=%s\n' "${NODE_RUNTIME_IMAGE:-node:22-slim}"
  printf 'CONTENTLAYER_BUILD=%s\n' "${CONTENTLAYER_BUILD:-true}"
  printf 'NEXT_PUBLIC_APP_BASE_URL=%s\n' "${NEXT_PUBLIC_APP_BASE_URL:-https://${canonical_domain}}"
  printf 'NEXT_PUBLIC_SITE_URL=%s\n' "${NEXT_PUBLIC_SITE_URL:-https://${canonical_domain}}"
  printf 'NEXT_PUBLIC_LOGIN_URL=%s\n' "${NEXT_PUBLIC_LOGIN_URL:-https://${canonical_domain}/login}"
  printf 'NEXT_PUBLIC_DOCS_BASE_URL=%s\n' "${NEXT_PUBLIC_DOCS_BASE_URL:-https://${canonical_domain}/docs}"
  printf 'NEXT_PUBLIC_RUNTIME_ENVIRONMENT=%s\n' "${NEXT_PUBLIC_RUNTIME_ENVIRONMENT:-prod}"
  printf 'NEXT_PUBLIC_RUNTIME_REGION=%s\n' "${NEXT_PUBLIC_RUNTIME_REGION:-cn}"
  printf 'NEXT_PUBLIC_GISCUS_REPO=%s\n' "${NEXT_PUBLIC_GISCUS_REPO:-x-evor/console.svc.plus}"
  printf 'NEXT_PUBLIC_GISCUS_REPO_ID=%s\n' "${NEXT_PUBLIC_GISCUS_REPO_ID-}"
  printf 'NEXT_PUBLIC_GISCUS_CATEGORY=%s\n' "${NEXT_PUBLIC_GISCUS_CATEGORY:-General}"
  printf 'NEXT_PUBLIC_GISCUS_CATEGORY_ID=%s\n' "${NEXT_PUBLIC_GISCUS_CATEGORY_ID-}"
  printf 'NEXT_PUBLIC_PAYPAL_CLIENT_ID=%s\n' "${NEXT_PUBLIC_PAYPAL_CLIENT_ID-}"
  printf 'NEXT_PUBLIC_RELEASE_IMAGE=%s\n' "${release_image_ref}"
  printf 'NEXT_PUBLIC_RELEASE_TAG=%s\n' "${release_image_tag}"
  printf 'NEXT_PUBLIC_RELEASE_COMMIT=%s\n' "${release_commit}"
  printf 'NEXT_PUBLIC_RELEASE_VERSION=%s\n' "${release_version}"
}

if [[ "${MODE}" == "--stdout" ]]; then
  emit_lines
  exit 0
fi

if [[ -z "${GITHUB_OUTPUT-}" ]]; then
  echo "GITHUB_OUTPUT is not set" >&2
  exit 1
fi

{
  echo "build_args<<EOF"
  emit_lines
  echo "EOF"
} >> "${GITHUB_OUTPUT}"
