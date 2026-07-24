#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG_INPUT="${1-}"
IMAGE_TAG="${IMAGE_TAG_INPUT}"
if [[ -z "${IMAGE_TAG}" ]]; then
  # 跨仓契约: sha tag 一律 sha-<40 位全长, 与 docker/metadata-action 的
  # type=sha,format=long 默认输出一致。裸 ${GITHUB_SHA} 与 sha-${GITHUB_SHA}
  # 是两个不同的 tag, 混用会让同一个 deploy_tag 在部分仓库落空。
  # 见 platform-ops-toolkit docs/domains/IMAGE-TAG-CONTRACT.md
  IMAGE_TAG="sha-${GITHUB_SHA:?GITHUB_SHA is required}"
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
