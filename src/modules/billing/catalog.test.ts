import { describe, expect, it } from "vitest";

import {
  formatPlanPrice,
  isPurchasable,
  PLAN_COPY,
  sellablePlans,
  type CatalogPlan,
} from "./catalog";

function catalogOf(...plans: CatalogPlan[]): Map<string, CatalogPlan> {
  return new Map(plans.map((plan) => [plan.planId, plan]));
}

describe("billing catalog", () => {
  // The bug this guards: the user center used to render a hardcoded product
  // list, so it advertised plan IDs that did not exist in billing_plans and
  // priced them in a different currency from /prices. Every offer must now
  // come from the catalog.
  it("offers nothing when the catalog is empty", () => {
    const offers = sellablePlans(new Map());
    expect(offers.every((offer) => !isPurchasable(offer.plan))).toBe(true);
  });

  it("does not offer a plan that is active but has no Stripe price", () => {
    const catalog = catalogOf({ planId: "PRO-MONTHLY", active: true });
    const monthly = sellablePlans(catalog).find(
      (offer) => offer.planId === "PRO-MONTHLY",
    );
    expect(monthly).toBeDefined();
    // Checkout would fail at accounts' validCheckoutPrice, so the UI must not
    // present a buy button for it.
    expect(isPurchasable(monthly!.plan)).toBe(false);
  });

  it("does not offer a plan that has a Stripe price but was delisted", () => {
    const catalog = catalogOf({
      planId: "PRO-MONTHLY",
      active: false,
      stripePriceId: "price_123",
    });
    const monthly = sellablePlans(catalog).find(
      (offer) => offer.planId === "PRO-MONTHLY",
    );
    expect(isPurchasable(monthly!.plan)).toBe(false);
  });

  it("offers a plan only once it is both active and priced", () => {
    const catalog = catalogOf({
      planId: "PRO-MONTHLY",
      active: true,
      stripePriceId: "price_123",
    });
    const monthly = sellablePlans(catalog).find(
      (offer) => offer.planId === "PRO-MONTHLY",
    );
    expect(isPurchasable(monthly!.plan)).toBe(true);
    expect(monthly!.plan?.stripePriceId).toBe("price_123");
  });

  it("ignores catalog entries it has no display copy for", () => {
    // TRIAL-7D and FREE are real catalog rows but are not sold; rendering them
    // with a blank price and a buy button would be worse than omitting them.
    const catalog = catalogOf(
      { planId: "TRIAL-7D", active: true, stripePriceId: "price_trial" },
      { planId: "FREE", active: true },
    );
    expect(sellablePlans(catalog).map((offer) => offer.planId)).not.toContain(
      "TRIAL-7D",
    );
    expect(sellablePlans(catalog).map((offer) => offer.planId)).not.toContain(
      "FREE",
    );
  });

  it("checks out top-ups as one-off payments and Pro as subscriptions", () => {
    // A top-up sent with mode=subscription would create a recurring charge;
    // a subscription sent with mode=payment would never renew. Both are money
    // bugs, so the mode is pinned to the plan rather than inferred at the call
    // site.
    expect(PLAN_COPY["PAYG-TOPUP-50"].mode).toBe("payment");
    expect(PLAN_COPY["PRO-MONTHLY"].mode).toBe("subscription");
    expect(PLAN_COPY["PRO-YEARLY"].mode).toBe("subscription");
  });

  it("carries copy for every sellable plan in both languages", () => {
    for (const [planId, entry] of Object.entries(PLAN_COPY)) {
      for (const locale of ["zh", "en"] as const) {
        const copy = entry[locale];
        expect(copy.name, `${planId}.${locale}.name`).toBeTruthy();
        expect(copy.description, `${planId}.${locale}.description`).toBeTruthy();
        expect(
          copy.features.length,
          `${planId}.${locale}.features`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("formatPlanPrice", () => {
  // Prices used to be hardcoded per page, which is how /prices quoted ¥20 for
  // a plan the user center quoted as USD 49. The amount now has exactly one
  // source: the catalog.
  it("renders minor units as a major-unit amount with a period suffix", () => {
    const price = formatPlanPrice(
      {
        planId: "PRO-MONTHLY",
        active: true,
        priceAmount: 2000,
        priceCurrency: "CNY",
        priceUnit: "month",
      },
      "zh",
    );
    expect(price).toEqual({ amount: "¥20", period: "/月" });
  });

  it("localizes the period suffix", () => {
    const price = formatPlanPrice(
      {
        planId: "PRO-YEARLY",
        active: true,
        priceAmount: 20000,
        priceCurrency: "CNY",
        priceUnit: "year",
      },
      "en",
    );
    expect(price).toEqual({ amount: "¥200", period: "/year" });
  });

  it("keeps both decimals when the amount is not whole", () => {
    const price = formatPlanPrice(
      {
        planId: "PAYG-TOPUP-50",
        active: true,
        priceAmount: 4999,
        priceCurrency: "USD",
        priceUnit: "once",
      },
      "en",
    );
    expect(price).toEqual({ amount: "$49.99", period: "" });
  });

  it("falls back to the raw code for a currency with no symbol", () => {
    const price = formatPlanPrice(
      {
        planId: "PRO-MONTHLY",
        active: true,
        priceAmount: 1500,
        priceCurrency: "JPY",
        priceUnit: "month",
      },
      "en",
    );
    expect(price?.amount).toBe("JPY 15");
  });

  it("returns null rather than inventing a price", () => {
    // No amount, or an amount with no currency to read it in, must not render
    // as a number — the caller shows "coming soon" instead.
    expect(formatPlanPrice(undefined, "zh")).toBeNull();
    expect(
      formatPlanPrice({ planId: "FREE", active: true }, "zh"),
    ).toBeNull();
    expect(
      formatPlanPrice(
        { planId: "FREE", active: true, priceAmount: 2000 },
        "zh",
      ),
    ).toBeNull();
  });
});
