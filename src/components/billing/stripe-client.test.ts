import { afterEach, describe, expect, it, vi } from "vitest";
import {
  retrySubscriptionPurchase,
  startStripeCheckout,
} from "./stripe-client";

const payload = {
  planId: "PRO-MONTHLY-V2",
  stripePriceId: "price_pro",
  mode: "subscription" as const,
  productSlug: "xconnect",
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("subscription checkout boundary", () => {
  it("retries the server-owned operation without accepting a replacement plan or operation ID", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ pending: true }),
      });
    vi.stubGlobal("fetch", fetcher);
    await retrySubscriptionPurchase();
    expect(fetcher.mock.calls[0][0]).toBe(
      "/api/auth/stripe/subscription/retry",
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({});
  });
  it("previews and requires confirmation even outside the subscription panel", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        amountDue: 1500,
        currency: "CNY",
        renewalAmount: 5000,
        renewalAt: 0,
        previewToken: "signed",
      }),
    });
    vi.stubGlobal("fetch", fetcher);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await startStripeCheckout(payload);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(
      "/api/auth/stripe/subscription/preview",
    );
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("本次应付"));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("下次续费"));
  });
  it("forwards a confirmed quote and accepts a pending result without inventing payment success", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ pending: true }),
    });
    vi.stubGlobal("fetch", fetcher);
    await startStripeCheckout({ ...payload, previewToken: "signed" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      previewToken: "signed",
      planId: payload.planId,
    });
  });
});
