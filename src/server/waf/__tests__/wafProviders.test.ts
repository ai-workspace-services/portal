import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildCloudflareCrawlerExpression,
  mapModeToCloudflareAction,
  publishCloudflareCrawlerPolicy,
} from "@server/waf/providers/cloudflare";
import {
  publishWebhookCrawlerPolicy,
  signWebhookPayload,
  testWebhookConnection,
} from "@server/waf/providers/webhook";
import {
  deleteProvider,
  getProviderRecord,
  listProviders,
  resetWafStoreForTests,
  upsertProvider,
} from "@server/waf/store";
import type { WafProviderRecord } from "@server/waf/types";

describe("Cloudflare WAF adapter", () => {
  it("builds valid Wirefilter expressions with exceptions", () => {
    const expr = buildCloudflareCrawlerExpression(
      ["ClaudeBot", "Baiduspider", "bad;bot"],
      ["/robots.txt", "/.well-known/acme-challenge"],
    );
    expect(expr).toBe(
      '(http.user_agent contains "ClaudeBot" or http.user_agent contains "Baiduspider") and not (http.request.uri.path eq "/robots.txt" or http.request.uri.path eq "/.well-known/acme-challenge")',
    );
  });

  it("maps action modes according to Cloudflare plan tier", () => {
    expect(mapModeToCloudflareAction("challenge", "free")).toBe("managed_challenge");
    expect(mapModeToCloudflareAction("block", "free")).toBe("block");
    expect(mapModeToCloudflareAction("observe", "enterprise")).toBe("log");
    expect(() => mapModeToCloudflareAction("observe", "free")).toThrow();
  });

  it("upserts custom firewall ruleset via Cloudflare Rulesets API", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/rulesets/phases/")) {
        return new Response(
          JSON.stringify({
            success: true,
            result: {
              id: "rs-123",
              rules: [
                {
                  id: "rule-existing",
                  ref: "other_rule",
                  expression: 'http.host eq "example.com"',
                  action: "block",
                  enabled: true,
                },
              ],
            },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/rulesets/rs-123") && init?.method === "PUT") {
        return new Response(
          JSON.stringify({
            success: true,
            result: {
              id: "rs-123",
              rules: [
                { id: "rule-existing", ref: "other_rule" },
                { id: "rule-crawler-1", ref: "xconnect_crawler_protection" },
              ],
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          result: { id: "zone-abc", name: "svc.plus" },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider: WafProviderRecord = {
      id: "cloudflare-default",
      type: "cloudflare",
      name: "Cloudflare WAF",
      enabled: true,
      zoneId: "zone-abc",
      planTier: "free",
      credentialSource: "custom",
      customSecret: "cf-test-token",
      hasSecret: true,
      capabilities: {
        supportsObserveMode: false,
        supportsChallengeMode: true,
        supportsZoneDiscovery: true,
        supportsRemoteStatus: true,
      },
      updatedAt: new Date().toISOString(),
    };

    const result = await publishCloudflareCrawlerPolicy(provider, {
      providerId: "cloudflare-default",
      domain: "console.svc.plus",
      mode: "challenge",
      bots: ["ClaudeBot"],
      exceptions: ["/robots.txt"],
    });

    expect(result.ok).toBe(true);
    expect(result.appliedAction).toBe("managed_challenge");
    expect(result.rulesetId).toBe("rs-123");
    expect(result.ruleId).toBe("rule-crawler-1");
    expect(fetchMock).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

describe("Webhook WAF adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ALLOW_PRIVATE_WAF_WEBHOOK;
  });

  it("blocks loopback SSRF webhook URLs by default", async () => {
    const provider: WafProviderRecord = {
      id: "open-webhook",
      type: "webhook",
      name: "Open Webhook",
      enabled: true,
      endpointUrl: "http://127.0.0.1:8080/waf",
      credentialSource: "env",
      hasSecret: false,
      capabilities: {
        supportsObserveMode: true,
        supportsChallengeMode: true,
        supportsZoneDiscovery: false,
        supportsRemoteStatus: false,
      },
      updatedAt: new Date().toISOString(),
    };

    await expect(testWebhookConnection(provider)).rejects.toThrow(/禁止/);
  });

  it("signs webhook payload with HMAC-SHA256 and posts policy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, ruleId: "wh-rule-1" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider: WafProviderRecord = {
      id: "open-webhook",
      type: "webhook",
      name: "Open Webhook",
      enabled: true,
      endpointUrl: "https://waf.example.com/v1/crawler-policy",
      credentialSource: "custom",
      customSecret: "super-secret",
      hasSecret: true,
      capabilities: {
        supportsObserveMode: true,
        supportsChallengeMode: true,
        supportsZoneDiscovery: false,
        supportsRemoteStatus: false,
      },
      updatedAt: new Date().toISOString(),
    };

    const res = await publishWebhookCrawlerPolicy(provider, {
      providerId: "open-webhook",
      domain: "console.svc.plus",
      mode: "block",
      bots: ["ClaudeBot"],
    });

    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const body = init.body as string;
    expect(headers["X-XConnect-Signature-256"]).toBe(
      signWebhookPayload(body, "super-secret"),
    );
  });
});

describe("WAF provider store", () => {
  beforeEach(() => {
    process.env.WAF_PROVIDERS_STORE_PATH = path.join(
      os.tmpdir(),
      `waf-providers-test-${Date.now()}-${Math.random()}.json`,
    );
    resetWafStoreForTests();
  });

  afterEach(() => {
    delete process.env.WAF_PROVIDERS_STORE_PATH;
    resetWafStoreForTests();
  });

  it("seeds built-in providers and strips secrets in public listings", async () => {
    const initial = await listProviders();
    expect(initial.some((p) => p.id === "cloudflare-default")).toBe(true);
    expect(initial.some((p) => p.id === "open-webhook")).toBe(true);

    const saved = await upsertProvider({
      type: "webhook",
      name: "Tokyo Edge WAF",
      endpointUrl: "https://edge-jp.example.com/waf",
      credentialSource: "custom",
      secret: "token-xyz",
    });

    expect(saved.hasSecret).toBe(true);
    expect("customSecret" in saved).toBe(false);

    const rawRecord = await getProviderRecord(saved.id);
    expect(rawRecord?.customSecret).toBe("token-xyz");

    const delBuiltin = await deleteProvider("cloudflare-default");
    expect(delBuiltin.deleted).toBe(false);
    expect(delBuiltin.reason).toBe("cannot_delete_builtin");

    const delCustom = await deleteProvider(saved.id);
    expect(delCustom.deleted).toBe(true);
  });
});
