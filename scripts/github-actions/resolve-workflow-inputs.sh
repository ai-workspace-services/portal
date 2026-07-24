#!/usr/bin/env bash
set -euo pipefail

event_name="${EVENT_NAME:?EVENT_NAME is required}"
input_environment="${INPUT_ENVIRONMENT:-}"
ref_name="${REF_NAME:-}"

if [[ "${event_name}" == "workflow_dispatch" ]]; then
  environment="${input_environment:-uat}"
else
  if [[ "${ref_name}" == "main" ]]; then
    environment="uat"
  elif [[ "${ref_name}" == release/* || "${REF_TYPE:-}" == "tag" ]]; then
    environment="prod"
  else
    environment="dev"
  fi
fi

case "${environment}" in
  dev|uat|prod)
    ;;
  *)
    echo "Unsupported deployment environment: ${environment}. Use dev, uat, or prod." >&2
    exit 1
    ;;
esac

printf 'deployment_environment=%s\n' "${environment}" >> "${GITHUB_OUTPUT}"
