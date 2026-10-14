#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)
CONTENT_DIR="${CONTENT_LOCAL_DIR:-${REPO_ROOT}/src/content}"
REMOTE_REPO="${WEBSITE_CONTENT_REPOSITORY:-https://github.com/ai-workspace-services/knowledge.git}"
REMOTE_BRANCH="${WEBSITE_CONTENT_REF:-main}"
REMOTE_SUBDIR="${WEBSITE_CONTENT_SUBDIR:-content/website}"

usage() {
  cat <<USAGE
Usage: $(basename "$0") pull

Environment variables:
  WEBSITE_CONTENT_REPOSITORY Git URL or local path of the Git-backed CMS repository
                            (default: https://github.com/ai-workspace-services/knowledge.git)
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
  # Fetch the requested branch/tag/SHA directly. A shallow default-branch clone
  # cannot resolve an older SHA, and creating a branch with that SHA as its name
  # silently publishes the wrong content instead of failing.
  [[ -n "${REMOTE_BRANCH}" && "${REMOTE_BRANCH}" != -* ]] || {
    echo "WEBSITE_CONTENT_REF must be a non-empty branch, tag, or commit ref" >&2
    return 1
  }
  git init -q "${TMP_DIR}/repo"
  git -C "${TMP_DIR}/repo" remote add origin "${REMOTE_REPO}"
  git -C "${TMP_DIR}/repo" fetch --depth=1 origin "${REMOTE_BRANCH}" >/dev/null 2>&1 || {
    echo "Cannot fetch requested WEBSITE_CONTENT_REF" >&2
    return 1
  }
  git -C "${TMP_DIR}/repo" checkout --detach FETCH_HEAD >/dev/null 2>&1
  if [[ "${REMOTE_BRANCH}" =~ ^[0-9a-fA-F]{40}$ ]]; then
    [[ "$(git -C "${TMP_DIR}/repo" rev-parse HEAD)" == "$(printf '%s' "${REMOTE_BRANCH}" | tr '[:upper:]' '[:lower:]')" ]] || {
      echo "Fetched website content SHA does not match WEBSITE_CONTENT_REF" >&2
      return 1
    }
  fi
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
