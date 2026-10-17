// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const cookiesMock = vi.hoisted(() => vi.fn());
const ORIGINAL_ENV = { ...process.env };

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

describe("/api/auth/mfa/status", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    cookiesMock.mockReset();
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

    const { GET } = await import("./route");
    const request = new NextRequest(
      "https://console.svc.plus/api/auth/mfa/status?identifier=admin%40svc.plus",
      {
        headers: {
          host: "console.svc.plus",
        },
      },
    );

    const response = await GET(request);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "account_service_misconfigured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards identifier and session token to accounts", async () => {
    process.env.ACCOUNT_SERVICE_URL = "https://accounts.svc.plus";
    cookiesMock.mockResolvedValue({
      get(name: string) {
        if (name === "xc_session") {
          return { value: "session-token" };
        }
        return undefined;
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ mfa: { totpEnabled: true } }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("./route");
    const request = new NextRequest(
      "https://console.svc.plus/api/auth/mfa/status?identifier=admin%40svc.plus",
      {
        headers: {
          host: "console.svc.plus",
        },
      },
    );

    const response = await GET(request);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      mfa: { totpEnabled: true },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://prod-accounts-1004637461064.asia-northeast1.run.app/api/auth/mfa/status?identifier=admin%40svc.plus",
      expect.any(Object),
    );
    expect(init.headers).toMatchObject({
      Accept: "application/json",
      Authorization: "Bearer session-token",
    });
  });
});
