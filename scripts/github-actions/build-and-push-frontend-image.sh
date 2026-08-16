#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

require_env() {
  local key="$1"
  local value="${!key-}"
  if [[ -z "${value}" ]]; then
    echo "Missing required environment variable: ${key}" >&2
    exit 1
  fi
}

require_env IMAGE_REF
require_env CANONICAL_DOMAIN

sync_website_content() {
  if [[ -z "${WEBSITE_CONTENT_REPOSITORY:-}" ]]; then
    if [[ "${REQUIRE_EXTERNAL_WEBSITE_CONTENT:-false}" == "true" ]]; then
      echo "WEBSITE_CONTENT_REPOSITORY is required for this build" >&2
      exit 1
    fi
    echo "Using website content bundled with the Portal checkout"
    return
  fi

  echo "Synchronizing website content from the Git backend"
  (
    cd "${REPO_ROOT}"
    bash scripts/sync-content.sh pull
  )
}

sync_website_content

BUILD_ARGS_FILE="$(mktemp)"
trap 'rm -f "${BUILD_ARGS_FILE}"' EXIT

"${SCRIPT_DIR}/render-frontend-build-args.sh" --stdout > "${BUILD_ARGS_FILE}"

build_args=()
while IFS= read -r line; do
  if [[ -z "${line}" ]]; then
    continue
  fi
  build_args+=(--build-arg "${line}")
done < "${BUILD_ARGS_FILE}"

tag_args=(--tag "${IMAGE_REF}")
if [[ "${PUSH_LATEST:-false}" == "true" ]]; then
  require_env IMAGE_LATEST_REF
  tag_args+=(--tag "${IMAGE_LATEST_REF}")
fi

dockerfile="${DOCKERFILE:-${REPO_ROOT}/Dockerfile}"
if [[ "${dockerfile}" != /* ]]; then
  dockerfile="${REPO_ROOT}/${dockerfile}"
fi

docker buildx build \
  --platform "${DOCKER_PLATFORM:-linux/amd64}" \
  --file "${dockerfile}" \
  "${tag_args[@]}" \
  "${build_args[@]}" \
  --push \
  "${REPO_ROOT}"
