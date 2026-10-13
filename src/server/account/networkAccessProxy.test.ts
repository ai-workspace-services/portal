// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  access: vi.fn(),
  base: vi.fn(),
}));
vi.mock("./session", () => ({ getAccountSession: mocks.session }));
vi.mock("./adminAccess", () => ({ evaluateAccountAdminAccess: mocks.access }));
vi.mock("@server/serviceConfig", () => ({
  getAccountServiceApiBaseUrl: mocks.base,
}));
import { proxyNetworkAccess } from "./networkAccessProxy";

describe("network access BFF", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    mocks.session.mockResolvedValue({
      user: { id: "operator", role: "admin" },
      token: "session-token",
    });
    mocks.access.mockResolvedValue({ allowed: true });
    mocks.base.mockReturnValue("https://accounts.example/api/auth");
  });
  afterEach(() => vi.unstubAllGlobals());
  it("requires a session before revealing team access", async () => {
    mocks.session.mockResolvedValue({ user: null, token: null });
    expect(
      (
        await proxyNetworkAccess(
          new NextRequest("https://console.example/api/auth/network-access"),
          "network-access",
        )
      ).status,
    ).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects unauthorized membership changes before sending upstream", async () => {
    mocks.access.mockResolvedValue({ allowed: false });
    expect(
      (
        await proxyNetworkAccess(
          new NextRequest(
            "https://console.example/api/admin/users/u/network-access",
            { method: "PUT", body: "{}" },
          ),
          "admin/users/u/network-access",
          "admin.users.role.write",
        )
      ).status,
    ).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("preserves the authoritative result and current session across an operator write", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "team_member_limit" }), {
        status: 409,
      }),
    );
    const body = JSON.stringify({
      mode: "dedicated",
      teamId: "acme",
      reason: "approved order",
    });
    const result = await proxyNetworkAccess(
      new NextRequest(
        "https://uat-console.example/api/admin/users/u/network-access",
        { method: "PUT", body },
      ),
      "admin/users/u/network-access",
      "admin.users.role.write",
    );
    expect(result.status).toBe(409);
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://accounts.example/api/auth/admin/users/u/network-access",
      expect.objectContaining({
        method: "PUT",
        body,
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      }),
    );
  });
});
