import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const panelRoutes = [
  "src/app/panel/page.tsx",
  "src/app/panel/[...segments]/page.tsx",
  "src/app/panel/account/page.tsx",
  "src/app/panel/agent/page.tsx",
  "src/app/panel/api/page.tsx",
  "src/app/panel/appearance/page.tsx",
  "src/app/panel/ldp/page.tsx",
  "src/app/panel/management/page.tsx",
  "src/app/panel/subscription/page.tsx",
];

describe("protected panel route rendering", () => {
  it("keeps session-scoped panel routes out of static caching", () => {
    for (const route of panelRoutes) {
      const source = readFileSync(resolve(process.cwd(), route), "utf8");
      expect(source, route).toContain("export const dynamic = 'force-dynamic'");
      expect(source, route).not.toContain("export const dynamic = 'error'");
    }
  });
});
