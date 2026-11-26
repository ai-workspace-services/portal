// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@server/runtime-loader", () => ({
  loadRuntimeConfig: () => ({ environment: "uat" }),
}));

describe("digest-pinned runtime release identity", () => {
  const source = "ad300746da5e4c0cdc0e2b3c1f550919500405f2";
  afterEach(() => vi.unstubAllEnvs());

  it("reports the source tag and commit while retaining the immutable digest", async () => {
    const ref = `ghcr.io/ai-workspace-services/console:sha-${source}@sha256:${"a".repeat(64)}`;
    vi.stubEnv("FRONTEND_IMAGE", ref);
    const { GET } = await import("./route");
    const response = await GET(new Request("https://console-selfhost-uat.onwalk.net/api/ping"));
    expect(await response.json()).toMatchObject({ releaseImageRef:ref, releaseImageTag:`sha-${source}`, releaseCommit:source });
  });

  it("does not mistake a bare digest for a source tag", async () => {
    vi.stubEnv("FRONTEND_IMAGE", `ghcr.io/ai-workspace-services/console@sha256:${"a".repeat(64)}`);
    const { GET } = await import("./route");
    const response = await GET(new Request("https://console-selfhost-uat.onwalk.net/api/ping"));
    expect(await response.json()).toMatchObject({ releaseImageTag:null, releaseCommit:null });
  });

  it("skips upstream readyz probes unless CONSOLE_PING_UPSTREAM_PROBE is true", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      const { GET } = await import("./route");
      const response = await GET(new Request("https://console.svc.plus/api/ping"));
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.upstreams).toBeUndefined();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("fans out readyz probes to accounts, billing, and content when CONSOLE_PING_UPSTREAM_PROBE=true", async () => {
    vi.stubEnv("CONSOLE_PING_UPSTREAM_PROBE", "true");
    vi.stubEnv("RUNTIME_AUTH_URL", "http://web-saas-accounts.web-saas-prod.svc.cluster.local:80/");
    vi.stubEnv("RUNTIME_BILLING_SERVICE_URL", "http://web-saas-billing.web-saas-prod.svc.cluster.local:80");
    vi.stubEnv("RUNTIME_DOCS_SERVICE_URL", "http://web-saas-content.web-saas-prod.svc.cluster.local:80");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ready" }), { status: 200 }),
    );
    try {
      const { GET } = await import("./route");
      const response = await GET(new Request("https://console.svc.plus/api/ping"));
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(fetchSpy.mock.calls.map((c) => c[0])).toEqual([
        "http://web-saas-accounts.web-saas-prod.svc.cluster.local:80/readyz",
        "http://web-saas-billing.web-saas-prod.svc.cluster.local:80/readyz",
        "http://web-saas-content.web-saas-prod.svc.cluster.local:80/readyz",
      ]);
      expect(data.upstreams).toEqual({
        accounts: { ok: true, status: 200 },
        billing: { ok: true, status: 200 },
        content: { ok: true, status: 200 },
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
