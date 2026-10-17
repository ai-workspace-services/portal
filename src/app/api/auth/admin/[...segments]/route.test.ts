// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ session: vi.fn(), operations: vi.fn() }));
vi.mock("@server/account/session", () => ({
  getAccountSession: mocks.session,
}));
vi.mock("@server/account/adminAccess", () => ({
  isOperationsUser: mocks.operations,
}));
vi.mock("@server/serviceConfig", () => ({
  getAccountServiceApiBaseUrl: () => "https://accounts.test/api/auth",
}));
import { GET, PUT } from "./route";

describe("Selfhost auth admin boundary", () => {
  const fetchMock = vi.fn();
  const context = {
    params: Promise.resolve({ segments: ["users", "subscription-records"] }),
  };
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    mocks.session.mockResolvedValue({
      user: { role: "admin" },
      token: "session-token",
    });
    mocks.operations.mockReturnValue(true);
  });
  it("requires an authenticated operations session", async () => {
    mocks.session.mockResolvedValue({ user: null });
    expect(
      (
        await GET(
          new NextRequest(
            "https://console.test/api/auth/admin/users/subscription-records",
          ),
          context,
        )
      ).status,
    ).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    mocks.session.mockResolvedValue({
      user: { role: "user" },
      token: "member-token",
    });
    mocks.operations.mockReturnValue(false);
    expect(
      (
        await GET(
          new NextRequest(
            "https://console.test/api/auth/admin/users/subscription-records",
          ),
          context,
        )
      ).status,
    ).toBe(403);
  });
  it("preserves CSV output and the persisted export query", async () => {
    fetchMock.mockResolvedValue(
      new Response("email,note\na@example.com,paid", {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=subscriptions.csv",
        },
      }),
    );
    const response = await GET(
      new NextRequest(
        "https://console.test/api/auth/admin/users/subscription-records?format=csv",
      ),
      context,
    );
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://accounts.test/api/auth/admin/users/subscription-records?format=csv",
    );
    expect(fetchMock.mock.calls[0][1].headers.get("Authorization")).toBe(
      "Bearer session-token",
    );
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain(
      "subscriptions.csv",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toContain("a@example.com,paid");
  });
  it("forwards import preview unchanged and preserves Accounts permission failures", async () => {
    const body = JSON.stringify({
      mode: "preview",
      requestId: "stable-id",
      reason: "import",
      csv: "email,note\na@example.com,paid",
      reconcile: true,
    });
    fetchMock.mockResolvedValue(
      new Response('{"error":"root_required"}', {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const response = await PUT(
      new NextRequest(
        "https://console.test/api/auth/admin/users/plan-groups/batch",
        {
          method: "PUT",
          body,
          headers: { "Content-Type": "application/json" },
        },
      ),
      {
        params: Promise.resolve({
          segments: ["users", "plan-groups", "batch"],
        }),
      },
    );
    expect(fetchMock.mock.calls[0][1].body).toBe(body);
    expect(fetchMock.mock.calls[0][1].redirect).toBe("manual");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "root_required" });
  });
  it("rejects path traversal before contacting Accounts", async () => {
    const response = await GET(
      new NextRequest("https://console.test/api/auth/admin/users"),
      { params: Promise.resolve({ segments: ["..", "users"] }) },
    );
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
