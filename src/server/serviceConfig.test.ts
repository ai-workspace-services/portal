// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("serviceConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ACCOUNT_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_ACCOUNT_SERVICE_URL;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("strips path and query from configured account origins", async () => {
    process.env.ACCOUNT_SERVICE_URL =
      "https://accounts.svc.plus/api/auth/login?redirect=%2Fpanel#hash";

    const serviceConfig = await import("./serviceConfig");

    expect(serviceConfig.getAccountServiceBaseUrl()).toBe(
      "https://accounts.svc.plus",
    );
    expect(serviceConfig.getAccountServiceApiBaseUrl()).toBe(
      "https://accounts.svc.plus/api/auth",
    );
  });

  it("detects when a service target points back to the current host", async () => {
    const serviceConfig = await import("./serviceConfig");

    expect(
      serviceConfig.isSelfReferentialServiceTarget(
        "https://console.svc.plus/api/auth",
        "console.svc.plus",
      ),
    ).toBe(true);
    expect(
      serviceConfig.isSelfReferentialServiceTarget(
        "http://127.0.0.1:8080/api/auth",
        "127.0.0.1:3000",
      ),
    ).toBe(false);
  });

  it("uses the dedicated formal Zero API for the Cloudflare UAT Console", async () => {
    const serviceConfig = await import("./serviceConfig");

    expect(
      serviceConfig.getXConnectZeroServiceBaseUrl(
        "console-cloudflare-uat.onwalk.net",
      ),
    ).toBe("https://uat-accounts-1004637461064.asia-northeast1.run.app");
  });
});
