import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveOrigin, proxyFactory, proxy } = vi.hoisted(() => ({
  resolveOrigin: vi.fn((host: string) => `https://agent-server-for-${host}`),
  proxy: vi.fn(async () => new Response("[]")),
  proxyFactory: vi.fn(),
}));

vi.mock("@server/serviceConfig", () => ({
  getAgentServerServiceBaseUrl: resolveOrigin,
}));
vi.mock("@lib/apiProxy", () => ({ createUpstreamProxyHandler: proxyFactory }));

import { GET } from "./route";

describe("/api/agent/[...segments]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proxyFactory.mockReturnValue(proxy);
  });

  it("routes legacy agent node discovery through the agent-server origin", async () => {
    const request = new NextRequest("https://console.svc.plus/api/agent/nodes", {
      headers: { "x-forwarded-host": "console.svc.plus" },
    });

    await GET(request);

    expect(resolveOrigin).toHaveBeenCalledWith("console.svc.plus");
    expect(proxyFactory).toHaveBeenCalledWith({
      upstreamBaseUrl: "https://agent-server-for-console.svc.plus",
      upstreamPathPrefix: "/api/agent",
    });
    expect(proxy).toHaveBeenCalledWith(request);
  });
});
