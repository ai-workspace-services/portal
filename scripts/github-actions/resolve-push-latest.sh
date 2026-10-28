#!/usr/bin/env bash
set -euo pipefail

ref="${REF:?REF is required}"

if [[ "${ref}" == "refs/heads/main" && "${FEATURE_SIT:-false}" != true ]]; then
  echo "push_latest=true" >> "${GITHUB_OUTPUT}"
else
  echo "push_latest=false" >> "${GITHUB_OUTPUT}"
fi
