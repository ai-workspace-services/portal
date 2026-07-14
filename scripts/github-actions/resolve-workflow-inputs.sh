#!/usr/bin/env bash
set -euo pipefail

event_name="${EVENT_NAME:?EVENT_NAME is required}"
input_target_host="${INPUT_TARGET_HOST:-}"
input_run_apply="${INPUT_RUN_APPLY:-}"
input_environment="${INPUT_ENVIRONMENT:-}"
ref_name="${REF_NAME:-}"

require_host() {
  local environment="$1"
  local host="$2"
  if [[ -z "${host}" ]]; then
    echo "${environment^^}_TARGET_HOST must be configured before deploying ${environment}." >&2
    exit 1
  fi
}

if [[ "${event_name}" == "workflow_dispatch" ]]; then
  environment="${input_environment:-uat}"
  run_apply="${input_run_apply}"
else
  if [[ "${ref_name}" == "main" ]]; then
    environment="uat"
  elif [[ "${ref_name}" == release/* || "${REF_TYPE:-}" == "tag" ]]; then
    environment="prod"
  else
    environment="dev"
  fi
  run_apply="true"
fi

case "${environment}" in
  dev)
    target_host="${input_target_host:-${DEV_TARGET_HOST:-}}"
    require_host dev "${target_host}"
    ;;
  uat)
    target_host="${input_target_host:-${UAT_TARGET_HOST:-}}"
    require_host uat "${target_host}"
    ;;
  prod)
    target_host="${input_target_host:-${PROD_TARGET_HOST:-jp-xhttp-contabo.svc.plus}}"
    ;;
  *)
    echo "Unsupported deployment environment: ${environment}. Use dev, uat, or prod." >&2
    exit 1
    ;;
esac

printf 'target_host=%s\n' "${target_host}" >> "${GITHUB_OUTPUT}"
printf 'run_apply=%s\n' "${run_apply}" >> "${GITHUB_OUTPUT}"
printf 'deployment_environment=%s\n' "${environment}" >> "${GITHUB_OUTPUT}"
