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
import { GET } from "./route";
const request = () =>
  new NextRequest("https://console.example/api/operations/releases");
describe("release proxy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });
  it("rejects anonymous and non-operations users before reading upstream", async () => {
    mocks.session.mockResolvedValue({ user: null });
    expect((await GET(request())).status).toBe(401);
    mocks.session.mockResolvedValue({ user: { id: "u" }, token: "t" });
    mocks.operations.mockReturnValue(false);
    expect((await GET(request())).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("reports unavailable source and malformed catalog without fake success", async () => {
    mocks.session.mockResolvedValue({ user: { id: "u" }, token: "t" });
    mocks.operations.mockReturnValue(true);
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 404 }));
    expect((await GET(request())).status).toBe(503);
    vi.mocked(fetch).mockResolvedValue(Response.json({ schemaVersion: 1 }));
    expect((await GET(request())).status).toBe(502);
  });
  it("uses only the fixed source and never forwards account credentials", async () => {
    mocks.session.mockResolvedValue({
      user: { id: "u" },
      token: "private-account-token",
    });
    mocks.operations.mockReturnValue(true);
    const catalog = {
      schemaVersion: 1,
      source: "github-actions",
      updatedAt: "2026-10-04T00:00:00Z",
      timezone: "Asia/Shanghai",
      coverage: {
        since: "2026-10-01T00:00:00Z",
        refreshDays: 30,
        prod: "serverless",
      },
      gaps: [],
      releases: [],
    };
    vi.mocked(fetch).mockResolvedValue(Response.json(catalog));
    const response = await GET(
      new NextRequest(
        "https://console.example/api/operations/releases?source=https://attacker.example",
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(fetch).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/ai-workspace-infra/platform-ops-toolkit/release-status/releases.json",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
    expect(JSON.stringify(vi.mocked(fetch).mock.calls)).not.toContain(
      "private-account-token",
    );
  });
});
