// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// NEXT_PUBLIC_* values are inlined by Next.js at build time, so
// CONSOLE_ORIGIN is computed once, at module load, from
// process.env.NEXT_PUBLIC_CONSOLE_HOST. Each case below sets the env var
// and re-imports the module fresh to observe that build-time resolution,
// matching how the three separate boundary builds (UAT, PROD, ...) each
// bake in their own value.
const ORIGINAL_ENV = { ...process.env };

describe("consoleNavigation", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("routes console paths to the UAT console host on a UAT build", async () => {
    process.env.NEXT_PUBLIC_CONSOLE_HOST = "console-cloudflare-uat.onwalk.net";
    const { toConsoleHref } = await import("./consoleNavigation");

    expect(toConsoleHref("/login")).toBe(
      "https://console-cloudflare-uat.onwalk.net/login",
    );
  });

  it("routes console paths to the PROD console host on a PROD build", async () => {
    process.env.NEXT_PUBLIC_CONSOLE_HOST = "console.svc.plus";
    const { toConsoleHref } = await import("./consoleNavigation");

    expect(toConsoleHref("/login")).toBe("https://console.svc.plus/login");
  });

  it("never sends a UAT build to the PROD console host", async () => {
    process.env.NEXT_PUBLIC_CONSOLE_HOST = "console-cloudflare-uat.onwalk.net";
    const { toConsoleHref } = await import("./consoleNavigation");

    for (const path of ["/login", "/register", "/panel", "/panel/account"]) {
      expect(toConsoleHref(path)).not.toContain("console.svc.plus");
    }
  });

  it("leaves console paths relative when no console host is configured (monolith/dev build)", async () => {
    delete process.env.NEXT_PUBLIC_CONSOLE_HOST;
    const { toConsoleHref } = await import("./consoleNavigation");

    expect(toConsoleHref("/login")).toBe("/login");
    expect(toConsoleHref("/panel/account?tab=security")).toBe(
      "/panel/account?tab=security",
    );
  });

  it("preserves query string and hash when rewriting", async () => {
    process.env.NEXT_PUBLIC_CONSOLE_HOST = "console-cloudflare-uat.onwalk.net";
    const { toConsoleHref } = await import("./consoleNavigation");

    expect(toConsoleHref("/login?redirect=%2Fpanel#top")).toBe(
      "https://console-cloudflare-uat.onwalk.net/login?redirect=%2Fpanel#top",
    );
  });

  it("does not rewrite paths outside the console prefix list", async () => {
    process.env.NEXT_PUBLIC_CONSOLE_HOST = "console-cloudflare-uat.onwalk.net";
    const { toConsoleHref } = await import("./consoleNavigation");

    expect(toConsoleHref("/blogs/some-post")).toBe("/blogs/some-post");
    expect(toConsoleHref("/")).toBe("/");
  });

  it("does not rewrite absolute or protocol-relative hrefs", async () => {
    process.env.NEXT_PUBLIC_CONSOLE_HOST = "console-cloudflare-uat.onwalk.net";
    const { toConsoleHref } = await import("./consoleNavigation");

    expect(toConsoleHref("https://example.com/login")).toBe(
      "https://example.com/login",
    );
    expect(toConsoleHref("//example.com/login")).toBe("//example.com/login");
  });
});
