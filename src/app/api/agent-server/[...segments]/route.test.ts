import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveOrigin, proxyFactory, proxy, resolveSession } = vi.hoisted(
  () => ({
    resolveOrigin: vi.fn((host: string) => `https://accounts-for-${host}`),
    proxy: vi.fn(async () => new Response("[]")),
    proxyFactory: vi.fn(),
    resolveSession: vi.fn(async () => ({ token: "test-session" })),
  }),
);
vi.mock("@server/serviceConfig", () => ({
  getAccountServiceBaseUrl: resolveOrigin,
}));
vi.mock("@server/account/session", () => ({
  getAccountSession: resolveSession,
  resolveForwardedHost: (request: NextRequest) =>
    request.headers.get("x-forwarded-host") ?? request.nextUrl.hostname,
}));
vi.mock("@lib/apiProxy", () => ({ createUpstreamProxyHandler: proxyFactory }));
import { GET } from "./route";

describe("agent discovery request environment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proxyFactory.mockReturnValue(proxy);
  });
  it("resolves each request host rather than freezing a build-time origin", async () => {
    for (const host of [
      "console-serverless-uat.onwalk.net",
      "console.svc.plus",
    ]) {
      const request = new NextRequest(
        `https://${host}/api/agent-server/v1/nodes`,
      );
      await GET(request);
      expect(resolveOrigin).toHaveBeenLastCalledWith(host);
      const options = proxyFactory.mock.calls.at(-1)![0];
      expect(options.upstreamBaseUrl).toBe(`https://accounts-for-${host}`);
      expect(await options.getAdditionalHeaders(request)).toEqual({
        authorization: "Bearer test-session",
        "x-account-session": "test-session",
      });
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
