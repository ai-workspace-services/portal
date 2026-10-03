#!/usr/bin/env bash
# P0-Q Portal regression gate. This runs only the audited plan-preview/apply
# cases under the repository's jsdom Vitest configuration.
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

yarn vitest run --config tests/unit/vitest.config.ts \
  src/modules/extensions/builtin/user-center/management/__tests__/ManagementComponents.test.tsx \
  -t 'previews a single plan change|previews and confirms batch Unlimited Beta changes|routes validity-only saves'
