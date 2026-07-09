#!/usr/bin/env bash
set -euo pipefail

CANONICAL_DOMAIN="${1:?usage: verify-frontend-release.sh <canonical-domain> <served-domains> <expected-image-ref> [request-base-url]}"
SERVED_DOMAINS="${2:?usage: verify-frontend-release.sh <canonical-domain> <served-domains> <expected-image-ref> [request-base-url]}"
EXPECTED_IMAGE_REF="${3:?usage: verify-frontend-release.sh <canonical-domain> <served-domains> <expected-image-ref> [request-base-url]}"
REQUEST_BASE_URL="${4:-https://${CANONICAL_DOMAIN}}"

curl_headers=(
  -H 'user-agent: Mozilla/5.0 (compatible; console-release-validator/1.0; +https://www.svc.plus)'
  -H 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  -H 'accept-language: en-US,en;q=0.9'
)

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "${value}"
}

parse_image_ref() {
  local image_ref="$1"

  IMAGE_REF="${image_ref}" python3 - <<'PY'
import os
import re
import sys

image_ref = os.environ["IMAGE_REF"].strip()
match = re.search(r":([^:@]+)$", image_ref)
tag = match.group(1) if match else ""
commit = ""
version = tag

if re.fullmatch(r"[0-9a-f]{7,40}", tag, flags=re.IGNORECASE):
    commit = tag
else:
    prefixed_match = re.fullmatch(r"sha-([0-9a-f]{7,40})", tag, flags=re.IGNORECASE)
    if prefixed_match:
        commit = prefixed_match.group(1)

if not image_ref or not tag or not commit or not version:
    sys.exit(1)

print(image_ref)
print(tag)
print(commit)
print(version)
PY
}

parse_homepage_release_metadata() {
  local homepage_html="$1"
  HOMEPAGE_HTML="${homepage_html}" python3 - <<'PY'
import os
import re

html = os.environ["HOMEPAGE_HTML"]

def extract_meta(name: str) -> str:
    pattern = rf'<meta[^>]+name=["\']{re.escape(name)}["\'][^>]+content=["\']([^"\']*)["\']'
    match = re.search(pattern, html, flags=re.IGNORECASE)
    return match.group(1).strip() if match else ""

print(extract_meta("svc-plus-release-image"))
print(extract_meta("svc-plus-release-tag"))
print(extract_meta("svc-plus-release-commit"))
print(extract_meta("svc-plus-release-version"))
PY
}

require_http_200() {
  local url="$1"
  shift

  local http_code
  http_code="$(curl -sS -o /dev/null -w '%{http_code}' "$@" "${url}")"
  if [[ "${http_code}" != "200" ]]; then
    echo "Expected HTTP 200 from ${url}, got ${http_code}" >&2
    exit 1
  fi
}

verify_domain() {
  local domain="$1"
  local request_base_url="${REQUEST_BASE_URL%/}"
  local request_headers=("${curl_headers[@]}" -H "host: ${domain}")
  local homepage_html asset_path release_metadata
  local actual_image_ref actual_image_tag actual_release_commit actual_release_version
  local release_lines

  require_http_200 "${request_base_url}" "${request_headers[@]}"
  printf 'verified homepage for %s: 200\n' "${domain}" >&2

  homepage_html="$(curl -fsSL "${request_headers[@]}" "${request_base_url}")"
  asset_path="$(printf '%s' "${homepage_html}" | grep -Eo '/_next/static/[^"'"'"' ]+\.(css|js)' | head -n 1)"
  if [[ -z "${asset_path}" ]]; then
    echo "Could not find a _next/static asset on ${domain} via ${request_base_url}" >&2
    exit 1
  fi

  require_http_200 "${request_base_url}${asset_path}" "${request_headers[@]}"
  printf 'verified static asset for %s: %s%s\n' "${domain}" "${request_base_url}" "${asset_path}" >&2

  release_metadata="$(parse_homepage_release_metadata "${homepage_html}")"

  mapfile -t release_lines <<< "${release_metadata}"
  actual_image_ref="${release_lines[0]-}"
  actual_image_tag="${release_lines[1]-}"
  actual_release_commit="${release_lines[2]-}"
  actual_release_version="${release_lines[3]-}"

  if [[ -z "${actual_image_ref}" || -z "${actual_image_tag}" || -z "${actual_release_commit}" || -z "${actual_release_version}" ]]; then
    echo "Homepage release metadata is incomplete for ${domain}" >&2
    exit 1
  fi

  if [[ ! "${actual_release_commit}" =~ ^[0-9a-f]{7,40}$ ]]; then
    echo "Homepage release commit must contain a commit id for ${domain}, got: ${actual_release_commit}" >&2
    exit 1
  fi

  if [[ "${actual_release_version}" != "${actual_image_tag}" ]]; then
    echo "Homepage release version mismatch for ${domain}: expected ${actual_image_tag}, got ${actual_release_version}" >&2
    exit 1
  fi

  if [[ "${actual_release_commit}" != "${EXPECTED_RELEASE_COMMIT}" ]]; then
    echo "Homepage release commit mismatch for ${domain}: expected ${EXPECTED_RELEASE_COMMIT}, got ${actual_release_commit}" >&2
    exit 1
  fi

  printf 'verified homepage release image for %s: %s\n' "${domain}" "${actual_image_ref}" >&2
  printf 'verified homepage release commit for %s: %s\n' "${domain}" "${actual_release_commit}" >&2
  printf 'verified homepage release version for %s: %s\n' "${domain}" "${actual_release_version}" >&2

  printf '%s\t%s\t%s\t%s\t%s\n' "${domain}" "${actual_image_ref}" "${actual_image_tag}" "${actual_release_commit}" "${actual_release_version}"
}

mapfile -t expected_release_lines < <(parse_image_ref "${EXPECTED_IMAGE_REF}")
EXPECTED_RELEASE_IMAGE_REF="${expected_release_lines[0]-}"
EXPECTED_RELEASE_IMAGE_TAG="${expected_release_lines[1]-}"
EXPECTED_RELEASE_COMMIT="${expected_release_lines[2]-}"
EXPECTED_RELEASE_VERSION="${expected_release_lines[3]-}"

if [[ -z "${EXPECTED_RELEASE_IMAGE_REF}" || -z "${EXPECTED_RELEASE_IMAGE_TAG}" || -z "${EXPECTED_RELEASE_COMMIT}" || -z "${EXPECTED_RELEASE_VERSION}" ]]; then
  echo "Expected image ref is invalid: ${EXPECTED_IMAGE_REF}" >&2
  exit 1
fi

IFS=', ' read -r -a served_domain_candidates <<< "${SERVED_DOMAINS}"
served_domains=()
for domain in "${served_domain_candidates[@]}"; do
  domain="$(trim "${domain}")"
  if [[ -n "${domain}" ]]; then
    served_domains+=("${domain}")
  fi
done

if [[ "${#served_domains[@]}" -eq 0 ]]; then
  echo "No served domains were provided." >&2
  exit 1
fi

canonical_found=false
declare -a verification_rows=()

for domain in "${served_domains[@]}"; do
  if [[ "${domain}" == "${CANONICAL_DOMAIN}" ]]; then
    canonical_found=true
  fi
  verification_rows+=("$(verify_domain "${domain}")")
done

if [[ "${canonical_found}" != "true" ]]; then
  echo "Canonical domain ${CANONICAL_DOMAIN} must be included in served domains: ${SERVED_DOMAINS}" >&2
  exit 1
fi

reference_image_ref=""
reference_image_tag=""
reference_release_commit=""
reference_release_version=""

for row in "${verification_rows[@]}"; do
  IFS=$'\t' read -r domain actual_image_ref actual_image_tag actual_release_commit actual_release_version <<< "${row}"

  if [[ "${actual_image_ref}" != "${EXPECTED_RELEASE_IMAGE_REF}" ]]; then
    echo "Release image mismatch for ${domain}: expected ${EXPECTED_RELEASE_IMAGE_REF}, got ${actual_image_ref}" >&2
    exit 1
  fi

  if [[ "${actual_image_tag}" != "${EXPECTED_RELEASE_IMAGE_TAG}" ]]; then
    echo "Release tag mismatch for ${domain}: expected ${EXPECTED_RELEASE_IMAGE_TAG}, got ${actual_image_tag}" >&2
    exit 1
  fi

  if [[ "${actual_release_commit}" != "${EXPECTED_RELEASE_COMMIT}" ]]; then
    echo "Release commit mismatch for ${domain}: expected ${EXPECTED_RELEASE_COMMIT}, got ${actual_release_commit}" >&2
    exit 1
  fi

  if [[ "${actual_release_version}" != "${EXPECTED_RELEASE_VERSION}" ]]; then
    echo "Release version mismatch for ${domain}: expected ${EXPECTED_RELEASE_VERSION}, got ${actual_release_version}" >&2
    exit 1
  fi

  if [[ -z "${reference_image_ref}" ]]; then
    reference_image_ref="${actual_image_ref}"
    reference_image_tag="${actual_image_tag}"
    reference_release_commit="${actual_release_commit}"
    reference_release_version="${actual_release_version}"
    continue
  fi

  if [[ "${actual_image_ref}" != "${reference_image_ref}" || "${actual_image_tag}" != "${reference_image_tag}" || "${actual_release_commit}" != "${reference_release_commit}" || "${actual_release_version}" != "${reference_release_version}" ]]; then
    echo "Release metadata drift detected across served domains." >&2
    exit 1
  fi
done
