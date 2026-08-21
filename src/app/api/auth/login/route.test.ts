// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ORIGINAL_ENV = { ...process.env };

describe("/api/auth/login", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ACCOUNT_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_ACCOUNT_SERVICE_URL;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    process.env = ORIGINAL_ENV;
  });

  it("fails fast when account service points back to console", async () => {
    process.env.ACCOUNT_SERVICE_URL = "https://console.svc.plus";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    const request = new NextRequest("https://console.svc.plus/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "console.svc.plus",
      },
      body: JSON.stringify({
        email: "admin@svc.plus",
        password: "Secret123!",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "account_service_misconfigured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves upstream 404 responses", async () => {
    process.env.ACCOUNT_SERVICE_URL = "https://accounts.svc.plus";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "user_not_found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    const request = new NextRequest("https://console.svc.plus/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "console.svc.plus",
      },
      body: JSON.stringify({
        email: "admin@svc.plus",
        password: "Secret123!",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "user_not_found",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://accounts.svc.plus/api/auth/login",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("forwards the canonical totpCode field to Accounts", async () => {
    process.env.ACCOUNT_SERVICE_URL = "https://accounts.svc.plus";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          token: "session-token",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    const request = new NextRequest("https://console.svc.plus/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "console.svc.plus",
      },
      body: JSON.stringify({
        identifier: "admin@svc.plus",
        password: "Secret123!",
        totpCode: "123456",
      }),
    });

    const response = await POST(request);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, string>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      identifier: "admin@svc.plus",
      password: "Secret123!",
      totpCode: "123456",
    });
  });
});
