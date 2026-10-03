// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const cookiesMock = vi.hoisted(() => vi.fn());
const ORIGINAL_ENV = { ...process.env };

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

describe("/api/auth/password/reset/mfa", () => {
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
    cookiesMock.mockResolvedValue({
      get(name: string) {
        return name === "xc_session" ? { value: "session-token" } : undefined;
      },
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    process.env = ORIGINAL_ENV;
  });

  it("forwards the selected factor and clears the revoked session cookie on success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ sessionsRevoked: true }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");
    const request = new NextRequest(
      "https://console.svc.plus/api/auth/password/reset/mfa",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "recovery_code",
          code: "ABCDE-FGHIJ-KLMNO-PQRST",
          password: "new-password-9",
        }),
      },
    );

    const response = await POST(request);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toMatch(/\/api\/auth\/password\/reset\/mfa$/);
    expect(init.headers).toMatchObject({
      Authorization: "Bearer session-token",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      method: "recovery_code",
      code: "ABCDE-FGHIJ-KLMNO-PQRST",
      password: "new-password-9",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.cookies.get("xc_session")?.value).toBe("");
  });
});
