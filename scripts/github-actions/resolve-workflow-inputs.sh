#!/usr/bin/env bash
set -euo pipefail

event_name="${EVENT_NAME:?EVENT_NAME is required}"
input_target_host="${INPUT_TARGET_HOST:-}"
input_run_apply="${INPUT_RUN_APPLY:-}"

if [[ "${event_name}" == "workflow_dispatch" ]]; then
  target_host="${input_target_host}"
  run_apply="${input_run_apply}"
else
  target_host="jp-xhttp-contabo.svc.plus"
  run_apply="true"
fi

printf 'target_host=%s\n' "${target_host}" >> "${GITHUB_OUTPUT}"
printf 'run_apply=%s\n' "${run_apply}" >> "${GITHUB_OUTPUT}"
