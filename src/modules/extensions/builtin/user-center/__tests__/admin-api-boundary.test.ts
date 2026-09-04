import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The console's Frontend Router hands every `/api/*` request to the Edge
 * Gateway, and the gateway's core boundary explicitly disowns `/api/admin/*`
 * (`ownsPath` in edge-gateway `src/config.ts`). No admin gateway Worker is
 * bound in GitOps, so those requests come back as
 * `404 {"code":404,"error":"Unknown API boundary: core"}` -- every ops and
 * management screen renders as a load failure with nothing in the browser
 * console to explain it.
 *
 * Accounts registers the same handlers under the auth boundary
 * (`authProtected.GET("/admin/billing/plans", ...)` in api/api.go), which the
 * router does reach. Same fix as portal #254 for the management metrics.
 *
 * The `src/app/api/admin/**` BFF routes map these correctly, but they are
 * never invoked from a browser: the router never sends `/api/*` to an SSR
 * boundary. They are excluded from this scan because they are the server side
 * of that mapping, not callers of it.
 */
const USER_CENTER_DIR = path.resolve(__dirname, "..");

/**
 * The account collection is the only dashboard contract that remains BFF
 * backed: Accounts exposes its protected directory at `/users`, rather than
 * a billing collection endpoint.
 */
const MISSING_UPSTREAM_ENDPOINTS = [
  // The account list is served by the BFF from `/api/auth/users` and reshaped.
  '"/api/admin/billing/accounts"',
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [full]
      : [];
  });
}

describe("user centre API boundary", () => {
  it("reaches accounts through the auth boundary, not /api/admin", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(USER_CENTER_DIR)) {
      const source = readFileSync(file, "utf8");
      source.split("\n").forEach((line, index) => {
        if (!line.includes("/api/admin/")) return;
        // Prose explaining why the prefix is wrong is not a caller.
        const trimmed = line.trimStart();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
          return;
        }
        if (MISSING_UPSTREAM_ENDPOINTS.some((endpoint) => line.includes(endpoint))) {
          return;
        }
        offenders.push(`${path.relative(USER_CENTER_DIR, file)}:${index + 1}`);
      });
    }

    expect(offenders).toEqual([]);
  });
});
