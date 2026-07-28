#!/usr/bin/env bash
set -euo pipefail

event_name="${EVENT_NAME:?EVENT_NAME is required}"
input_environment="${INPUT_ENVIRONMENT:-}"
ref_name="${REF_NAME:-}"

# 这个仓库只做 CI: 构建并推送镜像。部署由 GitOps 侧完成 —— Doco-CD
# (未来可能是 K3s/K8s reconciler) 从 gitops 仓拉取。所以这里不再解析
# 目标主机, 也不再有 run_apply。
#
# deployment_environment 仍然要留: build job 用它设
# NEXT_PUBLIC_RUNTIME_ENVIRONMENT, 那是编译进前端产物的值, 属于构建输入
# 而不是部署输入。
# workflow_dispatch 的显式选择优先于任何 ref 推断。
if [[ "${event_name}" == "workflow_dispatch" && -n "${input_environment:-}" ]]; then
  environment="${input_environment}"
elif [[ "${event_name}" == "pull_request" ]]; then
  environment="sit"
elif [[ "${ref_name}" == "main" ]]; then
  environment="uat"
elif [[ "${ref_name}" == prod-* ]]; then
  environment="prod"
elif [[ "${ref_name}" == sit-* ]]; then
  environment="sit"
elif [[ "${ref_name}" == uat-* || "${ref_name}" == *daily-build-* ]]; then
  environment="uat"
elif [[ "${ref_name}" == release/* || "${REF_TYPE:-}" == "tag" ]]; then
  environment="prod"
else
  # Vault OIDC roles for uat and prod require main or release/* refs.
  # Custom or feature branches must use sit to satisfy Vault claim validation.
  environment="sit"
fi

case "${environment}" in
  sit|uat|prod) ;;
  *)
    echo "Unsupported deployment environment: ${environment}. Use sit, uat, or prod." >&2
    exit 1
    ;;
esac

printf 'deployment_environment=%s\n' "${environment}" >> "${GITHUB_OUTPUT}"
