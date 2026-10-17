// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ORIGINAL_ENV = { ...process.env };

describe("/api/auth/password/forgot/send-code", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env = {
      ...ORIGINAL_ENV,
      ACCOUNT_SERVICE_URL: "https://accounts.svc.plus",
    };
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    process.env = ORIGINAL_ENV;
  });

  it("normalizes the email and proxies the enumeration-safe request to Accounts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "if the account exists a reset code will be sent",
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest(
        "https://console.svc.plus/api/auth/password/forgot/send-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            host: "console.svc.plus",
          },
          body: JSON.stringify({ email: " Person@Example.com " }),
        },
      ),
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/password\/forgot\/send-code$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "person@example.com" }),
        cache: "no-store",
      }),
    );
  });

  it("returns a generic gateway failure when Accounts is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest(
        "https://console.svc.plus/api/auth/password/forgot/send-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "person@example.com" }),
        },
      ),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "account_service_unreachable",
    });
  });
});
