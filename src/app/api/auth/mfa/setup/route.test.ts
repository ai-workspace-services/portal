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

function buildRequest() {
  return new NextRequest("https://console.svc.plus/api/auth/mfa/setup", {
    method: "POST",
    headers: {
      host: "console.svc.plus",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
}

function provisionResponse() {
  return new Response(
    JSON.stringify({
      secret: "JBSWY3DPEHPK3PXP",
      otpauth_url: "otpauth://totp/svc.plus:user?secret=JBSWY3DPEHPK3PXP",
      mfaToken: "fresh-challenge",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("/api/auth/mfa/setup", () => {
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

  it("provisions against /mfa/totp/provision", async () => {
    stubCookies({ xc_session: "session-token" });
    const fetchMock = vi.fn().mockResolvedValue(provisionResponse());
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    const response = await POST(buildRequest());

    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://accounts.svc.plus/api/auth/mfa/totp/provision");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer session-token",
    });
  });

  // 回归: 后端 provisionTOTP 里 token 优先于 session, 挑战对不上就 401 且不看
  // session。挑战是 accounts 的进程内存态, 容器一重启就没了, 而浏览器里那个
  // cookie 还在 —— 已登录用户会被判成"会话过期"、密钥框空白。
  it("ignores a stale challenge cookie when a session exists", async () => {
    stubCookies({
      xc_session: "session-token",
      xc_mfa_challenge: "stale-challenge",
    });
    const fetchMock = vi.fn().mockResolvedValue(provisionResponse());
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    await POST(buildRequest());

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({});
  });

  // 登录期(needMfa 跳转过来, 还没有 session)只能靠挑战 token 认身份。
  it("still forwards the challenge token when there is no session", async () => {
    stubCookies({ xc_mfa_challenge: "login-challenge" });
    const fetchMock = vi.fn().mockResolvedValue(provisionResponse());
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    await POST(buildRequest());

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ token: "login-challenge" });
    expect(init.headers).not.toHaveProperty("Authorization");
  });
});
