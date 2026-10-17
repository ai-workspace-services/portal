import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const session = vi.hoisted(() => vi.fn());
vi.mock("@/server/account/session", () => ({ getAccountSession: session }));
vi.mock("@/server/account/requestHost", () => ({
  resolveForwardedHost: () => "console.svc.plus",
}));
vi.mock("@/server/serviceConfig", () => ({
  getAccountServiceApiBaseUrl: () => "https://accounts.example/api/auth",
}));
import { GET } from "./route";
import { POST } from "./settlements/route";
describe("referral account proxy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    session.mockResolvedValue({ user: { id: "mine" }, token: "test-session" });
  });
  it("denies unauthenticated access before requesting records", async () => {
    session.mockResolvedValue({ user: null });
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect(
      (
        await GET(
          new NextRequest("https://console.svc.plus/api/auth/referrals"),
        )
      ).status,
    ).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("uses only the authenticated self endpoint, no user-controlled account/query", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ code: "AB12CD34" })));
    const response = await GET(
      new NextRequest("https://console.svc.plus/api/auth/referrals?user=other"),
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://accounts.example/api/auth/referrals",
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
      Authorization: "Bearer test-session",
      Accept: "application/json",
    });
  });
  it("reports unavailable upstream instead of returning fabricated zero rewards", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    expect(
      (
        await GET(
          new NextRequest("https://console.svc.plus/api/auth/referrals"),
        )
      ).status,
    ).toBe(502);
  });
  it("blocks cross-origin settlement requests", async () => {
    expect(
      (
        await POST(
          new NextRequest(
            "https://console.svc.plus/api/auth/referrals/settlements",
            {
              method: "POST",
              headers: { origin: "https://attacker.example" },
              body: JSON.stringify({ currency: "USD" }),
            },
          ),
        )
      ).status,
    ).toBe(403);
  });
  it("settles only a validated currency and drops caller amounts/user ids", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "settlement" })));
    await POST(
      new NextRequest(
        "https://console.svc.plus/api/auth/referrals/settlements",
        {
          method: "POST",
          headers: { origin: "https://console.svc.plus" },
          body: JSON.stringify({
            currency: "USD",
            amount: 1e9,
            userId: "other",
          }),
        },
      ),
    );
    expect(fetchMock.mock.calls[0][1]?.body).toBe(
      JSON.stringify({ currency: "USD" }),
    );
  });
});
