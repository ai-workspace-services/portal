// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getAccountSession: vi.fn(),
  evaluateAccountAdminAccess: vi.fn(),
  getAccountServiceApiBaseUrl: vi.fn(),
}));

vi.mock("@server/account/session", () => ({
  getAccountSession: mocks.getAccountSession,
}));
vi.mock("@server/account/adminAccess", () => ({
  evaluateAccountAdminAccess: mocks.evaluateAccountAdminAccess,
}));
vi.mock("@server/serviceConfig", () => ({
  getAccountServiceApiBaseUrl: mocks.getAccountServiceApiBaseUrl,
}));

describe("admin plan group BFF routes", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    mocks.getAccountSession.mockReset();
    mocks.evaluateAccountAdminAccess.mockReset();
    mocks.getAccountServiceApiBaseUrl.mockReturnValue("https://accounts.test");
    mocks.getAccountSession.mockResolvedValue({
      token: "admin-session-token",
      user: { role: "admin", permissions: ["admin.settings.write"] },
    });
    mocks.evaluateAccountAdminAccess.mockResolvedValue({ allowed: true });
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards batch preview/apply contract and authenticated token", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ mode: "preview", previewToken: "opaque" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    const { PUT } = await import("./route");
    const payload = {
      mode: "preview",
      requestId: "request-1",
      reason: "support case 42",
      updates: [{ userId: "user-1", planId: "PLUS" }],
    };
    const response = await PUT(
      new NextRequest("https://portal.test/api/admin/users/plan-groups/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(200);
    const [target, init] = fetchMock.mock.calls[0]!;
    expect(String(target)).toBe(
      "https://accounts.test/admin/users/plan-groups/batch",
    );
    expect(init.method).toBe("PUT");
    expect(init.headers.get("Authorization")).toBe(
      "Bearer admin-session-token",
    );
    expect(JSON.parse(init.body)).toEqual(payload);
    expect(mocks.evaluateAccountAdminAccess).toHaveBeenCalledWith(
      expect.anything(),
      { roles: ["admin"], permissions: ["admin.settings.write"] },
    );
  });

  it("encodes the single target user in the Accounts endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ mode: "applied" }), { status: 200 }),
    );
    const { PUT } = await import("../../[userId]/plan-group/route");
    const response = await PUT(
      new NextRequest("https://portal.test/api/admin/users/a%2Fb/plan-group", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "apply",
          requestId: "single-1",
          previewToken: "opaque",
          reason: "support case 42",
          updates: [{ userId: "a/b", planId: "PLUS" }],
        }),
      }),
      { params: Promise.resolve({ userId: "a/b" }) },
    );

    expect(response.status).toBe(200);
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      "https://accounts.test/admin/users/a%2Fb/plan-group",
    );
  });

  it("requires a reason and blocks denied callers before proxying", async () => {
    const { PUT } = await import("./route");
    const request = () =>
      new NextRequest("https://portal.test/api/admin/users/plan-groups/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "preview", updates: [] }),
      });

    let response = await PUT(request());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "reason_required" });
    expect(fetchMock).not.toHaveBeenCalled();

    mocks.evaluateAccountAdminAccess.mockResolvedValue({
      allowed: false,
      reason: "forbidden",
    });
    response = await PUT(
      new NextRequest("https://portal.test/api/admin/users/plan-groups/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "preview", reason: "case 42" }),
      }),
    );
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
