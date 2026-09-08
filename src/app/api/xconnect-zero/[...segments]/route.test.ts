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

  it("allowlists owner-scoped registration reads with manage permission and no-store", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "account-session-token",
      user: { role: "user" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(true);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ registrations: [], has_more: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "https://console-cloudflare-uat.onwalk.net/api/xconnect-zero/registrations",
      ),
      { params: Promise.resolve({ segments: ["registrations"] }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      registrations: [],
      has_more: true,
    });
    expect(userHasRoleOrPermissionMock).toHaveBeenCalledWith(
      { role: "user" },
      ["admin", "operator", "user"],
      ["xconnect.zero.manage"],
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/overlay\/v1\/admin\/registrations$/),
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer account-session-token",
          Accept: "application/json",
        },
      }),
    );
  });

  it("forwards only the exact registration approval and rejection paths", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "account-session-token",
      user: { role: "admin" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(true);
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ registration: { status: "approved" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    const approved = await POST(
      new NextRequest(
        "https://console-cloudflare-uat.onwalk.net/api/xconnect-zero/registrations/reg-1/approve",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ network_id: "net-a" }),
        },
      ),
      {
        params: Promise.resolve({
          segments: ["registrations", "reg-1", "approve"],
        }),
      },
    );
    const rejected = await POST(
      new NextRequest(
        "https://console-cloudflare-uat.onwalk.net/api/xconnect-zero/registrations/reg-1/reject",
        { method: "POST" },
      ),
      {
        params: Promise.resolve({
          segments: ["registrations", "reg-1", "reject"],
        }),
      },
    );

    expect(approved.status).toBe(200);
    expect(rejected.status).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/admin\/registrations\/reg-1\/approve$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ network_id: "net-a" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/admin\/registrations\/reg-1\/reject$/),
      expect.objectContaining({ method: "POST", body: undefined }),
    );
  });

  it("rejects oversized registration mutations before forwarding", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "account-session-token",
      user: { role: "admin" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(true);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest(
        "https://console-cloudflare-uat.onwalk.net/api/xconnect-zero/registrations/reg-1/approve",
        {
          method: "POST",
          headers: { "content-length": "20000" },
          body: JSON.stringify({ network_id: "net-a" }),
        },
      ),
      {
        params: Promise.resolve({
          segments: ["registrations", "reg-1", "approve"],
        }),
      },
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "request_too_large",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bounds chunked registration requests without Content-Length and cancels the reader", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "session",
      user: { role: "user" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(true);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(17 * 1024));
      },
      cancel,
    });
    const { POST } = await import("./route");
    const result = await POST(
      new NextRequest(
        "https://console.svc.plus/api/xconnect-zero/registrations/reg/approve",
        {
          method: "POST",
          body: stream,
          ...({ duplex: "half" } as { duplex: "half" }),
        },
      ),
      {
        params: Promise.resolve({
          segments: ["registrations", "reg", "approve"],
        }),
      },
    );
    expect(result.status).toBe(413);
    expect(cancel).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bounds chunked registration responses and handles reader failures", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "session",
      user: { role: "user" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(true);
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(257 * 1024));
      },
      cancel,
    });
    const broken = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error("private upstream error"));
      },
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(stream))
        .mockResolvedValueOnce(new Response(broken)),
    );
    const { GET } = await import("./route");
    for (let i = 0; i < 2; i++) {
      const result = await GET(
        new NextRequest(
          "https://console.svc.plus/api/xconnect-zero/registrations",
        ),
        { params: Promise.resolve({ segments: ["registrations"] }) },
      );
      expect(result.status).toBe(502);
      await expect(result.json()).resolves.toEqual({
        error: "invalid_response",
      });
    }
    expect(cancel).toHaveBeenCalled();
  });

  it("preserves registration mutation 404 and restricts approval to POST", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "session",
      user: { role: "user" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(true);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "not_found" }), { status: 404 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { POST, GET } = await import("./route");
    const context = {
      params: Promise.resolve({
        segments: ["registrations", "reg", "approve"],
      }),
    };
    const result = await POST(
      new NextRequest(
        "https://console.svc.plus/api/xconnect-zero/registrations/reg/approve",
        { method: "POST" },
      ),
      context,
    );
    expect(result.status).toBe(404);
    await expect(result.json()).resolves.toEqual({ error: "not_found" });
    const denied = await GET(
      new NextRequest(
        "https://console.svc.plus/api/xconnect-zero/registrations/reg/approve",
      ),
      context,
    );
    expect(denied.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not impose registration size caps on existing policy routes", async () => {
    getAccountSessionMock.mockResolvedValue({
      token: "session",
      user: { role: "user" },
    });
    userHasRoleOrPermissionMock.mockResolvedValue(true);
    const large = JSON.stringify({ policy: "x".repeat(300 * 1024) });
    const fetchMock = vi.fn().mockResolvedValue(new Response(large));
    vi.stubGlobal("fetch", fetchMock);
    const { PUT } = await import("./route");
    const result = await PUT(
      new NextRequest(
        "https://console.svc.plus/api/xconnect-zero/networks/net/policy",
        { method: "PUT", body: large },
      ),
      { params: Promise.resolve({ segments: ["networks", "net", "policy"] }) },
    );
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual(JSON.parse(large));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: large }),
    );
  });

  it("injects the trusted bootstrap controller while preserving network and invite fields", async () => {
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
