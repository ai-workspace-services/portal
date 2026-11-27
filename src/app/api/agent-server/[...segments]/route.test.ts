import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveOrigin, proxyFactory, proxy, resolveSession } = vi.hoisted(
  () => ({
    resolveOrigin: vi.fn((host: string) => `https://agent-server-for-${host}`),
    proxy: vi.fn(async () => new Response("[]")),
    proxyFactory: vi.fn(),
    resolveSession: vi.fn(async () => ({ token: "test-session" })),
  }),
);
vi.mock("@server/serviceConfig", () => ({
  getAgentServerServiceBaseUrl: resolveOrigin,
}));
vi.mock("@server/account/session", () => ({
  getAccountSession: resolveSession,
}));
vi.mock("@lib/apiProxy", () => ({ createUpstreamProxyHandler: proxyFactory }));
import { GET } from "./route";

describe("agent discovery request environment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proxyFactory.mockReturnValue(proxy);
  });
  it("resolves each request host to agent-server control plane rather than freezing a build-time origin", async () => {
    for (const host of [
      "console-serverless-uat.onwalk.net",
      "console.svc.plus",
    ]) {
      for (const endpoint of [
        "/api/agent-server/v1/nodes",
        "/api/agent-server/v1/regional-pools",
      ]) {
        const request = new NextRequest(`https://${host}${endpoint}`);
        await GET(request);
        expect(resolveOrigin).toHaveBeenLastCalledWith(host);
        const options = proxyFactory.mock.calls.at(-1)![0];
        expect(options.upstreamBaseUrl).toBe(`https://agent-server-for-${host}`);
        expect(options.upstreamPathPrefix).toBe("/api/agent-server");
        expect(await options.getAdditionalHeaders(request)).toEqual({
          authorization: "Bearer test-session",
          "x-account-session": "test-session",
        });
      }
    }
  });
  it("preserves an explicit agent Authorization header", async () => {
    const request = new NextRequest(
      "https://console-serverless-uat.onwalk.net/api/agent-server/v1/users",
      { headers: { authorization: "Bearer test-agent" } },
    );
    await GET(request);
    expect(
      await proxyFactory.mock.calls[0][0].getAdditionalHeaders(request),
    ).toBeUndefined();
    expect(resolveSession).not.toHaveBeenCalled();
  });
});
