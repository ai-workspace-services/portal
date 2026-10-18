"use client";

import { useEffect, useState } from "react";

/**
 * The live plan catalog served by accounts (`GET /api/billing/plans`, proxied
 * at `/api/billing/plans`). Mirrors accounts' billingPlanPayload
 * (api/billing_plans.go); only the fields the UI actually reads are declared.
 */
export type CatalogPlan = {
  planId: string;
  stripePriceId?: string;
  displayName?: string;
  /** trial | subscription | paygo_topup */
  kind?: string;
  includedQuotaBytes?: number;
  /** Explicit maximum traffic in bytes, mirrored from the local accounts catalog. */
  maxTrafficBytes?: number;
  /** List price in the currency's minor unit (cents, 分). 0 = not published. */
  priceAmount?: number;
  /** ISO 4217, e.g. CNY / USD. */
  priceCurrency?: string;
  /** month | year | once | gb */
  priceUnit?: string;
  /** Optional operator-managed display features from the local catalog. */
  features?: Record<string, unknown>;
  active: boolean;
  sortOrder?: number;
};

/**
 * Marketing copy for the plans we sell, keyed by the catalog's planId.
 *
 * Prices are deliberately absent: the amount comes from the catalog's
 * priceAmount/priceCurrency/priceUnit, so changing a price is an audited
 * catalog edit rather than a frontend deploy. What stays here is the copy the
 * catalog has no column for — name, description, feature bullets.
 */
export type PlanCopy = {
  name: string;
  description: string;
  features: string[];
};

export type PlanCopyEntry = {
  /** Checkout mode to send to Stripe. Derived from the plan's commercial shape. */
  mode: "payment" | "subscription";
  zh: PlanCopy;
  en: PlanCopy;
};

export const XCONNECT_PRODUCT_SLUG = "xconnect";
export const XCONNECT_SUBSCRIPTION_PLAN_IDS = [
  "PRO-MONTHLY-V2",
  "PRO-YEARLY-V2",
] as const;

export const PLAN_COPY: Record<string, PlanCopyEntry> = {
  PLUS: {
    mode: "subscription",
    zh: {
      name: "Plus 月度订阅",
      description: "每月 20GB 流量，适合日常 AI 对话与轻度使用。",
      features: ["每月 20GB 高速流量", "按月续订"],
    },
    en: {
      name: "Plus Monthly",
      description: "20GB of monthly traffic for everyday AI conversations.",
      features: ["20GB monthly traffic", "Renews monthly"],
    },
  },
  "PAYG-TOPUP-50": {
    mode: "payment",
    zh: {
      name: "按量余额充值",
      description: "按选择的金额一次性充值，进入按量付费余额。",
      features: [
        "人民币余额独立记账",
        "一次性充值，不自动续费",
        "与有效订阅互斥",
      ],
    },
    en: {
      name: "Pay-as-you-go balance",
      description: "Make a one-time top-up for the amount you select.",
      features: [
        "CNY balance is recorded separately",
        "One-time payment; no auto-renewal",
        "Mutually exclusive with an active subscription",
      ],
    },
  },
  "PAYG-TOPUP-100": {
    mode: "payment",
    zh: {
      name: "按量余额充值",
      description: "按选择的金额一次性充值，进入按量付费余额。",
      features: [
        "人民币余额独立记账",
        "一次性充值，不自动续费",
        "与有效订阅互斥",
      ],
    },
    en: {
      name: "Pay-as-you-go balance",
      description: "Make a one-time top-up for the amount you select.",
      features: [
        "CNY balance is recorded separately",
        "One-time payment; no auto-renewal",
        "Mutually exclusive with an active subscription",
      ],
    },
  },
  "PAYG-TOPUP-200": {
    mode: "payment",
    zh: {
      name: "按量余额充值",
      description: "按选择的金额一次性充值，进入按量付费余额。",
      features: [
        "人民币余额独立记账",
        "一次性充值，不自动续费",
        "与有效订阅互斥",
      ],
    },
    en: {
      name: "Pay-as-you-go balance",
      description: "Make a one-time top-up for the amount you select.",
      features: [
        "CNY balance is recorded separately",
        "One-time payment; no auto-renewal",
        "Mutually exclusive with an active subscription",
      ],
    },
  },
  "PAYG-TOPUP-USD-20": {
    mode: "payment",
    zh: {
      name: "按量余额充值",
      description: "一次性充值美元余额，单独记账且不自动兑换。",
      features: [
        "美元余额独立记账",
        "一次性充值，不自动续费",
        "与有效订阅互斥",
      ],
    },
    en: {
      name: "Pay-as-you-go balance (USD)",
      description:
        "Make a one-time USD top-up; the balance is not automatically converted.",
      features: [
        "USD balance is recorded separately",
        "One-time payment; no auto-renewal",
        "Mutually exclusive with an active subscription",
      ],
    },
  },
  "PAYG-TOPUP-USD-50": {
    mode: "payment",
    zh: {
      name: "按量余额充值",
      description: "一次性充值美元余额，单独记账且不自动兑换。",
      features: [
        "美元余额独立记账",
        "一次性充值，不自动续费",
        "与有效订阅互斥",
      ],
    },
    en: {
      name: "Pay-as-you-go balance (USD)",
      description:
        "Make a one-time USD top-up; the balance is not automatically converted.",
      features: [
        "USD balance is recorded separately",
        "One-time payment; no auto-renewal",
        "Mutually exclusive with an active subscription",
      ],
    },
  },
  "PAYG-TOPUP-USD-100": {
    mode: "payment",
    zh: {
      name: "按量余额充值",
      description: "一次性充值美元余额，单独记账且不自动兑换。",
      features: [
        "美元余额独立记账",
        "一次性充值，不自动续费",
        "与有效订阅互斥",
      ],
    },
    en: {
      name: "Pay-as-you-go balance (USD)",
      description:
        "Make a one-time USD top-up; the balance is not automatically converted.",
      features: [
        "USD balance is recorded separately",
        "One-time payment; no auto-renewal",
        "Mutually exclusive with an active subscription",
      ],
    },
  },
  "PRO-MONTHLY-V2": {
    mode: "subscription",
    zh: {
      name: "Pro 月付",
      description: "每月 50GB 高速流量，适合 AI 编程与更频繁的使用。",
      features: [
        "每月 50GB 高速流量",
        "超出部分 ¥1/GB 自动计费",
        "资源卡片明码实价 + 20% 托管费",
        "14 天欠费宽限期",
      ],
    },
    en: {
      name: "Pro Monthly",
      description:
        "50GB of accelerated traffic each month for frequent AI use.",
      features: [
        "50GB accelerated traffic per month",
        "Overage auto-billed at ¥1/GB",
        "Resource cards at list price + 20% managed fee",
        "14-day grace period on payment failure",
      ],
    },
  },
  "PRO-YEARLY-V2": {
    mode: "subscription",
    zh: {
      name: "Pro 年付",
      description: "一次支付，享全年不限流量。",
      features: [
        "全年不限流量",
        "一次性年付，不按月续费",
        "资源卡片明码实价 + 20% 托管费",
      ],
    },
    en: {
      name: "Pro Yearly",
      description: "Pay once for unlimited traffic for the year.",
      features: [
        "Unlimited traffic for the year",
        "One annual payment; no monthly renewal",
        "Resource cards at list price + 20% managed fee",
      ],
    },
  },
};

/** Order the storefront shows plans in when the catalog omits sortOrder. */
const SELLABLE_PLAN_ORDER = [
  "PLUS",
  "PRO-MONTHLY-V2",
  "PRO-YEARLY-V2",
  "PAYG-TOPUP-50",
  "PAYG-TOPUP-100",
  "PAYG-TOPUP-200",
  "PAYG-TOPUP-USD-20",
  "PAYG-TOPUP-USD-50",
  "PAYG-TOPUP-USD-100",
];

/**
 * A plan is offerable only when the catalog says it is active AND carries a
 * Stripe price. Without both, checkout would fail at accounts
 * (`validCheckoutPrice`), so the UI must not present a buy button.
 */
export function isPurchasable(plan: CatalogPlan | undefined): boolean {
  return Boolean(plan?.active && plan.stripePriceId);
}

const CURRENCY_SYMBOL: Record<string, string> = {
  CNY: "¥",
  USD: "$",
  EUR: "€",
};

const UNIT_SUFFIX: Record<string, { zh: string; en: string }> = {
  month: { zh: "/月", en: "/month" },
  year: { zh: "/年", en: "/year" },
  gb: { zh: "/GB", en: "/GB" },
  once: { zh: "", en: "" },
};

export type FormattedPrice = { amount: string; period: string };

/**
 * Renders the catalog's list price. Amounts are stored in the currency's minor
 * unit, so 2000 CNY-cents reads as ¥20.
 *
 * Returns null when the plan publishes no price. Callers must treat that as
 * "not for sale yet" rather than substituting a hardcoded number — showing a
 * price the catalog does not carry is how /prices and the user center ended up
 * quoting different amounts for the same plan.
 */
export function formatPlanPrice(
  plan: CatalogPlan | undefined,
  locale: "zh" | "en",
): FormattedPrice | null {
  if (!plan?.priceAmount || !plan.priceCurrency) {
    return null;
  }
  const currency = plan.priceCurrency.toUpperCase();
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `;
  const major = plan.priceAmount / 100;
  // Whole amounts read as ¥20, not ¥20.00; fractional ones keep both digits.
  const rendered = Number.isInteger(major) ? String(major) : major.toFixed(2);
  const unit = (plan.priceUnit ?? "").toLowerCase();
  return {
    amount: `${symbol}${rendered}`,
    period: UNIT_SUFFIX[unit]?.[locale] ?? "",
  };
}

/**
 * The plans we have display copy for, in storefront order, joined with
 * whatever the live catalog currently says about them. Plans present in the
 * catalog but without copy are skipped rather than rendered with a blank
 * price — an unpriced buy button is worse than no button.
 */
export function sellablePlans(
  catalog: Map<string, CatalogPlan>,
): Array<{ planId: string; copy: PlanCopyEntry; plan?: CatalogPlan }> {
  return SELLABLE_PLAN_ORDER.filter((planId) => PLAN_COPY[planId]).map(
    (planId) => ({
      planId,
      copy: PLAN_COPY[planId],
      plan: catalog.get(planId),
    }),
  );
}

function copyForUnlistedPlan(plan: CatalogPlan): PlanCopyEntry {
  const mode = plan.kind === "subscription" ? "subscription" : "payment";
  const featureValues = Object.values(plan.features ?? {}).filter(
    (value): value is string =>
      typeof value === "string" && value.trim() !== "",
  );
  const name = plan.displayName?.trim() || plan.planId;
  const description =
    plan.kind === "subscription"
      ? "由账户本地权益模型维护的订阅套餐。"
      : "由账户本地账务模型记录的用量或一次性方案。";
  const features = featureValues.length > 0 ? featureValues : [description];
  return {
    mode,
    zh: { name, description, features },
    en: { name, description, features },
  };
}

/**
 * Returns every active account-backed billing plan for the authenticated
 * checkout surface. Unlike the marketing copy map above, this also renders
 * newly-created operator plans (including an unpriced Free plan) so the
 * current entitlement can be explained without a Portal deploy.
 */
export function billingPlans(
  catalog: Map<string, CatalogPlan>,
): Array<{ planId: string; copy: PlanCopyEntry; plan: CatalogPlan }> {
  const known = sellablePlans(catalog);
  const knownIds = new Set(known.map(({ planId }) => planId));
  const dynamic = [...catalog.values()]
    .filter(
      (plan) =>
        plan.active && !knownIds.has(plan.planId) && plan.kind !== "trial",
    )
    .sort(
      (left, right) =>
        (right.sortOrder ?? 0) - (left.sortOrder ?? 0) ||
        left.planId.localeCompare(right.planId),
    )
    .map((plan) => ({
      planId: plan.planId,
      copy: copyForUnlistedPlan(plan),
      plan,
    }));

  return [
    ...known.flatMap((offer) =>
      offer.plan
        ? [{ planId: offer.planId, copy: offer.copy, plan: offer.plan }]
        : [],
    ),
    ...dynamic,
  ];
}

/**
 * Reads the live catalog. Failures leave the map empty, which renders every
 * plan as "coming soon" — the same state as a catalog that has not been
 * seeded yet, and never a buy button that cannot complete.
 */
export function useBillingCatalog(): Map<string, CatalogPlan> {
  const [catalog, setCatalog] = useState<Map<string, CatalogPlan>>(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing/plans", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { plans: [] }))
      .then((data: { plans?: CatalogPlan[] }) => {
        if (cancelled) return;
        setCatalog(
          new Map((data.plans ?? []).map((plan) => [plan.planId, plan])),
        );
      })
      .catch(() => {
        // Catalog stays empty; callers fall back to "coming soon".
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return catalog;
}
