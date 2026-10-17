// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ORIGINAL_ENV = { ...process.env };

describe("/api/auth/password/forgot/confirm-code", () => {
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

  it("proxies only the email, six-digit code and new password", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "password reset successful" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest(
        "https://console.svc.plus/api/auth/password/forgot/confirm-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            host: "console.svc.plus",
          },
          body: JSON.stringify({
            email: " Person@Example.com ",
            code: " 012345 ",
            password: "newPassword123",
            ignored: "discard-me",
          }),
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/password\/forgot\/confirm-code$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "person@example.com",
          code: "012345",
          password: "newPassword123",
        }),
        cache: "no-store",
      }),
    );
  });

  it("preserves the expired-code status for the recovery page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "code_expired" }), {
          status: 410,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest(
        "https://console.svc.plus/api/auth/password/forgot/confirm-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "person@example.com",
            code: "012345",
            password: "newPassword123",
          }),
        },
      ),
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({ error: "code_expired" });
  });
});
