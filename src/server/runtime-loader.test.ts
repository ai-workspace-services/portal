// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("runtime-loader", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.RUNTIME_ENV;
    delete process.env.REGION;
    delete process.env.RUNTIME_ENV_CONFIG_PATH;
    delete process.env.ACCOUNT_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_ACCOUNT_SERVICE_URL;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("loads the console runtime auth URL from the prod yaml config", async () => {
    const { loadRuntimeConfig } = await import("./runtime-loader");

    const config = loadRuntimeConfig({ hostname: "console.svc.plus" });

    expect(config.authUrl).toBe("https://accounts.svc.plus");
    expect(config.dashboardUrl).toBe("https://www.svc.plus");
  });

  it("uses the GitOps Cloudflare service entrances for UAT OAuth", async () => {
    const { loadRuntimeConfig } = await import("./runtime-loader");

    const config = loadRuntimeConfig({ hostname: "console-cloudflare-uat.onwalk.net" });

    expect(config.apiBaseUrl).toBe("https://accounts-serverless-uat.onwalk.net/api");
    expect(config.authUrl).toBe("https://accounts-cloudflare-uat.onwalk.net");
    expect(config.dashboardUrl).toBe("https://console-cloudflare-uat.onwalk.net");
  });

  it("keeps the Serverless production console on the production Accounts service", async () => {
    const { loadRuntimeConfig } = await import("./runtime-loader");

    const config = loadRuntimeConfig({ hostname: "console-serverless-prod.svc.plus" });

    expect(config.environment).toBe("prod");
    expect(config.authUrl).toBe("https://accounts.svc.plus");
  });
});
