// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const cookiesMock = vi.hoisted(() => vi.fn());
const ORIGINAL_ENV = { ...process.env };

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

function stubSession(token?: string) {
  cookiesMock.mockResolvedValue({
    get(name: string) {
      return name === "xc_session" && token ? { value: token } : undefined;
    },
  });
}

describe("/api/auth/mfa/disable", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    cookiesMock.mockReset();
    process.env = {
      ...ORIGINAL_ENV,
      ACCOUNT_SERVICE_URL: "https://accounts.svc.plus",
    };
    delete process.env.NEXT_PUBLIC_ACCOUNT_SERVICE_URL;
    delete process.env.RUNTIME_ENV;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    process.env = ORIGINAL_ENV;
  });

  it("requires a session before forwarding the disable request", async () => {
    stubSession();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(
      new NextRequest("https://console.svc.plus/api/auth/mfa/disable", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "session_required",
    });
  });

  it("forwards the current authenticator code to Accounts", async () => {
    stubSession("portal-session");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: "mfa_disabled" }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");
    const request = new NextRequest(
      "https://console.svc.plus/api/auth/mfa/disable",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "123456" }),
      },
    );

    const response = await POST(request);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(response.status).toBe(200);
    expect(url).toMatch(/\/api\/auth\/mfa\/disable$/);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer portal-session",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toEqual({ code: "123456" });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { message: "mfa_disabled" },
    });
  });
});
