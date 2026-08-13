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
  /** List price in the currency's minor unit (cents, 分). 0 = not published. */
  priceAmount?: number;
  /** ISO 4217, e.g. CNY / USD. */
  priceCurrency?: string;
  /** month | year | once | gb */
  priceUnit?: string;
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

export const PLAN_COPY: Record<string, PlanCopyEntry> = {
  "PAYG-TOPUP-50": {
    mode: "payment",
    zh: {
      name: "余额充值 ¥50",
      description:
        "为按量付费账户充值 ¥50，高速流量按 ¥1/GB 从余额扣减。到账后可在下方流水核对。",
      features: [
        "高速流量 ¥1/GB，按量扣费",
        "充值即时到账，计入账单流水",
        "欠费立即停机，充值后自动恢复",
      ],
    },
    en: {
      name: "Balance top-up $7",
      description:
        "Add $7 to a pay-as-you-go balance. Accelerated traffic draws down at $0.15/GB. Check the ledger below once it lands.",
      features: [
        "Accelerated traffic at $0.15/GB",
        "Credited immediately and recorded in the ledger",
        "Suspended on zero balance, restored on top-up",
      ],
    },
  },
  "PAYG-TOPUP-100": {
    mode: "payment",
    zh: {
      name: "余额充值 ¥100",
      description:
        "为按量付费账户充值 ¥100，高速流量按 ¥1/GB 从余额扣减。到账后可在下方流水核对。",
      features: [
        "高速流量 ¥1/GB，按量扣费",
        "充值即时到账，计入账单流水",
        "欠费立即停机，充值后自动恢复",
      ],
    },
    en: {
      name: "Balance top-up $14",
      description:
        "Add $14 to a pay-as-you-go balance. Accelerated traffic draws down at $0.15/GB. Check the ledger below once it lands.",
      features: [
        "Accelerated traffic at $0.15/GB",
        "Credited immediately and recorded in the ledger",
        "Suspended on zero balance, restored on top-up",
      ],
    },
  },
  "PAYG-TOPUP-500": {
    mode: "payment",
    zh: {
      name: "余额充值 ¥500",
      description:
        "为按量付费账户充值 ¥500，高速流量按 ¥1/GB 从余额扣减。到账后可在下方流水核对。",
      features: [
        "高速流量 ¥1/GB，按量扣费",
        "充值即时到账，计入账单流水",
        "欠费立即停机，充值后自动恢复",
      ],
    },
    en: {
      name: "Balance top-up $70",
      description:
        "Add $70 to a pay-as-you-go balance. Accelerated traffic draws down at $0.15/GB. Check the ledger below once it lands.",
      features: [
        "Accelerated traffic at $0.15/GB",
        "Credited immediately and recorded in the ledger",
        "Suspended on zero balance, restored on top-up",
      ],
    },
  },
  "PRO-MONTHLY": {
    mode: "subscription",
    zh: {
      name: "Pro 订阅（月付）",
      description: "每月赠送 20GB 高速流量，超出部分按 ¥1/GB 自动计费。",
      features: [
        "每月 20GB 高速流量",
        "超出部分 ¥1/GB 自动计费",
        "资源卡片明码实价 + 20% 托管费",
        "14 天欠费宽限期",
      ],
    },
    en: {
      name: "Pro (Monthly)",
      description:
        "20GB of accelerated traffic every month; overage auto-bills at $0.15/GB.",
      features: [
        "20GB accelerated traffic per month",
        "Overage auto-billed at $0.15/GB",
        "Resource cards at list price + 20% managed fee",
        "14-day grace period on payment failure",
      ],
    },
  },
  "PRO-YEARLY": {
    mode: "subscription",
    zh: {
      name: "Pro 订阅（年付）",
      description:
        "每个自然月赠送 20GB 高速流量（全年共 240GB），比月付省 ¥40。",
      features: [
        "每自然月 20GB 高速流量，全年 240GB",
        "超出部分 ¥1/GB 自动计费",
        "资源卡片明码实价 + 20% 托管费",
        "比月付省 ¥40/年",
      ],
    },
    en: {
      name: "Pro (Yearly)",
      description:
        "20GB of accelerated traffic every calendar month (240GB/year) — save $8 versus monthly billing.",
      features: [
        "20GB accelerated traffic per calendar month, 240GB/year",
        "Overage auto-billed at $0.15/GB",
        "Resource cards at list price + 20% managed fee",
        "Save $8/year versus monthly billing",
      ],
    },
  },
};

/** Order the storefront shows plans in when the catalog omits sortOrder. */
const SELLABLE_PLAN_ORDER = [
  "PAYG-TOPUP-50",
  "PAYG-TOPUP-100",
  "PAYG-TOPUP-500",
  "PRO-MONTHLY",
  "PRO-YEARLY",
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
