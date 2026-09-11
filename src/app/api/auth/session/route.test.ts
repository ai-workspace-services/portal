// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const cookiesMock = vi.hoisted(() => vi.fn());
const ORIGINAL_ENV = { ...process.env };

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

describe("/api/auth/session", () => {
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

  it("drops guest sessions instead of exposing them as authenticated users", async () => {
    cookiesMock.mockResolvedValue({
      get(name: string) {
        if (name === "xc_session") {
          return { value: "guest-session-token" };
        }
        return undefined;
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "guest-1",
            email: "guest@svc.plus",
            role: "guest",
            username: "guest",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("./route");
    const request = new NextRequest("https://console.svc.plus/api/auth/session", {
      headers: {
        host: "console.svc.plus",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user: null });
  });

  function sessionRequest() {
    return new NextRequest("https://console.svc.plus/api/auth/session", {
      headers: {
        host: "console.svc.plus",
      },
    });
  }

  function withSessionCookie() {
    cookiesMock.mockResolvedValue({
      get(name: string) {
        if (name === "xc_session") {
          return { value: "a-valid-session-token" };
        }
        return undefined;
      },
    });
  }

  function clearsSessionCookie(response: Response): boolean {
    return response.headers
      .getSetCookie()
      .some(
        (cookie) =>
          cookie.startsWith("xc_session=;") ||
          /xc_session=;/.test(cookie) ||
          /xc_session=[^;]*;[^]*Max-Age=0/.test(cookie),
      );
  }

  it("keeps the session cookie when the account service refuses the account", async () => {
    withSessionCookie();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "account_suspended",
            message: "your account has been suspended",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const { GET } = await import("./route");
    const response = await GET(sessionRequest());

    // A 403 says the account is blocked, not that the token stopped being a
    // session. Dropping the cookie here is what turned a suspended account
    // into a silent bounce back to /login.
    await expect(response.json()).resolves.toEqual({
      user: null,
      error: "account_suspended",
    });
    expect(clearsSessionCookie(response)).toBe(false);
  });

  it("keeps the session cookie when the account service is unreachable", async () => {
    withSessionCookie();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")),
    );

    const { GET } = await import("./route");
    const response = await GET(sessionRequest());

    await expect(response.json()).resolves.toEqual({
      user: null,
      error: "session_unavailable",
    });
    expect(clearsSessionCookie(response)).toBe(false);
  });

  it("keeps the session cookie when the account service fails", async () => {
    withSessionCookie();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "internal_error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const { GET } = await import("./route");
    const response = await GET(sessionRequest());

    await expect(response.json()).resolves.toEqual({
      user: null,
      error: "internal_error",
    });
    expect(clearsSessionCookie(response)).toBe(false);
  });

  it("clears the session cookie when the token is no longer a session", async () => {
    withSessionCookie();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "session not found" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const { GET } = await import("./route");
    const response = await GET(sessionRequest());

    await expect(response.json()).resolves.toEqual({
      user: null,
      error: "session_expired",
    });
    expect(clearsSessionCookie(response)).toBe(true);
  });

  it("accepts the default member role used by newly created accounts", async () => {
    withSessionCookie();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            user: {
              id: "new-user-1",
              email: "new-user@example.com",
              role: "member",
              username: "new-user",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const { GET } = await import("./route");
    const response = await GET(sessionRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      user: { id: "new-user-1", role: "user" },
    });
  });
});
