import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { proxy } = vi.hoisted(() => ({ proxy: vi.fn() }));
vi.mock("@lib/apiProxy", () => ({ createUpstreamProxyHandler: () => proxy }));
vi.mock("@server/account/session", () => ({ getAccountSession: vi.fn() }));
vi.mock("@server/serviceConfig", () => ({
  getAccountServiceBaseUrl: () => "http://accounts.test",
}));
import { GET } from "./route";

describe("optional account policy", () => {
  it("returns an uncached empty state only for a missing policy snapshot", async () => {
    proxy.mockResolvedValueOnce(
      Response.json({ error: "policy_not_found" }, { status: 404 }),
    );
    const response = await GET(
      new NextRequest("https://console.test/api/account/policy"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it.each([
    [404, "not_found"],
    [401, "invalid_session"],
    [403, "account_suspended"],
    [500, "account_policy_unavailable"],
  ])("preserves %s %s", async (status, error) => {
    proxy.mockResolvedValueOnce(
      Response.json({ error }, { status: status as number }),
    );
    const response = await GET(
      new NextRequest("https://console.test/api/account/policy"),
    );
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
  });
});
