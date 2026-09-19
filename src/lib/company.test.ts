import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import {
  COMPANY_GITHUB_URL,
  COMPANY_LEGAL_NAME,
  COMPANY_SUPPORT_EMAIL,
  COMPANY_CONTACT_EMAIL,
  PRODUCT_SOURCES,
} from "@lib/company";

// Public-facing source that renders on the brand domain. UAT runtime config
// (src/config, environment detection) legitimately names the UAT domain and
// is not part of the public brand surface.
const PUBLIC_SURFACE = ["src/app", "src/components", "src/i18n", "src/lib", "src/modules", "src/data"];

function grepPublicSurface(pattern: string): string[] {
  try {
    const out = execFileSync(
      "git",
      ["grep", "-n", "-I", "-E", pattern, "--", ...PUBLIC_SURFACE, ":!*.test.*", ":!**/__tests__/**"],
      { encoding: "utf8" },
    );
    return out.split("\n").filter(Boolean);
  } catch (error) {
    // git grep exits 1 when nothing matches.
    if ((error as { status?: number }).status === 1) return [];
    throw error;
  }
}

describe("company identity", () => {
  it("uses the legal entity, company-domain email, and a public GitHub org", () => {
    expect(COMPANY_LEGAL_NAME).toBe("XWork Technologies LLC");
    expect(COMPANY_SUPPORT_EMAIL).toMatch(/@xworktech\.com$/);
    expect(COMPANY_CONTACT_EMAIL).toMatch(/@xworktech\.com$/);
    expect(COMPANY_GITHUB_URL).toBe("https://github.com/ai-workspace-lab");
  });

  it("publishes repositories and downloads for every product page", () => {
    for (const slug of ["xworkmate", "xconnect", "ai-workspace", "open-platform"]) {
      const sources = PRODUCT_SOURCES[slug];
      expect(sources, slug).toBeDefined();
      expect(sources.repositories.length, slug).toBeGreaterThan(0);
      expect(sources.downloads.length, slug).toBeGreaterThan(0);
      for (const link of [...sources.repositories, ...sources.downloads]) {
        expect(link.href).toMatch(/^https:\/\/github\.com\/ai-workspace-(lab|xstream|services|infra)\//);
      }
    }
  });

  it("keeps personal mailboxes and legacy brands off the public surface", () => {
    expect(grepPublicSurface("@gmail\\.com")).toEqual([]);
    expect(grepPublicSurface("github\\.com/x-evor|\"x-evor/")).toEqual([]);
    expect(grepPublicSurface("©[^\\n]*onwalk")).toEqual([]);
    expect(grepPublicSurface("https://www\\.svc\\.plus")).toEqual([]);
    expect(grepPublicSurface("console\\.svc\\.plus/download")).toEqual([]);
    expect(grepPublicSurface("pricing/xcloudflow|xcloudflow/signup")).toEqual([]);
  });
});
