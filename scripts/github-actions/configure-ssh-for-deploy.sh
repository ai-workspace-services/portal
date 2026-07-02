#!/usr/bin/env bash
set -euo pipefail

target_host="${TARGET_HOST:?TARGET_HOST is required}"
private_key="${SINGLE_NODE_VPS_SSH_PRIVATE_KEY:-}"
private_key_b64="${SINGLE_NODE_VPS_SSH_PRIVATE_KEY_B64:-}"

if [[ -n "${private_key_b64}" ]]; then
  private_key="$(printf '%s' "${private_key_b64}" | base64 -d)"
fi

if [[ -z "${private_key}" ]]; then
  echo "SINGLE_NODE_VPS_SSH_PRIVATE_KEY or SINGLE_NODE_VPS_SSH_PRIVATE_KEY_B64 is required" >&2
  exit 1
fi

mkdir -p ~/.ssh
chmod 700 ~/.ssh
printf '%s\n' "${private_key}" | tr -d '\r' > ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
ssh-keyscan -H "${target_host}" >> ~/.ssh/known_hosts
chmod 644 ~/.ssh/known_hosts
