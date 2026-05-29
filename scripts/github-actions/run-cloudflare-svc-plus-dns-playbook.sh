#!/usr/bin/env bash
set -euo pipefail

target_host="${TARGET_HOST:?TARGET_HOST is required}"
run_apply="${RUN_APPLY:?RUN_APPLY is required}"
cloudflare_zone_id="${CLOUDFLARE_ZONE_TAG:?CLOUDFLARE_ZONE_TAG is required}"
cloudflare_dns_token="${CLOUDFLARE_DNS_API_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"

if [[ -z "${cloudflare_dns_token}" ]]; then
  echo "CLOUDFLARE_DNS_API_TOKEN or CLOUDFLARE_API_TOKEN is required" >&2
  exit 1
fi

ansible_args=(
  -i inventory.ini
  update_cloudflare_svc_plus_dns.yml
  -e "{\"cloudflare_dns_source_hosts\":[\"${target_host}\"]}"
  -e "cloudflare_dns_zone_id=${cloudflare_zone_id}"
  -e "CLOUDFLARE_DNS_API_TOKEN=${cloudflare_dns_token}"
)

if [[ "${run_apply}" != "true" ]]; then
  ansible_args=(-C "${ansible_args[@]}")
fi

ansible-playbook "${ansible_args[@]}"
