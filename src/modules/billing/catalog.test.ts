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

describe("three-family commercial billing catalog", () => {
  it("supports strictly the 3 canonical commercial families and 3-day grace default", () => {
    expect(PLAN_FAMILIES).toEqual(["plus", "pro", "custom"]);
    expect(DEFAULT_GRACE_DAYS).toBe(3);
    expect(graceDays(undefined)).toBe(3);
    expect(
      graceDays({
        planId: "PRO-MONTHLY-V2",
        active: true,
        features: { dunning: { grace_days: 14 } },
      }),
    ).toBe(3);
  });

  it("excludes free, trial, paygo_topup, whitelist_group, paused, and internal_only plans from billingPlans", () => {
    const catalog = new Map<string, CatalogPlan>([
      [
        "FREE",
        {
          planId: "FREE",
          kind: "subscription",
          packageName: "free",
          active: true,
        },
      ],
      [
        "WHITELIST-FREE",
        {
          planId: "WHITELIST-FREE",
          kind: "whitelist_group",
          packageName: "whitelist",
          active: true,
        },
      ],
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
          displayName: "Plus · 30 GB",
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

  it("formats dual high-speed + VPS quota when quota_label is omitted", () => {
    expect(
      formatPlanQuota(
        {
          planId: "PRO-MONTHLY-V2",
          active: true,
          includedQuotaBytes: 50 * GB_BYTES,
          highSpeedQuotaBytes: 30 * GB_BYTES,
        },
        "zh",
      ),
    ).toBe("30 GB 高速 + 50 GB VPS");
  });

  it("formats default 3-family aligned plans and AI consult one-time service", () => {
    const plus20 = DEFAULT_CATALOG_PLANS.find((p) => p.planId === "PLUS")!;
    const plus30 = DEFAULT_CATALOG_PLANS.find(
      (p) => p.planId === "PLUS-MONTHLY-2026",
    )!;
    const proMonthly = DEFAULT_CATALOG_PLANS.find(
      (p) => p.planId === "PRO-MONTHLY-V2",
    )!;
    const proYearly = DEFAULT_CATALOG_PLANS.find(
      (p) => p.planId === "PRO-YEARLY-V2",
    )!;
    const node = DEFAULT_CATALOG_PLANS.find(
      (p) => p.planId === "CUSTOM-NODE-MONTHLY-2026",
    )!;
    const consult = DEFAULT_CATALOG_PLANS.find(
      (p) => p.planId === "CUSTOM-AI-CONSULT-2026",
    )!;

    expect(formatPlanPrice(plus20, "zh")).toEqual({ amount: "¥20", period: "/月" });
    expect(formatPlanPrice(plus30, "zh")).toEqual({ amount: "¥30", period: "/月" });
    expect(formatPlanPrice(proMonthly, "zh")).toEqual({ amount: "¥50", period: "/月" });
    expect(formatPlanPrice(proYearly, "zh")).toEqual({ amount: "¥500", period: "/年" });
    expect(formatPlanPrice(node, "zh")).toEqual({ amount: "¥80", period: "/月" });
    expect(formatPlanPrice(consult, "zh")).toEqual({
      amount: "¥100",
      period: "/小时/次",
    });
    expect(planCheckoutMode(consult)).toBe("payment");
    expect(planCtaMode(plus30)).toBe("stripe_checkout");
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
      planId: "PRO-MONTHLY-V2",
      kind: "subscription",
      packageName: "pro",
      priceAmount: 5000,
      priceCurrency: "CNY",
      priceUnit: "month",
      includedQuotaBytes: 50 * GB_BYTES,
      highSpeedQuotaBytes: 30 * GB_BYTES,
      active: true,
    };
    expect(canUpgradeSubscription(plus, pro)).toBe(true);
    expect(canUpgradeSubscription(pro, plus)).toBe(false);
  });

  it("builds dynamic 4-column XConnect comparison table synced with catalog", () => {
    const comparison = buildXConnectPlanComparison(new Map(), "zh");
    expect(comparison.columns.map((c) => c.name)).toEqual([
      "Plus · 20/30 月付/年付",
      "Pro 50/月付/年付",
      "定制节点 ¥80/月（起）",
      "开源解决方案/AI工具咨询",
    ]);
    expect(comparison.rows.some((r) => r.label === "欠费宽限期")).toBe(true);
  });
});
