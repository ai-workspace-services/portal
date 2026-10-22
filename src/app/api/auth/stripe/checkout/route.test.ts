import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const session = vi.hoisted(() => vi.fn());
vi.mock("@/server/account/session", () => ({ getAccountSession: session }));
vi.mock("@/server/serviceConfig", () => ({
  getAccountServiceApiBaseUrl: () => "https://accounts.example/api/auth",
}));

import { POST } from "./route";

function request(mode: string) {
  return new NextRequest("https://console.svc.plus/api/auth/stripe/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      planId: "PAYG-TOPUP-50",
      stripePriceId: "price_test_50",
      mode,
      productSlug: "xconnect",
    }),
  });
}

describe("Stripe checkout mode proxy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    session.mockResolvedValue({ user: { id: "account" }, token: "session" });
  });

  it.each([
    ["payment", "payment"],
    ["payg", "payment"],
    ["subscription", "subscription"],
  ])("forwards %s as %s", async (inputMode, expectedMode) => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ url: "https://checkout.stripe.com/test" }),
        ),
      );

    const response = await POST(request(inputMode));

    expect(response.status).toBe(200);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      planId: "PAYG-TOPUP-50",
      mode: expectedMode,
    });
  });

  it("rejects an unknown mode instead of silently treating it as a subscription", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const response = await POST(request("unexpected"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_checkout_mode" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
