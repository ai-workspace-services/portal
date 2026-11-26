// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  access: vi.fn(),
}));

vi.mock("@server/account/session", () => ({
  getAccountSession: mocks.session,
}));

vi.mock("@server/account/adminAccess", () => ({
  evaluateAccountAdminAccess: mocks.access,
}));

vi.mock("@server/serviceConfig", () => ({
  getAccountServiceApiBaseUrl: () => "https://accounts.test/api/auth",
}));

import { DELETE } from "./route";

describe("DELETE /api/admin/users/[userId]", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    mocks.session.mockResolvedValue({
      user: { role: "admin" },
      token: "session-token",
    });
    mocks.access.mockResolvedValue({ allowed: true });
  });

  it("forwards query params (reason) and X-Request-ID to accounts", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "user archived" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await DELETE(
      new NextRequest(
        "https://console.test/api/admin/users/u-1?reason=duplicate%20account",
        {
          method: "DELETE",
          headers: { "X-Request-ID": "req-delete-1" },
        },
      ),
      { params: Promise.resolve({ userId: "u-1" }) },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://accounts.test/api/auth/admin/users/u-1?reason=duplicate%20account",
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer session-token",
          Accept: "application/json",
          "X-Request-ID": "req-delete-1",
        },
        cache: "no-store",
      },
    );
  });

  it("requires an authenticated and authorized session", async () => {
    mocks.session.mockResolvedValue({ user: null });
    const unauth = await DELETE(
      new NextRequest("https://console.test/api/admin/users/u-1?reason=test", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ userId: "u-1" }) },
    );
    expect(unauth.status).toBe(401);

    mocks.session.mockResolvedValue({
      user: { role: "operator" },
      token: "op-token",
    });
    mocks.access.mockResolvedValue({ allowed: false, reason: "forbidden" });
    const forbidden = await DELETE(
      new NextRequest("https://console.test/api/admin/users/u-1?reason=test", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ userId: "u-1" }) },
    );
    expect(forbidden.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
