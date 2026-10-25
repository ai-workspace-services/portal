import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/server/account/requestHost", () => ({
  resolveForwardedHost: () => "site.example",
}));
vi.mock("@/server/serviceConfig", () => ({
  getAccountServiceBaseUrl: () => "https://accounts.example",
}));
import { GET } from "./route";
afterEach(() => vi.restoreAllMocks());
describe("public campaign BFF", () => {
  it("requires no session, forwards no credentials and strips private metadata", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            campaign: {
              revision: 2,
              enabled: true,
              active: true,
              startsAt: null,
              endsAt: null,
              cashbackBps: 1000,
              annualBonusDays: 30,
              actor: "private",
              reason: "private",
            },
          }),
        ),
      );
    const response = await GET(
      new NextRequest("https://site.example/api/referrals/campaign", {
        headers: { cookie: "private", authorization: "private" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect((await response.json()).campaign).not.toHaveProperty("actor");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://accounts.example/api/referrals/campaign",
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
      Accept: "application/json",
    });
  });
  it("fails closed when the campaign service is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    expect(
      (
        await GET(
          new NextRequest("https://site.example/api/referrals/campaign"),
        )
      ).status,
    ).toBe(502);
  });
});
