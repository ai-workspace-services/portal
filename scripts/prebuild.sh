#!/usr/bin/env bash
set -euo pipefail

# Prebuild script for console.svc.plus
# This script runs all necessary preparation steps before building the application

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.."

echo "======================================"
echo "Starting prebuild process..."
echo "======================================"

# Step 1: Synchronize the Git-backed CMS source when configured.
if [[ -n "${WEBSITE_CONTENT_REPOSITORY:-${CONTENT_REMOTE_REPO:-}}" ]]; then
  echo ""
  echo "[1/3] Synchronizing Git-backed website content..."
  bash scripts/sync-content.sh pull
elif [[ ! -f "src/content/content-manifest.yaml" ]]; then
  echo "Git-backed website content has not been synchronized." >&2
  echo "Set WEBSITE_CONTENT_REPOSITORY and run: yarn content:pull" >&2
  exit 1
fi

# Step 2: Validate the content contract before generating artifacts.
echo ""
echo "[2/3] Validating website content..."
npx tsx scripts/validate-website-content.ts

# Step 3: Generate local marketing content artifacts
echo ""
echo "[3/3] Generating marketing content..."
npx tsx scripts/generate-content.ts

# Build contentlayer artifacts used by non-doc pages
echo ""
echo "Building contentlayer..."
node scripts/build-contentlayer.mjs

echo ""
echo "======================================"
echo "Prebuild complete!"
echo "======================================"
