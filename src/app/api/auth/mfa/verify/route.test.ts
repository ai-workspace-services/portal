// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const cookiesMock = vi.hoisted(() => vi.fn());
const ORIGINAL_ENV = { ...process.env };

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

function stubCookies(values: Record<string, string>) {
  cookiesMock.mockResolvedValue({
    get(name: string) {
      const value = values[name];
      return value === undefined ? undefined : { value };
    },
  });
}

function buildRequest(body: unknown) {
  return new NextRequest("https://console.svc.plus/api/auth/mfa/verify", {
    method: "POST",
    headers: {
      host: "console.svc.plus",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("/api/auth/mfa/verify", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    cookiesMock.mockReset();
    process.env = { ...ORIGINAL_ENV };
    process.env.ACCOUNT_SERVICE_URL = "https://accounts.svc.plus";
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    process.env = ORIGINAL_ENV;
  });

  // 回归: 绑定确认必须打 /mfa/totp/verify。曾经打的是 /mfa/verify(登录期二次
  // 校验), 那条后端会先断言 user.MFAEnabled 已为 true, 首次绑定必然
  // mfa_not_enabled; 且它的入参叫 mfa_ticket/mfaToken 而不是 token。
  it("confirms a new binding against /mfa/totp/verify with a token field", async () => {
    stubCookies({
      xc_session: "session-token",
      xc_mfa_challenge: "challenge-token",
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "mfa_verified",
          token: "new-session-token",
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    const response = await POST(buildRequest({ code: "123456" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://accounts.svc.plus/api/auth/mfa/totp/verify");
    expect(JSON.parse(String(init.body))).toEqual({
      token: "challenge-token",
      code: "123456",
    });
  });

  // 回归: /mfa/totp/verify 挂在 authProtected 组下, 只认 Authorization 头。
  it("translates the session cookie into an Authorization header", async () => {
    stubCookies({
      xc_session: "session-token",
      xc_mfa_challenge: "challenge-token",
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: "new-session-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    await POST(buildRequest({ code: "123456" }));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      Authorization: "Bearer session-token",
    });
  });

  it("rejects without a challenge token before calling accounts", async () => {
    stubCookies({ xc_session: "session-token" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    const response = await POST(buildRequest({ code: "123456" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "mfa_token_required",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
