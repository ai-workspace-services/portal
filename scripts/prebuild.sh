#!/usr/bin/env bash
set -euo pipefail

# Prebuild script for console.svc.plus
# This script runs all necessary preparation steps before building the application

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.."

echo "======================================"
echo "Starting prebuild process..."
echo "======================================"

# Step 1: Synchronize the Git-backed CMS source. Portal never keeps the
# canonical website copy in its checkout. CI synchronizes before `docker
# build`; local builds pull the default backend when no mirror is present.
if [[ -n "${WEBSITE_CONTENT_REPOSITORY:-}" ]]; then
  echo ""
  echo "[1/3] Synchronizing Git-backed website content..."
  bash scripts/sync-content.sh pull
elif [[ -f "src/content/content-manifest.yaml" ]]; then
  echo ""
  echo "[1/3] Using synchronized Git-backed website content..."
else
  echo ""
  echo "[1/3] Synchronizing default Git-backed website content..."
  bash scripts/sync-content.sh pull
fi

# Step 2: Validate the content contract before generating artifacts.
echo ""
echo "[2/3] Validating website content..."
npx tsx scripts/validate-website-content.ts

# Step 3: Generate local marketing content artifacts
echo ""
echo "[3/3] Generating marketing content..."
npx tsx scripts/generate-content.ts

echo ""
echo "Generating runtime configuration module..."
node scripts/generate-runtime-config-module.mjs

# Build contentlayer artifacts used by non-doc pages. Static/Workers builds
# can skip this legacy empty source; the default VPS build keeps it enabled.
if [[ "${SKIP_CONTENTLAYER:-false}" == "true" ]]; then
  echo ""
  echo "Skipping Contentlayer for this optional deployment target."
else
  echo ""
  echo "Building contentlayer..."
  node scripts/build-contentlayer.mjs
fi

echo ""
echo "======================================"
echo "Prebuild complete!"
echo "======================================"
