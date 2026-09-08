// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAccountSessionMock = vi.hoisted(() => vi.fn());
const userHasRoleOrPermissionMock = vi.hoisted(() => vi.fn());
const getXConnectZeroServiceBaseUrlMock = vi.hoisted(() => vi.fn());

vi.mock("@server/account/session", () => ({
  getAccountSession: getAccountSessionMock,
  userHasRoleOrPermission: userHasRoleOrPermissionMock,
}));
vi.mock("@server/serviceConfig", () => ({
  getXConnectZeroServiceBaseUrl: getXConnectZeroServiceBaseUrlMock,
}));

describe("/api/xconnect-zero/[...segments]", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
    delete process.env.INTERNAL_SERVICE_TOKEN;
    getAccountSessionMock.mockReset();
    userHasRoleOrPermissionMock.mockReset();
    getXConnectZeroServiceBaseUrlMock.mockReturnValue(
      "https://accounts-cloudflare-uat.onwalk.net",
    );
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
      new NextRequest("https://console.svc.plus/api/xconnect-zero/overview", {
        headers: { "x-forwarded-host": "console.svc.plus" },
      }),
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
      expect.stringMatching(/\/api\/overlay\/v1\/admin\/overview$/),
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer account-session-token",
          Accept: "application/json",
        },
      }),
    );
  });

  it("forwards an owner-scoped device invite request to Accounts", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "account-session-token",
      user: { role: "admin" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(true);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ join_uri: "xconnect://join/redacted" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest(
        "https://console-cloudflare-uat.onwalk.net/api/xconnect-zero/invites",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            controller_url: "https://untrusted.invalid",
            network_id: "uat-net",
            device_id: "mac-one",
            platform: "darwin",
            role: "one",
          }),
        },
      ),
      { params: Promise.resolve({ segments: ["invites"] }) },
    );

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/overlay\/v1\/admin\/invites$/),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining(
          '"controller_url":"https://accounts-cloudflare-uat.onwalk.net"',
        ),
      }),
    );
  });

  it("derives controller_url when an invite request omits it", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "account-session-token",
      user: { role: "admin" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(true);
    let forwardedInit: RequestInit | undefined;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      forwardedInit = init;
      return new Response(
        JSON.stringify({ join_uri: "xconnect://join/redacted" }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    await POST(
      new NextRequest(
        "https://console-cloudflare-uat.onwalk.net/api/xconnect-zero/invites",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            network_id: "uat-net",
            device_id: "linux-gateway",
            platform: "linux",
            role: "gateway",
          }),
        },
      ),
      { params: Promise.resolve({ segments: ["invites"] }) },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/overlay\/v1\/admin\/invites$/),
      expect.objectContaining({
        body: expect.stringContaining(
          '"controller_url":"https://accounts-cloudflare-uat.onwalk.net"',
        ),
      }),
    );
  });

  it("injects the trusted bootstrap controller while preserving network and invite fields", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "account-session-token",
      user: { role: "admin" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(true);
    let forwardedInit: RequestInit | undefined;
    const fetchMock = vi.fn(
      async (_url: string, init?: RequestInit) => {
        forwardedInit = init;
        return new Response(JSON.stringify({ join_uri: "xconnect://join/redacted" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    await POST(
      new NextRequest(
        "https://console-cloudflare-uat.onwalk.net/api/xconnect-zero/networks/bootstrap",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            controller_url: "https://untrusted.invalid",
            network: {
              id: "net-new",
              display_name: "UAT network",
              cidr: "10.80.0.0/24",
              gateway_id: "gw-new",
              gateway_wireguard_public_key: "public-key",
              gateway_wireguard_address: "10.80.0.1/32",
              gateway_endpoint_host: "gw-new.example",
              gateway_endpoint_port: 51820,
              transport_server_name: "gw-new.example",
              transport_port: 443,
              transport_auth_id: "auth-id",
            },
            invite: {
              device_id: "gw-new",
              platform: "linux",
              role: "gateway",
              expires_at: "2026-09-08T12:00:00Z",
            },
          }),
        },
      ),
      { params: Promise.resolve({ segments: ["networks", "bootstrap"] }) },
    );

    const forwarded = JSON.parse(String(forwardedInit?.body)) as Record<
      string,
      unknown
    >;
    expect(forwarded.controller_url).toBe(
      "https://accounts-cloudflare-uat.onwalk.net",
    );
    expect(forwarded.network).toMatchObject({
      id: "net-new",
      gateway_id: "gw-new",
      gateway_endpoint_port: 51820,
    });
    expect(forwarded.invite).toMatchObject({
      device_id: "gw-new",
      role: "gateway",
      platform: "linux",
    });
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

  it("preserves an Accounts authorization error instead of treating it as an invalid overview", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "account-session-token",
      user: { role: "admin" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("https://console.svc.plus/api/xconnect-zero/overview"),
      { params: Promise.resolve({ segments: ["overview"] }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "forbidden" });
  });

  it("does not expose unregistered adapter paths", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("https://console.svc.plus/api/xconnect-zero/unknown"),
      { params: Promise.resolve({ segments: ["unknown"] }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "control_plane_unavailable",
    });
    expect(getAccountSessionMock).not.toHaveBeenCalled();
  });
});
