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

describe("/api/auth/mfa/recovery-codes", () => {
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

  it("requires the session and never calls Accounts without it", async () => {
    stubSession();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest("https://console.svc.plus/api/auth/mfa/recovery-codes"),
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("forwards one-time code issuance through the authenticated Accounts contract", async () => {
    stubSession("portal-session");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ recoveryCodes: ["ABCDE-FGHIJ-KLMNO-PQRST"] }),
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");
    const request = new NextRequest(
      "https://console.svc.plus/api/auth/mfa/recovery-codes",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "123456" }),
      },
    );

    const response = await POST(request);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toMatch(/\/api\/auth\/mfa\/recovery-codes$/);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer portal-session",
    });
    expect(JSON.parse(String(init.body))).toEqual({ code: "123456" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      recoveryCodes: ["ABCDE-FGHIJ-KLMNO-PQRST"],
    });
  });

  it("forwards revocation as DELETE and preserves the factor body", async () => {
    stubSession("portal-session");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ revokedCount: 4 }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { DELETE } = await import("./route");
    const request = new NextRequest(
      "https://console.svc.plus/api/auth/mfa/recovery-codes",
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "123456" }),
      },
    );

    const response = await DELETE(request);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("DELETE");
    expect(JSON.parse(String(init.body))).toEqual({ code: "123456" });
    await expect(response.json()).resolves.toEqual({ revokedCount: 4 });
  });
});
