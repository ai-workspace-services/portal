// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAccountSessionMock = vi.hoisted(() => vi.fn());
const userHasRoleOrPermissionMock = vi.hoisted(() => vi.fn());

vi.mock("@server/account/session", () => ({
  getAccountSession: getAccountSessionMock,
  userHasRoleOrPermission: userHasRoleOrPermissionMock,
}));

describe("/api/xconnect-zero/[...segments]", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env = {
      ...originalEnv,
      ACCOUNT_SERVICE_URL: "https://accounts.svc.plus",
    };
    delete process.env.INTERNAL_SERVICE_TOKEN;
    getAccountSessionMock.mockReset();
    userHasRoleOrPermissionMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = originalEnv;
  });

  it("requires an authenticated account session", async () => {
    getAccountSessionMock.mockResolvedValue({ token: undefined, user: null });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("https://console.svc.plus/api/xconnect-zero/overview"),
      { params: Promise.resolve({ segments: ["overview"] }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthenticated",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("enforces Zero read access before forwarding the user session", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "account-session-token",
      user: { role: "user" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("https://console.svc.plus/api/xconnect-zero/overview"),
      { params: Promise.resolve({ segments: ["overview"] }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "forbidden" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards only the authenticated user bearer to the reserved admin endpoint", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "account-session-token",
      user: { role: "admin" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(true);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "available",
          networkCount: 1,
          deviceCount: 2,
          gatewayCount: 1,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("https://console.svc.plus/api/xconnect-zero/overview"),
      { params: Promise.resolve({ segments: ["overview"] }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "available",
      networkCount: 1,
      deviceCount: 2,
      gatewayCount: 1,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://accounts.svc.plus/api/overlay/v1/admin/overview",
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer account-session-token",
          Accept: "application/json",
        },
      }),
    );
  });

  it("turns an unimplemented accounts endpoint into an explicit unavailable response", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "account-session-token",
      user: { role: "admin" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not found", { status: 404 })),
    );

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("https://console.svc.plus/api/xconnect-zero/overview"),
      { params: Promise.resolve({ segments: ["overview"] }) },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "control_plane_unavailable",
    });
  });

  it("does not expose unregistered adapter paths", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("https://console.svc.plus/api/xconnect-zero/devices"),
      { params: Promise.resolve({ segments: ["devices"] }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "control_plane_unavailable",
    });
    expect(getAccountSessionMock).not.toHaveBeenCalled();
  });
});
