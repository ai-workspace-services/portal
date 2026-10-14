// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  permission: vi.fn(),
}));
vi.mock("@server/account/session", () => ({
  getAccountSession: mocks.session,
  userHasRoleOrPermission: mocks.permission,
}));
vi.mock("@server/serviceConfig", () => ({
  getAccountServiceApiBaseUrl: () => "http://accounts:8080/api/auth",
}));

import { GET } from "./route";

describe("selfhost admin metrics auth boundary", () => {
  const request = () =>
    new NextRequest("https://console.svc.plus/api/auth/admin/users/metrics");
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mocks.session.mockResolvedValue({
      user: { role: "admin" },
      token: "test-session",
    });
    mocks.permission.mockResolvedValue(true);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("forwards the authenticated request and all counts unchanged", async () => {
    const payload = {
      overview: {
        totalUsers: 24,
        activeUsers: 23,
        subscribedUsers: 0,
        newUsersLast24h: 0,
      },
      series: { daily: [], weekly: [] },
    };
    fetchMock.mockResolvedValue(Response.json(payload));
    const req = request();
    const response = await GET(req);
    expect(mocks.session).toHaveBeenCalledWith(req);
    expect(mocks.permission).toHaveBeenCalledWith(
      { role: "admin" },
      ["admin", "operator"],
      ["admin.users.metrics.read"],
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://accounts:8080/api/auth/admin/users/metrics",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer test-session",
          Accept: "application/json",
        },
        cache: "no-store",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
  });

  it("rejects unauthenticated requests", async () => {
    mocks.session.mockResolvedValue({ user: null });
    expect((await GET(request())).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves the admin permission boundary", async () => {
    mocks.permission.mockResolvedValue(false);
    expect((await GET(request())).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves upstream failures instead of presenting zero counts", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: "metrics_unavailable" }, { status: 503 }),
    );
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "metrics_unavailable" });
  });
});
