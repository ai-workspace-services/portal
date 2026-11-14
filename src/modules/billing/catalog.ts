"use client";

import { useEffect, useState } from "react";
import { formatBytes } from "@lib/format";

export type PlanFamilyId = "free" | "plus" | "pro" | "custom";

export const PLAN_FAMILIES: readonly PlanFamilyId[] = [
  "free",
  "plus",
  "pro",
  "custom",
] as const;

export const DEFAULT_GRACE_DAYS = 3;
export const GB_BYTES = 1024 ** 3;
export const PB_BYTES = 1024 ** 5;
export const XCONNECT_PRODUCT_SLUG = "xconnect";

export type PlanComparisonMatrix = {
  resources?: string;
  exit_ip?: string;
  ip_changes?: string;
  support?: string;
};

export type PlanCtaMode = "free" | "stripe_checkout" | "contact_sales";
export type PlanCheckoutMode = "subscription" | "payment";

/**
 * The live plan catalog served by accounts (`GET /api/billing/plans`, proxied
 * at `/api/billing/plans`). Mirrors accounts' billingPlanPayload
 * (api/billing_plans.go).
 */
export type CatalogPlan = {
  planId: string;
  stripePriceId?: string;
  displayName?: string;
  /** subscription */
  kind?: string;
  /** free | plus | pro | custom */
  packageName?: string;
  includedQuotaBytes?: number;
  /** Explicit maximum traffic in bytes, mirrored from the local accounts catalog. */
  maxTrafficBytes?: number;
  /** List price in the currency's minor unit (cents, 分). 0 = free or not published. */
  priceAmount?: number;
  /** ISO 4217, e.g. CNY / USD. */
  priceCurrency?: string;
  /** month | year | hour | once */
  priceUnit?: string;
  /** Operator-managed display features from the local catalog JSONB. */
  features?: Record<string, unknown>;
  active: boolean;
  sortOrder?: number;
};

export type PlanCopy = {
  name: string;
  description: string;
  features: string[];
};

export type PlanCopyEntry = {
  mode: PlanCheckoutMode;
  zh: PlanCopy;
  en: PlanCopy;
};

export type PlanComparisonRow = {
  planId: string;
  family: PlanFamilyId;
  name: string;
  price: string;
  quota: string;
  resources: string;
  exitIp: string;
  ipChanges: string;
  support: string;
  gracePeriod: string;
  ctaLabel: string;
  ctaHref: string;
  ctaMode: PlanCtaMode;
};

const FAMILY_RANK: Record<PlanFamilyId, number> = {
  free: 0,
  plus: 10,
  pro: 20,
  custom: 30,
};

const CURRENCY_SYMBOL: Record<string, string> = {
  CNY: "¥",
  USD: "$",
  EUR: "€",
};

const UNIT_SUFFIX: Record<string, { zh: string; en: string }> = {
  month: { zh: "/月", en: "/month" },
  year: { zh: "/年", en: "/year" },
  hour: { zh: "/小时", en: "/hour" },
  gb: { zh: "/GB", en: "/GB" },
  once: { zh: "", en: "" },
};

export type FormattedPrice = { amount: string; period: string };

/**
 * Default aligned 4-family catalog templates used when a family has no active
 * database row published yet. Operators can override every field in
 * `/panel/ops/billing/plans` via `/api/admin/billing/plans`.
 */
export const DEFAULT_CATALOG_PLANS: CatalogPlan[] = [
  {
    planId: "FREE-MONTHLY-2026",
    displayName: "Free",
    kind: "subscription",
    packageName: "free",
    includedQuotaBytes: 5 * GB_BYTES,
    priceAmount: 0,
    priceCurrency: "CNY",
    priceUnit: "month",
    active: false,
    sortOrder: 0,
    features: {
      family: "free",
      description: "基础免费体验档，登录即可使用。",
      description_en: "Starter free plan — sign in to connect.",
      quota_label: "5 GB / 月",
      quota_label_en: "5 GB / month",
      marketing_features: [
        "基础免费流量额度",
        "共享基础资源池",
        "可随时升级至 PLUS / PRO / 定制节点",
      ],
      marketing_features_en: [
        "Starter free traffic allowance",
        "Shared starter resource pool",
        "Upgrade to PLUS, PRO, or Custom anytime",
      ],
      comparison_matrix: {
        resources: "共享基础资源池",
        exit_ip: "共享 IP",
        ip_changes: "—",
        support: "基础文档与社区支持",
      },
      cta_mode: "free",
      cta_href: "/login",
    },
  },
  {
    planId: "PLUS-MONTHLY-2026",
    displayName: "PLUS",
    kind: "subscription",
    packageName: "plus",
    includedQuotaBytes: 30 * GB_BYTES,
    priceAmount: 3000,
    priceCurrency: "CNY",
    priceUnit: "month",
    active: false,
    sortOrder: 10,
    features: {
      family: "plus",
      description: "订阅用户 · 30GB 高速流量 · 共享资源池。",
      description_en:
        "30 GB monthly accelerated traffic on the shared resource pool.",
      quota_label: "30 GB / 月",
      quota_label_en: "30 GB / month",
      marketing_features: [
        "每月 30 GB 高速流量",
        "共享资源池",
        "3 天欠费宽限期",
      ],
      marketing_features_en: [
        "30 GB accelerated traffic per month",
        "Shared resource pool",
        "3-day grace period",
      ],
      comparison_matrix: {
        resources: "共享资源池",
        exit_ip: "共享 IP",
        ip_changes: "—",
        support: "环境维护与技术支持",
      },
      cta_mode: "stripe_checkout",
      dunning: { grace_days: 3 },
    },
  },
  {
    planId: "PRO-MONTHLY-2026",
    displayName: "PRO",
    kind: "subscription",
    packageName: "pro",
    includedQuotaBytes: 50 * GB_BYTES,
    priceAmount: 5000,
    priceCurrency: "CNY",
    priceUnit: "month",
    active: false,
    sortOrder: 20,
    features: {
      family: "pro",
      highlight: true,
      badge: "推荐",
      description: "订阅用户 · 50GB/月高速流量 · PRO专属资源池。",
      description_en:
        "50 GB/month accelerated traffic on the dedicated PRO resource pool.",
      quota_label: "50 GB / 月",
      quota_label_en: "50 GB / month",
      marketing_features: [
        "每月 50 GB 高速流量",
        "PRO专属资源池",
        "3 天欠费宽限期",
      ],
      marketing_features_en: [
        "50 GB accelerated traffic per month",
        "PRO dedicated resource pool",
        "3-day grace period",
      ],
      comparison_matrix: {
        resources: "PRO专属资源池",
        exit_ip: "精品 IP 资源",
        ip_changes: "—",
        support: "优先环境维护与技术支持",
      },
      cta_mode: "stripe_checkout",
      dunning: { grace_days: 3 },
    },
  },
  {
    planId: "CUSTOM-NODE-MONTHLY-2026",
    displayName: "定制节点",
    kind: "subscription",
    packageName: "custom",
    includedQuotaBytes: 1024 * GB_BYTES,
    priceAmount: 8000,
    priceCurrency: "CNY",
    priceUnit: "month",
    active: false,
    sortOrder: 30,
    features: {
      family: "custom",
      checkout_mode: "subscription",
      description:
        "订阅用户 · 独享IP · 独享节点 · 每个月免费更换一次，再次更换10元/次。",
      description_en:
        "Dedicated IP and dedicated node · 1 free IP change per month, then ¥10/change.",
      quota_label: "独享节点",
      quota_label_en: "Dedicated node",
      marketing_features: [
        "独享IP · 独享节点",
        "每个月免费更换一次，再次更换10元/次",
        "3 天欠费宽限期",
      ],
      marketing_features_en: [
        "Dedicated IP · Dedicated node",
        "1 free IP change per month, then ¥10/change",
        "3-day grace period",
      ],
      comparison_matrix: {
        resources: "独享节点",
        exit_ip: "独享IP",
        ip_changes: "每个月免费更换一次，再次更换10元/次",
        support: "专属节点维护与技术支持",
      },
      cta_mode: "contact_sales",
      cta_href: "/docs/contact",
      dunning: { grace_days: 3 },
    },
  },
  {
    planId: "CUSTOM-AI-CONSULT-2026",
    displayName: "AI 工具咨询，电脑环境配置",
    kind: "subscription",
    packageName: "custom",
    includedQuotaBytes: 0,
    priceAmount: 10000,
    priceCurrency: "CNY",
    priceUnit: "once",
    active: false,
    sortOrder: 31,
    features: {
      family: "custom",
      checkout_mode: "payment",
      price_unit_label: "小时/次",
      price_unit_label_en: "hour/session",
      description:
        "支持：MacOS Windows Linux IOS Android，不支持：国产华为纯血鸿蒙系统（面向非订阅用户的付费服务）",
      description_en:
        "Supported: macOS, Windows, Linux, iOS, Android. Not supported: Huawei HarmonyOS NEXT (paid service for non-subscribers).",
      quota_label: "按小时/按次服务",
      quota_label_en: "Per hour / session",
      marketing_features: [
        "面向非订阅用户的付费服务（100元/小时/次）",
        "支持：MacOS Windows Linux IOS Android",
        "不支持：国产华为纯血鸿蒙系统",
      ],
      marketing_features_en: [
        "Paid consultation for non-subscribers (¥100/hour/session)",
        "Supported: macOS, Windows, Linux, iOS, Android",
        "Not supported: Huawei HarmonyOS NEXT",
      ],
      comparison_matrix: {
        resources: "一对一 AI 工具咨询与电脑环境配置",
        exit_ip: "—",
        ip_changes: "—",
        support:
          "支持：MacOS Windows Linux IOS Android，不支持：国产华为纯血鸿蒙系统",
      },
      cta_mode: "contact_sales",
      cta_href: "/docs/contact",
      dunning: { grace_days: 3 },
    },
  },
];

function classifyFamilyToken(raw: unknown): PlanFamilyId | "excluded" | null {
  if (typeof raw !== "string") return null;
  const token = raw.trim().toLowerCase();
  if (!token) return null;
  if (
    token === "trial" ||
    token === "payg" ||
    token === "paygo" ||
    token === "paygo_topup" ||
    token === "beta" ||
    token === "gift" ||
    token.startsWith("payg-") ||
    token.startsWith("trial-")
  ) {
    return "excluded";
  }
  if (token === "free" || /(^|[^a-z])free([^a-z]|$)/.test(token)) {
    return "free";
  }
  if (token === "plus" || /(^|[^a-z])plus([^a-z]|$)/.test(token)) {
    return "plus";
  }
  if (token === "pro" || /(^|[^a-z])pro([^a-z]|$)/.test(token)) {
    return "pro";
  }
  if (
    token === "custom" ||
    /custom|team|enterprise|dedicated|consult|定制|独享|专属|咨询/.test(token)
  ) {
    return "custom";
  }
  return null;
}

/**
 * Resolves a plan into one of the 4 supported families (`free | plus | pro | custom`).
 * Returns `null` for `trial`, `paygo_topup`, `internal_only`, or unrecognized plans.
 */
export function planFamily(plan: CatalogPlan | undefined): PlanFamilyId | null {
  if (!plan) return null;
  if (plan.kind === "trial" || plan.kind === "paygo_topup") return null;
  if (plan.features?.internal_only === true) return null;

  const policy = plan.features?.catalog_policy as
    | Record<string, unknown>
    | undefined;
  const candidates = [
    plan.features?.family,
    policy?.family,
    plan.packageName,
    plan.planId,
    plan.displayName,
  ];

  for (const candidate of candidates) {
    const match = classifyFamilyToken(candidate);
    if (match === "excluded") return null;
    if (match) return match;
  }
  return null;
}

export function planTierRank(
  planOrFamily: CatalogPlan | PlanFamilyId | undefined,
): number {
  if (!planOrFamily) return -1;
  if (typeof planOrFamily === "string") {
    return FAMILY_RANK[planOrFamily] ?? -1;
  }
  const family = planFamily(planOrFamily);
  return family ? FAMILY_RANK[family] : -1;
}

/**
 * Reads the arrears grace period from `plan.features.dunning.grace_days`.
 * Defaults to 3 days (never 14).
 */
export function graceDays(plan: CatalogPlan | undefined): number {
  const dunning = plan?.features?.dunning as
    | { grace_days?: unknown }
    | undefined;
  const raw = dunning?.grace_days;
  const parsed =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : NaN;
  if (Number.isFinite(parsed) && parsed > 0 && parsed !== 14) {
    return Math.round(parsed);
  }
  return DEFAULT_GRACE_DAYS;
}

/**
 * Guards against Go `math.MaxInt64` (>= 1 PB or unsafe JS integer) and explicit
 * `fast_lane.mode === "unlimited"`.
 */
export function isUnlimitedQuota(plan: CatalogPlan | undefined): boolean {
  if (!plan) return false;
  const fastLane = plan.features?.fast_lane as { mode?: string } | undefined;
  if (fastLane?.mode === "unlimited") return true;
  const bytes = plan.includedQuotaBytes ?? plan.maxTrafficBytes ?? 0;
  if (bytes >= PB_BYTES || (bytes > 0 && !Number.isSafeInteger(bytes))) {
    return true;
  }
  return false;
}

export function formatPlanQuota(
  plan: CatalogPlan | undefined,
  locale: "zh" | "en",
): string {
  if (!plan) return "";
  const localizedLabel =
    locale === "en"
      ? (plan.features?.quota_label_en ?? plan.features?.quota_label)
      : (plan.features?.quota_label_zh ?? plan.features?.quota_label);
  if (typeof localizedLabel === "string" && localizedLabel.trim() !== "") {
    return localizedLabel.trim();
  }
  if (isUnlimitedQuota(plan)) {
    return locale === "zh" ? "不限流量" : "Unlimited traffic";
  }
  const bytes = plan.includedQuotaBytes ?? plan.maxTrafficBytes ?? 0;
  if (typeof bytes === "number" && Number.isFinite(bytes) && bytes > 0) {
    return formatBytes(bytes);
  }
  return "";
}

/**
 * A plan is offerable for Stripe checkout only when the catalog says it is
 * active AND carries a Stripe price ID.
 */
export function isPurchasable(plan: CatalogPlan | undefined): boolean {
  return Boolean(plan?.active && plan.stripePriceId);
}

export function planCheckoutMode(
  plan: CatalogPlan | undefined,
): PlanCheckoutMode {
  const explicit = plan?.features?.checkout_mode;
  if (explicit === "payment" || explicit === "subscription") {
    return explicit;
  }
  const unit = (plan?.priceUnit ?? "").toLowerCase();
  if (unit === "once" || unit === "hour") {
    return "payment";
  }
  return "subscription";
}

export function planCtaMode(plan: CatalogPlan | undefined): PlanCtaMode {
  const explicit = plan?.features?.cta_mode;
  if (
    explicit === "free" ||
    explicit === "stripe_checkout" ||
    explicit === "contact_sales"
  ) {
    return explicit;
  }
  const family = planFamily(plan);
  if (family === "free") return "free";
  if (family === "custom" && !isPurchasable(plan)) return "contact_sales";
  return "stripe_checkout";
}

export function planCtaHref(
  plan: CatalogPlan | undefined,
  fallback?: string,
): string {
  const rawHref = plan?.features?.cta_href;
  if (
    typeof rawHref === "string" &&
    /^(\/(?!\/)|https:\/\/)/.test(rawHref.trim())
  ) {
    return rawHref.trim();
  }
  const mode = planCtaMode(plan);
  if (mode === "free") return fallback ?? "/login";
  if (mode === "contact_sales") return fallback ?? "/docs/contact";
  return fallback ?? "/panel/subscription";
}

/**
 * Renders the catalog's list price. Amounts are stored in the currency's minor
 * unit, so 3000 CNY-cents reads as ¥30. Supports custom `features.price_unit_label`
 * (such as `"小时/次"`).
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
  const rendered = Number.isInteger(major) ? String(major) : major.toFixed(2);

  const customUnitLabel =
    locale === "en"
      ? (plan.features?.price_unit_label_en ?? plan.features?.price_unit_label)
      : (plan.features?.price_unit_label_zh ?? plan.features?.price_unit_label);
  if (typeof customUnitLabel === "string" && customUnitLabel.trim() !== "") {
    const clean = customUnitLabel.trim();
    return {
      amount: `${symbol}${rendered}`,
      period: clean.startsWith("/") ? clean : `/${clean}`,
    };
  }

  const unit = (plan.priceUnit ?? "").toLowerCase();
  return {
    amount: `${symbol}${rendered}`,
    period: UNIT_SUFFIX[unit]?.[locale] ?? "",
  };
}

function sanitizeGraceCopy(text: string, days: number): string {
  return text
    .replace(/14\s*天欠[费款]宽限期/g, `${days} 天欠费宽限期`)
    .replace(/14-day grace period/gi, `${days}-day grace period`);
}

export function planDescription(
  plan: CatalogPlan | undefined,
  locale: "zh" | "en",
): string {
  if (!plan) return "";
  const days = graceDays(plan);
  const raw =
    locale === "en"
      ? (plan.features?.description_en ?? plan.features?.description)
      : (plan.features?.description_zh ?? plan.features?.description);
  if (typeof raw === "string" && raw.trim() !== "") {
    return sanitizeGraceCopy(raw.trim(), days);
  }

  const family = planFamily(plan) ?? "plus";
  const quota = formatPlanQuota(plan, locale);
  const matrix = (plan.features?.comparison_matrix ??
    {}) as PlanComparisonMatrix;

  switch (family) {
    case "free":
      return locale === "zh"
        ? `基础免费体验档${quota ? `（${quota}）` : ""}，登录即可使用。`
        : `Starter free plan${quota ? ` (${quota})` : ""} — sign in to connect.`;
    case "plus":
      return locale === "zh"
        ? `订阅用户 · ${quota || "30 GB"} 高速流量 · ${matrix.resources || "共享资源池"}。`
        : `${quota || "30 GB"} accelerated traffic · ${matrix.resources || "Shared resource pool"}.`;
    case "pro":
      return locale === "zh"
        ? `订阅用户 · ${quota || "50 GB"} 高速流量 · ${matrix.resources || "PRO专属资源池"}。`
        : `${quota || "50 GB"} accelerated traffic · ${matrix.resources || "PRO dedicated resource pool"}.`;
    case "custom":
      if (planCheckoutMode(plan) === "payment") {
        return locale === "zh"
          ? "支持：MacOS Windows Linux IOS Android，不支持：国产华为纯血鸿蒙系统（面向非订阅用户的付费服务）"
          : "Supported: macOS, Windows, Linux, iOS, Android. Not supported: Huawei HarmonyOS NEXT (paid service for non-subscribers).";
      }
      return locale === "zh"
        ? "订阅用户 · 独享IP · 独享节点 · 每个月免费更换一次，再次更换10元/次。"
        : "Dedicated IP & dedicated node · 1 free IP change per month, then ¥10/change.";
  }
}

function parseMarketingFeatures(raw: unknown, days: number): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is string => typeof item === "string")
      .map((item) => sanitizeGraceCopy(item.trim(), days))
      .filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    return raw
      .split(/\r?\n/)
      .map((item) => sanitizeGraceCopy(item.trim(), days))
      .filter(Boolean);
  }
  return [];
}

export function planFeatureList(
  plan: CatalogPlan | undefined,
  locale: "zh" | "en",
): string[] {
  if (!plan) return [];
  const days = graceDays(plan);
  const explicit =
    locale === "en"
      ? (plan.features?.marketing_features_en ??
        plan.features?.marketing_features ??
        plan.features?.features)
      : (plan.features?.marketing_features_zh ??
        plan.features?.marketing_features ??
        plan.features?.features);
  const parsed = parseMarketingFeatures(explicit, days);
  if (parsed.length > 0) {
    return parsed;
  }

  const family = planFamily(plan) ?? "plus";
  const quota = formatPlanQuota(plan, locale);
  const matrix = (plan.features?.comparison_matrix ??
    {}) as PlanComparisonMatrix;

  switch (family) {
    case "free":
      return locale === "zh"
        ? [
            quota ? `每月 ${quota} 基础流量` : "基础免费流量额度",
            matrix.resources || "共享基础资源池",
            "可随时升级至 PLUS / PRO / 定制节点",
          ]
        : [
            quota ? `${quota} starter traffic` : "Starter free traffic",
            matrix.resources || "Shared starter resource pool",
            "Upgrade to PLUS, PRO, or Custom anytime",
          ];
    case "plus":
      return locale === "zh"
        ? [
            quota ? `每月 ${quota} 高速流量` : "每月 30 GB 高速流量",
            matrix.resources || "共享资源池",
            `${days} 天欠费宽限期`,
          ]
        : [
            quota
              ? `${quota} accelerated traffic`
              : "30 GB accelerated traffic",
            matrix.resources || "Shared resource pool",
            `${days}-day grace period`,
          ];
    case "pro":
      return locale === "zh"
        ? [
            quota ? `${quota} 高速流量` : "每月 50 GB 高速流量",
            matrix.resources || "PRO专属资源池",
            `${days} 天欠费宽限期`,
          ]
        : [
            quota
              ? `${quota} accelerated traffic`
              : "50 GB accelerated traffic",
            matrix.resources || "PRO dedicated resource pool",
            `${days}-day grace period`,
          ];
    case "custom":
      if (planCheckoutMode(plan) === "payment") {
        return locale === "zh"
          ? [
              "面向非订阅用户的付费服务（100元/小时/次）",
              "支持：MacOS Windows Linux IOS Android",
              "不支持：国产华为纯血鸿蒙系统",
            ]
          : [
              "Paid consultation for non-subscribers (¥100/hour/session)",
              "Supported: macOS, Windows, Linux, iOS, Android",
              "Not supported: Huawei HarmonyOS NEXT",
            ];
      }
      return locale === "zh"
        ? [
            matrix.exit_ip && matrix.resources
              ? `${matrix.exit_ip} · ${matrix.resources}`
              : "独享IP · 独享节点",
            matrix.ip_changes || "每个月免费更换一次，再次更换10元/次",
            `${days} 天欠费宽限期`,
          ]
        : [
            matrix.exit_ip && matrix.resources
              ? `${matrix.exit_ip} · ${matrix.resources}`
              : "Dedicated IP · Dedicated node",
            matrix.ip_changes || "1 free IP change per month, then ¥10/change",
            `${days}-day grace period`,
          ];
  }
}

export function planComparisonRow(
  plan: CatalogPlan,
  locale: "zh" | "en",
): PlanComparisonRow {
  const family = planFamily(plan) ?? "plus";
  const price = formatPlanPrice(plan, locale);
  const quota = formatPlanQuota(plan, locale);
  const days = graceDays(plan);
  const matrix = (plan.features?.comparison_matrix ??
    {}) as PlanComparisonMatrix;
  const ctaMode = planCtaMode(plan);

  const defaultResources: Record<PlanFamilyId, { zh: string; en: string }> = {
    free: { zh: "共享基础资源池", en: "Shared starter resource pool" },
    plus: { zh: "共享资源池", en: "Shared resource pool" },
    pro: { zh: "PRO专属资源池", en: "PRO dedicated resource pool" },
    custom:
      planCheckoutMode(plan) === "payment"
        ? {
            zh: "一对一 AI 工具咨询与电脑环境配置",
            en: "1-on-1 AI tool consultation & environment setup",
          }
        : { zh: "独享节点", en: "Dedicated node" },
  };

  const defaultExitIp: Record<PlanFamilyId, { zh: string; en: string }> = {
    free: { zh: "共享 IP", en: "Shared IP" },
    plus: { zh: "共享 IP", en: "Shared IP" },
    pro: { zh: "精品 IP 资源", en: "Premium IP resources" },
    custom:
      planCheckoutMode(plan) === "payment"
        ? { zh: "—", en: "—" }
        : { zh: "独享IP", en: "Dedicated IP" },
  };

  const defaultIpChanges: Record<PlanFamilyId, { zh: string; en: string }> = {
    free: { zh: "—", en: "—" },
    plus: { zh: "—", en: "—" },
    pro: { zh: "—", en: "—" },
    custom:
      planCheckoutMode(plan) === "payment"
        ? { zh: "—", en: "—" }
        : {
            zh: "每个月免费更换一次，再次更换10元/次",
            en: "1 free change/month, then ¥10/change",
          },
  };

  const defaultSupport: Record<PlanFamilyId, { zh: string; en: string }> = {
    free: { zh: "基础文档与社区支持", en: "Documentation & community support" },
    plus: {
      zh: "环境维护与技术支持",
      en: "Environment maintenance & technical support",
    },
    pro: {
      zh: "优先环境维护与技术支持",
      en: "Priority maintenance & technical support",
    },
    custom:
      planCheckoutMode(plan) === "payment"
        ? {
            zh: "支持：MacOS Windows Linux IOS Android，不支持：国产华为纯血鸿蒙系统",
            en: "Supported: macOS, Windows, Linux, iOS, Android; Not supported: HarmonyOS NEXT",
          }
        : {
            zh: "专属节点维护与技术支持",
            en: "Dedicated node maintenance & technical support",
          },
  };

  const priceDisplay =
    family === "free" && !price
      ? locale === "zh"
        ? "免费"
        : "Free"
      : price
        ? `${price.amount}${price.period}`
        : family === "custom"
          ? locale === "zh"
            ? "按需定制"
            : "Custom pricing"
          : locale === "zh"
            ? "即将上线"
            : "Coming soon";

  const quotaDisplay =
    quota ||
    (planCheckoutMode(plan) === "payment"
      ? locale === "zh"
        ? "按小时/按次服务"
        : "Per hour / session"
      : family === "custom"
        ? locale === "zh"
          ? "独享节点配额"
          : "Dedicated node allowance"
        : "—");

  const graceDisplay =
    family === "free" || planCheckoutMode(plan) === "payment"
      ? "—"
      : locale === "zh"
        ? `${days} 天欠费宽限期`
        : `${days}-day grace period`;

  const ctaLabel =
    ctaMode === "free"
      ? locale === "zh"
        ? "免费开始"
        : "Start for free"
      : ctaMode === "contact_sales"
        ? locale === "zh"
          ? "联系定制"
          : "Contact sales"
        : locale === "zh"
          ? "立即订阅"
          : "Subscribe";

  const ctaHref =
    ctaMode === "free"
      ? planCtaHref(plan, "/register")
      : ctaMode === "contact_sales"
        ? planCtaHref(plan, "/prices")
        : "/panel/subscription";

  return {
    planId: plan.planId,
    family,
    name: plan.displayName?.trim() || plan.planId,
    price: priceDisplay,
    quota: quotaDisplay,
    resources: matrix.resources?.trim() || defaultResources[family][locale],
    exitIp: matrix.exit_ip?.trim() || defaultExitIp[family][locale],
    ipChanges: matrix.ip_changes?.trim() || defaultIpChanges[family][locale],
    support: matrix.support?.trim() || defaultSupport[family][locale],
    gracePeriod: graceDisplay,
    ctaLabel,
    ctaHref,
    ctaMode,
  };
}

export function copyForPlan(plan: CatalogPlan): PlanCopyEntry {
  const name = plan.displayName?.trim() || plan.planId;
  return {
    mode: planCheckoutMode(plan),
    zh: {
      name,
      description: planDescription(plan, "zh"),
      features: planFeatureList(plan, "zh"),
    },
    en: {
      name,
      description: planDescription(plan, "en"),
      features: planFeatureList(plan, "en"),
    },
  };
}

/**
 * Resolves a plan from the catalog map by ID, or synthesizes a minimal plan
 * record when the user's current plan ID is a legacy identifier not in the map.
 */
export function resolveCatalogPlan(
  catalog: Map<string, CatalogPlan>,
  planId: string | undefined,
): CatalogPlan | undefined {
  if (!planId) return undefined;
  const found = catalog.get(planId);
  if (found) return found;
  const family = classifyFamilyToken(planId);
  if (!family || family === "excluded") return undefined;
  return {
    planId,
    displayName: planId,
    kind: "subscription",
    packageName: family,
    active: true,
  };
}

/**
 * Determines whether an existing subscriber on `currentPlan` can upgrade to
 * `targetPlan` in-place. True when both are paid subscription plans and
 * `targetPlan` has a higher family tier rank, or is in the same family moving
 * from monthly to yearly / higher list price.
 */
export function canUpgradeSubscription(
  currentPlan: CatalogPlan | undefined,
  targetPlan: CatalogPlan | undefined,
): boolean {
  if (!currentPlan || !targetPlan) return false;
  if (currentPlan.planId === targetPlan.planId) return false;
  const currentFamily = planFamily(currentPlan);
  const targetFamily = planFamily(targetPlan);
  if (
    !currentFamily ||
    !targetFamily ||
    currentFamily === "free" ||
    targetFamily === "free"
  ) {
    return false;
  }
  if (planCheckoutMode(targetPlan) !== "subscription") {
    return false;
  }
  const currentRank = planTierRank(currentFamily);
  const targetRank = planTierRank(targetFamily);
  if (targetRank > currentRank) {
    return true;
  }
  if (targetRank === currentRank) {
    const currentUnit = (currentPlan.priceUnit ?? "month").toLowerCase();
    const targetUnit = (targetPlan.priceUnit ?? "month").toLowerCase();
    if (currentUnit === "month" && targetUnit === "year") {
      return true;
    }
    if ((targetPlan.priceAmount ?? 0) > (currentPlan.priceAmount ?? 0)) {
      return true;
    }
  }
  return false;
}

function compareCatalogPlans(left: CatalogPlan, right: CatalogPlan): number {
  const rankDiff = planTierRank(left) - planTierRank(right);
  if (rankDiff !== 0) return rankDiff;
  const sortDiff = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
  if (sortDiff !== 0) return sortDiff;
  const unitOrder: Record<string, number> = {
    month: 0,
    year: 1,
    hour: 2,
    once: 3,
  };
  const leftUnit = unitOrder[(left.priceUnit ?? "").toLowerCase()] ?? 4;
  const rightUnit = unitOrder[(right.priceUnit ?? "").toLowerCase()] ?? 4;
  if (leftUnit !== rightUnit) return leftUnit - rightUnit;
  return left.planId.localeCompare(right.planId);
}

/**
 * Returns every active billing plan in the 4 supported families (`free`, `plus`,
 * `pro`, `custom`), filtering out inactive, `trial`, `paygo_topup`, and
 * `internal_only` rows.
 */
export function billingPlans(
  catalog: Map<string, CatalogPlan>,
): Array<{
  planId: string;
  family: PlanFamilyId;
  copy: PlanCopyEntry;
  plan: CatalogPlan;
}> {
  return [...catalog.values()]
    .filter((plan) => plan.active && planFamily(plan) !== null)
    .sort(compareCatalogPlans)
    .map((plan) => ({
      planId: plan.planId,
      family: planFamily(plan)!,
      copy: copyForPlan(plan),
      plan,
    }));
}

export function groupCatalogByFamily(
  catalog: Map<string, CatalogPlan> | CatalogPlan[],
): Record<PlanFamilyId, CatalogPlan[]> {
  const list = Array.isArray(catalog) ? catalog : [...catalog.values()];
  const grouped: Record<PlanFamilyId, CatalogPlan[]> = {
    free: [],
    plus: [],
    pro: [],
    custom: [],
  };
  for (const plan of list) {
    if (!plan.active) continue;
    const family = planFamily(plan);
    if (!family) continue;
    grouped[family].push(plan);
  }
  for (const family of PLAN_FAMILIES) {
    grouped[family].sort(compareCatalogPlans);
  }
  return grouped;
}

/**
 * Merges live active catalog plans with the 4-family default templates for any
 * family not yet published in `/api/billing/plans`.
 */
export function catalogWithFamilyDefaults(
  catalog: Map<string, CatalogPlan>,
): CatalogPlan[] {
  const grouped = groupCatalogByFamily(catalog);
  const result: CatalogPlan[] = [];
  for (const family of PLAN_FAMILIES) {
    if (grouped[family].length > 0) {
      result.push(...grouped[family]);
    } else {
      result.push(
        ...DEFAULT_CATALOG_PLANS.filter((p) => planFamily(p) === family),
      );
    }
  }
  return result;
}

export function buildXConnectPlanComparison(
  catalog: Map<string, CatalogPlan>,
  locale: "zh" | "en",
): {
  columns: PlanComparisonRow[];
  rows: Array<{ label: string; values: string[] }>;
} {
  const plans = catalogWithFamilyDefaults(catalog);
  const columns = plans.map((plan) => planComparisonRow(plan, locale));
  const rows = [
    {
      label: locale === "zh" ? "价格" : "Price",
      values: columns.map((c) => c.price),
    },
    {
      label: locale === "zh" ? "流量 / 规格" : "Quota / Scope",
      values: columns.map((c) => c.quota),
    },
    {
      label: locale === "zh" ? "资源池" : "Resources",
      values: columns.map((c) => c.resources),
    },
    {
      label: locale === "zh" ? "出口 IP" : "Exit IP",
      values: columns.map((c) => c.exitIp),
    },
    {
      label: locale === "zh" ? "IP 更换" : "IP changes",
      values: columns.map((c) => c.ipChanges),
    },
    {
      label: locale === "zh" ? "服务与支持" : "Support",
      values: columns.map((c) => c.support),
    },
    {
      label: locale === "zh" ? "欠费宽限期" : "Grace period",
      values: columns.map((c) => c.gracePeriod),
    },
  ];
  return { columns, rows };
}

/**
 * Reads the live catalog from `/api/billing/plans` (`cache: "no-store"`).
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
        // Catalog stays empty; callers fall back to non-purchasable defaults.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return catalog;
}
