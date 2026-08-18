#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)
CONTENT_DIR="${CONTENT_LOCAL_DIR:-${REPO_ROOT}/src/content}"
REMOTE_REPO="${WEBSITE_CONTENT_REPOSITORY:-https://github.com/haitaopanhq/knowledge.git}"
REMOTE_BRANCH="${WEBSITE_CONTENT_REF:-main}"
REMOTE_SUBDIR="${WEBSITE_CONTENT_SUBDIR:-content/website}"

usage() {
  cat <<USAGE
Usage: $(basename "$0") pull

Environment variables:
  WEBSITE_CONTENT_REPOSITORY Git URL or local path of the Git-backed CMS repository
                            (default: https://github.com/haitaopanhq/knowledge.git)
  WEBSITE_CONTENT_REF        Branch, tag, or commit ref to sync (default: main)
  WEBSITE_CONTENT_SUBDIR     Directory inside the CMS repository (default: content/website)
  CONTENT_LOCAL_DIR          Local target directory (default: src/content)

USAGE
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

MODE="$1"

if [[ "${REMOTE_SUBDIR}" == /* || "${REMOTE_SUBDIR}" == *".."* ]]; then
  echo "WEBSITE_CONTENT_SUBDIR must be a relative path inside the CMS repository" >&2
  exit 1
fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "${TMP_DIR}"' EXIT

clone_repo() {
  git clone --depth=1 --branch "${REMOTE_BRANCH}" "${REMOTE_REPO}" "${TMP_DIR}/repo" >/dev/null 2>&1 || \
    git clone --depth=1 "${REMOTE_REPO}" "${TMP_DIR}/repo"
  (cd "${TMP_DIR}/repo" && git checkout "${REMOTE_BRANCH}" >/dev/null 2>&1 || git checkout -b "${REMOTE_BRANCH}")
}

sync_pull() {
  clone_repo
  if [[ ! -d "${TMP_DIR}/repo/${REMOTE_SUBDIR}" ]]; then
    echo "Remote repository does not contain ${REMOTE_SUBDIR}" >&2
    exit 1
  fi
  if [[ ! -f "${TMP_DIR}/repo/${REMOTE_SUBDIR}/content-manifest.yaml" ]]; then
    echo "CMS source is missing ${REMOTE_SUBDIR}/content-manifest.yaml" >&2
    exit 1
  fi
  mkdir -p "${CONTENT_DIR}"
  rsync -a --delete "${TMP_DIR}/repo/${REMOTE_SUBDIR}/" "${CONTENT_DIR}/"
}

case "${MODE}" in
  pull)
    sync_pull
    ;;
  *)
    usage
    exit 1
    ;;
esac
