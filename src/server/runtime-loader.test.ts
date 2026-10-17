// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("runtime-loader", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.RUNTIME_ENV;
    delete process.env.RUNTIME_HOSTNAME;
    delete process.env.REGION;
    delete process.env.RUNTIME_ENV_CONFIG_PATH;
    delete process.env.ACCOUNT_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_ACCOUNT_SERVICE_URL;
    delete process.env.RUNTIME_API_BASE_URL;
    delete process.env.RUNTIME_AUTH_URL;
    delete process.env.RUNTIME_DASHBOARD_URL;
    delete process.env.RUNTIME_DOCS_SERVICE_URL;
    delete process.env.RUNTIME_XCONNECT_ZERO_URL;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("loads the console runtime auth URL from the prod yaml config", async () => {
    const { loadRuntimeConfig } = await import("./runtime-loader");

    const config = loadRuntimeConfig({ hostname: "console.svc.plus" });

    expect(config.authUrl).toBe(
      "https://prod-accounts-b7wzzanztq-de.a.run.app",
    );
    expect(config.xconnectZeroUrl).toBe(
      "https://prod-accounts-b7wzzanztq-de.a.run.app",
    );
    expect(config.dashboardUrl).toBe("https://console.svc.plus");
  });

  it("keeps Serverless UAT on its Cloudflare and Cloud Run service entrances", async () => {
    const { loadRuntimeConfig } = await import("./runtime-loader");

    const config = loadRuntimeConfig({
      hostname: "console-cloudflare-uat.onwalk.net",
    });

    expect(config.apiBaseUrl).toBe(
      "https://accounts-cloudflare-uat.onwalk.net/api",
    );
    expect(config.authUrl).toBe("https://accounts-cloudflare-uat.onwalk.net");
    expect(config.xconnectZeroUrl).toBe(
      "https://accounts-cloudflare-uat.onwalk.net",
    );
    expect(config.dashboardUrl).toBe("https://console.onwalk.net");
    expect(config.docsServiceUrl).toBe(
      "https://uat-content-service-4ueoyqlpbq-de.a.run.app",
    );
  });

  it("selects only Compose-local service endpoints for Selfhost UAT", async () => {
    const { loadRuntimeConfig } = await import("./runtime-loader");

    const config = loadRuntimeConfig({
      hostname: "console-selfhost-uat.onwalk.net",
    });

    expect(config.environment).toBe("uat");
    expect(config.apiBaseUrl).toBe(
      "https://accounts-selfhost-uat.onwalk.net/api",
    );
    expect(config.authUrl).toBe("https://accounts-selfhost-uat.onwalk.net");
    expect(config.xconnectZeroUrl).toBe("http://accounts:8080");
    expect(config.docsServiceUrl).toBe("http://content:8084");
    expect(config.dashboardUrl).toBe("https://console-selfhost-uat.onwalk.net");
  });

  it("uses the configured runtime hostname for server-side requests without request context", async () => {
    process.env.RUNTIME_ENV = "uat";
    process.env.RUNTIME_HOSTNAME = "console-selfhost-uat.onwalk.net";
    const { loadRuntimeConfig } = await import("./runtime-loader");

    const config = loadRuntimeConfig();

    expect(config.xconnectZeroUrl).toBe("http://accounts:8080");
    expect(config.docsServiceUrl).toBe("http://content:8084");
  });

  it("keeps the Serverless production console on the production Accounts service", async () => {
    const { loadRuntimeConfig } = await import("./runtime-loader");

    const config = loadRuntimeConfig({
      hostname: "console-serverless-prod.svc.plus",
    });

    expect(config.environment).toBe("prod");
    expect(config.authUrl).toBe(
      "https://prod-accounts-b7wzzanztq-de.a.run.app",
    );
  });

  it("uses explicit Selfhost endpoints on stable public production aliases", async () => {
    process.env.RUNTIME_API_BASE_URL = "https://accounts.svc.plus/api";
    process.env.RUNTIME_AUTH_URL = "https://accounts.svc.plus";
    process.env.RUNTIME_DASHBOARD_URL = "https://console.svc.plus";
    process.env.RUNTIME_DOCS_SERVICE_URL = "http://content:8084";
    process.env.RUNTIME_XCONNECT_ZERO_URL = "http://accounts:8080";
    const { loadRuntimeConfig } = await import("./runtime-loader");

    for (const hostname of [
      "console.svc.plus",
      "xworktech.com",
      "console-selfhost-prod-v2.svc.plus",
    ]) {
      const config = loadRuntimeConfig({ hostname });
      expect(config.apiBaseUrl).toBe("https://accounts.svc.plus/api");
      expect(config.authUrl).toBe("https://accounts.svc.plus");
      expect(config.dashboardUrl).toBe("https://console.svc.plus");
      expect(config.docsServiceUrl).toBe("http://content:8084");
      expect(config.xconnectZeroUrl).toBe("http://accounts:8080");
    }
  });

  it("does not reuse cached YAML endpoints after runtime overrides are supplied", async () => {
    const { loadRuntimeConfig } = await import("./runtime-loader");
    const yamlConfig = loadRuntimeConfig({ hostname: "console.svc.plus" });
    process.env.RUNTIME_AUTH_URL = " https://accounts.svc.plus ";
    expect(loadRuntimeConfig({ hostname: "console.svc.plus" }).authUrl).toBe(
      "https://accounts.svc.plus",
    );
    process.env.RUNTIME_AUTH_URL = "   ";
    expect(loadRuntimeConfig({ hostname: "console.svc.plus" }).authUrl).toBe(
      yamlConfig.authUrl,
    );
  });
});
