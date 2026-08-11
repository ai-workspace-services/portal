#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG_INPUT="${1-}"
IMAGE_TAG="${IMAGE_TAG_INPUT}"
if [[ -z "${IMAGE_TAG}" ]]; then
  if [[ "${REF_TYPE:-${GITHUB_REF_TYPE:-}}" == "tag" || "${GITHUB_REF:-}" == refs/tags/* ]]; then
    IMAGE_TAG="${REF_NAME:-${GITHUB_REF_NAME:-${GITHUB_REF#refs/tags/}}}"
  else
    IMAGE_TAG="sha-${GITHUB_SHA:?GITHUB_SHA is required}"
  fi
fi

GHCR_NAMESPACE="${GITHUB_REPOSITORY_OWNER,,}"
GHCR_REGISTRY="${GHCR_REGISTRY:-ghcr.io}"

if [[ -z "${GITHUB_OUTPUT-}" ]]; then
  echo "GITHUB_OUTPUT is not set" >&2
  exit 1
fi

{
  printf 'ghcr_namespace=%s\n' "${GHCR_NAMESPACE}"
  printf 'image_tag=%s\n' "${IMAGE_TAG}"
  printf 'image_ref=%s/%s/console:%s\n' "${GHCR_REGISTRY}" "${GHCR_NAMESPACE}" "${IMAGE_TAG}"
  printf 'image_latest_ref=%s/%s/console:latest\n' "${GHCR_REGISTRY}" "${GHCR_NAMESPACE}"
} >> "${GITHUB_OUTPUT}"
