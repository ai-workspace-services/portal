import { describe, expect, it } from "vitest";

import {
  billingPlans,
  buildXConnectPlanComparison,
  canUpgradeSubscription,
  catalogWithFamilyDefaults,
  DEFAULT_CATALOG_PLANS,
  DEFAULT_GRACE_DAYS,
  formatPlanPrice,
  formatPlanQuota,
  GB_BYTES,
  graceDays,
  isPurchasable,
  isUnlimitedQuota,
  PB_BYTES,
  PLAN_FAMILIES,
  planCheckoutMode,
  planCtaMode,
  planFamily,
  type CatalogPlan,
} from "./catalog";

describe("four-family billing catalog", () => {
  it("supports strictly the 4 canonical families and 3-day grace default", () => {
    expect(PLAN_FAMILIES).toEqual(["free", "plus", "pro", "custom"]);
    expect(DEFAULT_GRACE_DAYS).toBe(3);
    expect(graceDays(undefined)).toBe(3);
    expect(
      graceDays({
        planId: "PRO-MONTHLY-2026",
        active: true,
        features: { dunning: { grace_days: 14 } },
      }),
    ).toBe(3);
  });

  it("excludes legacy trial, paygo_topup, and internal_only plans from billingPlans", () => {
    const catalog = new Map<string, CatalogPlan>([
      [
        "FREE-3GB-2026",
        {
          planId: "FREE-3GB-2026",
          kind: "trial",
          packageName: "free",
          active: true,
        },
      ],
      [
        "PAYG-TOPUP-50",
        {
          planId: "PAYG-TOPUP-50",
          kind: "paygo_topup",
          packageName: "payg",
          active: true,
        },
      ],
      [
        "UNLIMITED-BETA",
        {
          planId: "UNLIMITED-BETA",
          kind: "subscription",
          packageName: "unlimited-beta",
          active: true,
          features: { internal_only: true },
        },
      ],
      [
        "PLUS-MONTHLY-2026",
        {
          planId: "PLUS-MONTHLY-2026",
          displayName: "Plus",
          kind: "subscription",
          packageName: "plus",
          includedQuotaBytes: 30 * GB_BYTES,
          priceAmount: 3000,
          priceCurrency: "CNY",
          priceUnit: "month",
          stripePriceId: "price_plus_live",
          active: true,
        },
      ],
    ]);

    const published = billingPlans(catalog);
    expect(published.map((item) => item.planId)).toEqual(["PLUS-MONTHLY-2026"]);
    expect(isPurchasable(published[0].plan)).toBe(true);
  });

  it("handles large/MaxInt64 quotas safely as unlimited", () => {
    expect(
      isUnlimitedQuota({
        planId: "PRO-YEARLY-V2",
        active: true,
        includedQuotaBytes: 9223372036854776000,
      }),
    ).toBe(true);
    expect(
      formatPlanQuota(
        {
          planId: "PRO-YEARLY-V2",
          active: true,
          includedQuotaBytes: PB_BYTES,
        },
        "zh",
      ),
    ).toBe("不限流量");
  });

  it("formats default 4-family aligned plans and AI consult one-time service", () => {
    const plus = DEFAULT_CATALOG_PLANS.find(
      (p) => p.planId === "PLUS-MONTHLY-2026",
    )!;
    const pro = DEFAULT_CATALOG_PLANS.find(
      (p) => p.planId === "PRO-MONTHLY-2026",
    )!;
    const node = DEFAULT_CATALOG_PLANS.find(
      (p) => p.planId === "CUSTOM-NODE-MONTHLY-2026",
    )!;
    const consult = DEFAULT_CATALOG_PLANS.find(
      (p) => p.planId === "CUSTOM-AI-CONSULT-2026",
    )!;

    expect(formatPlanPrice(plus, "zh")).toEqual({ amount: "¥30", period: "/月" });
    expect(formatPlanPrice(pro, "zh")).toEqual({ amount: "¥50", period: "/月" });
    expect(formatPlanPrice(node, "zh")).toEqual({ amount: "¥80", period: "/月" });
    expect(formatPlanPrice(consult, "zh")).toEqual({
      amount: "¥100",
      period: "/小时/次",
    });
    expect(planCheckoutMode(consult)).toBe("payment");
    expect(planCtaMode(plus)).toBe("stripe_checkout");
    expect(planFamily(node)).toBe("custom");
  });

  it("evaluates subscription upgrades dynamically without hardcoded IDs", () => {
    const plus: CatalogPlan = {
      planId: "PLUS-MONTHLY-2026",
      kind: "subscription",
      packageName: "plus",
      priceAmount: 3000,
      priceCurrency: "CNY",
      priceUnit: "month",
      includedQuotaBytes: 30 * GB_BYTES,
      active: true,
    };
    const pro: CatalogPlan = {
      planId: "PRO-MONTHLY-2026",
      kind: "subscription",
      packageName: "pro",
      priceAmount: 5000,
      priceCurrency: "CNY",
      priceUnit: "month",
      includedQuotaBytes: 50 * GB_BYTES,
      active: true,
    };
    expect(canUpgradeSubscription(plus, pro)).toBe(true);
    expect(canUpgradeSubscription(pro, plus)).toBe(false);
  });

  it("builds dynamic XConnect comparison table for all 4 families", () => {
    const comparison = buildXConnectPlanComparison(new Map(), "zh");
    expect(comparison.columns.length).toBe(
      catalogWithFamilyDefaults(new Map()).length,
    );
    expect(comparison.rows.some((r) => r.label === "欠费宽限期")).toBe(true);
  });
});
