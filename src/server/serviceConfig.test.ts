// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("serviceConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.RUNTIME_ENV;
    delete process.env.RUNTIME_HOSTNAME;
    delete process.env.RUNTIME_AUTH_URL;
    delete process.env.RUNTIME_XCONNECT_ZERO_URL;
    delete process.env.RUNTIME_AGENT_SERVER_URL;
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
    ).toBe("https://accounts-cloudflare-uat.onwalk.net");
  });

  it("routes Selfhost UAT BFF dependencies through the local Compose network", async () => {
    process.env.RUNTIME_ENV = "uat";
    process.env.RUNTIME_HOSTNAME = "console-selfhost-uat.onwalk.net";
    const serviceConfig = await import("./serviceConfig");

    expect(serviceConfig.getXConnectZeroServiceBaseUrl()).toBe(
      "http://accounts:8080",
    );
    expect(serviceConfig.getDocsServiceBaseUrl()).toBe("http://content:8084");
  });

  it("prefers RUNTIME_AGENT_SERVER_URL over RUNTIME_XCONNECT_ZERO_URL and RUNTIME_AUTH_URL for proxy agent-server traffic", async () => {
    process.env.RUNTIME_ENV = "prod";
    process.env.RUNTIME_AUTH_URL =
      "http://web-saas-accounts.web-saas-prod.svc.cluster.local:80";
    process.env.RUNTIME_XCONNECT_ZERO_URL =
      "http://web-saas-xconnect-zero.web-saas-prod.svc.cluster.local:80";
    process.env.RUNTIME_AGENT_SERVER_URL =
      "http://web-saas-xconnect-controller.web-saas-prod.svc.cluster.local:80";

    const serviceConfig = await import("./serviceConfig");

    expect(serviceConfig.getAccountServiceBaseUrl("console.svc.plus")).toBe(
      "http://web-saas-accounts.web-saas-prod.svc.cluster.local",
    );
    expect(serviceConfig.getXConnectZeroServiceBaseUrl("console.svc.plus")).toBe(
      "http://web-saas-xconnect-zero.web-saas-prod.svc.cluster.local",
    );
    expect(serviceConfig.getAgentServerServiceBaseUrl("console.svc.plus")).toBe(
      "http://web-saas-xconnect-controller.web-saas-prod.svc.cluster.local",
    );
  });

  it("falls back to getAccountServiceBaseUrl when xconnectZeroUrl or agentServerUrl is unset", async () => {
    process.env.RUNTIME_ENV = "sit";
    process.env.ACCOUNT_SERVICE_URL = "https://accounts-sit.example/api";

    const serviceConfig = await import("./serviceConfig");

    expect(serviceConfig.getXConnectZeroServiceBaseUrl()).toBe(
      "https://accounts-sit.example",
    );
    expect(serviceConfig.getAgentServerServiceBaseUrl()).toBe(
      "https://accounts-sit.example",
    );
  });
});
