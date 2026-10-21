import type { BillingPlan } from "./planUpsert";

export const GB = 1024 ** 3;
export type FamilyId = "free" | "plus" | "pro" | "payg" | "beta" | "gift";
export type CatalogPolicy = {
  family: FamilyId;
  quotaCycle: "natural_month" | "subscription_year" | "none";
  fallback: "vps_pool" | "pause";
  promotionEnds?: string;
  regularAnnualAmount?: number;
  grandfatherDiscount?: boolean;
  registrationDefault?: boolean;
  cnyPerGB?: number;
  usdTrafficGB?: number;
  minimumDays?: number;
  maximumDays?: number;
  giftOnly?: boolean;
  quantity?: number;
  legacyExpiresAt?: string;
  transitionTargetPlanId?: string;
  paidProtection?: boolean;
};
export type Family = {
  id: FamilyId;
  name: string;
  description: string;
  summary: string;
  price: string;
  variants: BillingPlan[];
};

const variant = (
  family: FamilyId,
  id: string,
  name: string,
  quota: number,
  amount = 0,
  unit = "",
  extra: Partial<CatalogPolicy> = {},
): BillingPlan => ({
  planId: id,
  displayName: name,
  kind: "subscription",
  packageName: family === "beta" ? "unlimited-beta" : family,
  includedQuotaBytes: quota * GB,
  active: false,
  priceAmount: amount,
  priceCurrency: amount ? "CNY" : "",
  priceUnit: unit,
  features: {
    catalog_policy: {
      family,
      quotaCycle: unit === "year" ? "subscription_year" : "natural_month",
      fallback: family === "plus" || family === "pro" ? "vps_pool" : "pause",
      ...extra,
    },
  },
});

// New editions are separate drafts: opening this editor never overwrites a
// legacy Price mapping or propagates a new default quota to existing users.
export const CATALOG_FAMILIES: Family[] = [
  {
    id: "free",
    name: "Free",
    description: "免费额度，按需申请提升。",
    summary: "1 GB / 3 GB / 5 GB · 新注册默认 1 GB",
    price: "免费",
    variants: [
      variant("free", "FREE-1GB-2026", "Free · 1 GB", 1, 0, "", {
        registrationDefault: true,
      }),
      variant("free", "FREE-3GB-2026", "Free · 3 GB", 3),
      variant("free", "FREE-5GB-2026", "Free · 5 GB", 5),
    ],
  },
  {
    id: "plus",
    name: "Plus",
    description: "月付或年付，高速额度用尽转 VPS 流量池。",
    summary: "20 GB / 月 · 240 GB / 年",
    price: "¥20 / 月 · 年付优惠 ¥200",
    variants: [
      variant("plus", "PLUS-MONTHLY-2026", "Plus 月付", 20, 2000, "month"),
      variant("plus", "PLUS-YEARLY-2026", "Plus 年付", 240, 20000, "year", {
        promotionEnds: "2026-12-31",
        regularAnnualAmount: 24000,
        grandfatherDiscount: true,
      }),
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "总流量不限，高速额度用尽转 VPS 流量池。",
    summary: "50 GB / 月 · 600 GB / 年 · 总流量不限",
    price: "¥50 / 月 · ¥500 / 年",
    variants: [
      variant("pro", "PRO-MONTHLY-2026", "Pro 月付", 50, 5000, "month"),
      variant("pro", "PRO-YEARLY-2026", "Pro 年付", 600, 50000, "year"),
    ],
  },
  {
    id: "payg",
    name: "Pay As You Go",
    description: "按流量独立扣费，人民币与美元不兑换。",
    summary: "¥1 / GB · $1 / 7 GB",
    price: "按量计费",
    variants: [
      variant("payg", "PAYG-2026", "Pay As You Go", 0, 0, "", {
        quotaCycle: "none",
        cnyPerGB: 1,
        usdTrafficGB: 7,
      }),
    ],
  },
  {
    id: "beta",
    name: "无限制（内测）",
    description: "限时开放，按账户分配有效期。",
    summary: "30–90 天 · 不限流量",
    price: "内测申请",
    variants: [
      variant("beta", "UNLIMITED-BETA-2026", "无限制（内测）", 0, 0, "", {
        quotaCycle: "none",
        minimumDays: 30,
        maximumDays: 90,
      }),
    ],
  },
  {
    id: "gift",
    name: "临时流量包",
    description: "一次性赠送额度，自然月到期。",
    summary: "赠送 · 自然月到期 · 不退款",
    price: "赠送",
    variants: [
      variant("gift", "TRAFFIC-GIFT-2026", "临时流量包", 10, 0, "", {
        giftOnly: true,
      }),
    ],
  },
];
export function policyFor(plan: BillingPlan): CatalogPolicy {
  return plan.features?.catalog_policy as CatalogPolicy;
}
export function quotaToGB(bytes?: number): string {
  if (bytes === undefined) return "0";
  if (!Number.isSafeInteger(bytes) || bytes < 0) return "";
  return String(bytes / GB);
}
export function quotaFromGB(value: string): number {
  if (!value.trim()) throw new Error("请填写高速流量（GB）。");
  const gb = Number(value),
    bytes = Math.round(gb * GB);
  if (!Number.isFinite(gb) || gb < 0 || !Number.isSafeInteger(bytes))
    throw new Error("请输入有效且不超出范围的 GB 数值。");
  return bytes;
}
export function partitionCatalog(plans: BillingPlan[]) {
  const ids = new Set(
    CATALOG_FAMILIES.flatMap((f) => f.variants.map((p) => p.planId)),
  );
  return {
    families: CATALOG_FAMILIES.map((f) => ({
      ...f,
      variants: f.variants.map(
        (template) =>
          plans.find((p) => p.planId === template.planId) ?? template,
      ),
    })),
    legacy: plans.filter((p) => !ids.has(p.planId)),
  };
}
