import type { BillingPlan } from "./planUpsert";

export const GB = 1024 ** 3;
export type FamilyId = "free" | "plus" | "pro" | "custom";

export type Family = {
  id: FamilyId;
  name: string;
  description: string;
  summary: string;
  price: string;
  variants: BillingPlan[];
};

const FAMILY_SET = new Set<FamilyId>(["free", "plus", "pro", "custom"]);

export function inferFamilyId(plan: BillingPlan): FamilyId | null {
  const kind = (plan.kind || "").toLowerCase().trim();
  if (kind === "trial" || kind === "paygo_topup") return null;
  const featureFamily =
    typeof plan.features?.family === "string"
      ? plan.features.family.toLowerCase().trim()
      : "";
  if (FAMILY_SET.has(featureFamily as FamilyId)) {
    return featureFamily as FamilyId;
  }
  const pkg = (plan.packageName || "").toLowerCase().trim();
  if (FAMILY_SET.has(pkg as FamilyId)) {
    return pkg as FamilyId;
  }
  const upperId = (plan.planId || "").toUpperCase().trim();
  if (upperId === "FREE" || upperId.startsWith("FREE-")) return "free";
  if (upperId === "PLUS" || upperId.startsWith("PLUS-")) return "plus";
  if (upperId === "PRO" || upperId.startsWith("PRO-")) return "pro";
  if (upperId === "CUSTOM" || upperId.startsWith("CUSTOM-")) return "custom";
  return null;
}

export const CATALOG_FAMILIES: Family[] = [
  {
    id: "free",
    name: "Free",
    description: "基础免费额度，登录即可使用。",
    summary: "5 GB / 月 · 共享资源池",
    price: "免费",
    variants: [
      {
        planId: "FREE",
        displayName: "Free",
        kind: "subscription",
        packageName: "free",
        includedQuotaBytes: 5 * GB,
        active: false,
        priceAmount: 0,
        priceCurrency: "CNY",
        priceUnit: "month",
        features: {
          family: "free",
          tier_rank: 0,
          quota_cycle: "natural_month",
          dunning: { policy: "none", grace_days: 3 },
          comparison_matrix: {
            resources: "共享资源池",
            exit_ip: "共享出口",
          },
        },
      },
    ],
  },
  {
    id: "plus",
    name: "Plus",
    description: "订阅用户流量套餐，30 天/月周期，3 天欠款宽限期。",
    summary: "30 GB / 月 · 共享资源池",
    price: "¥30 / 月",
    variants: [
      {
        planId: "PLUS-MONTHLY-2026",
        displayName: "Plus",
        kind: "subscription",
        packageName: "plus",
        includedQuotaBytes: 30 * GB,
        active: false,
        priceAmount: 3000,
        priceCurrency: "CNY",
        priceUnit: "month",
        features: {
          family: "plus",
          tier_rank: 10,
          audience: "订阅用户",
          quota_cycle: "natural_month",
          dunning: { policy: "downgrade_to_free", grace_days: 3 },
          comparison_matrix: {
            resources: "共享资源池",
            exit_ip: "共享出口",
          },
        },
      },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Pro 专属资源池，50 GB/月，3 天欠款宽限期。",
    summary: "50 GB / 月 · PRO专属资源池",
    price: "¥50 / 月",
    variants: [
      {
        planId: "PRO-MONTHLY-2026",
        displayName: "Pro",
        kind: "subscription",
        packageName: "pro",
        includedQuotaBytes: 50 * GB,
        active: false,
        priceAmount: 5000,
        priceCurrency: "CNY",
        priceUnit: "month",
        features: {
          family: "pro",
          tier_rank: 20,
          audience: "订阅用户",
          highlight: true,
          quota_cycle: "natural_month",
          dunning: { policy: "downgrade_to_free", grace_days: 3 },
          comparison_matrix: {
            resources: "PRO专属资源池",
            exit_ip: "Pro专属节点",
          },
        },
      },
    ],
  },
  {
    id: "custom",
    name: "Custom 定制",
    description: "定制节点（独享IP/节点）与 AI 工具咨询/电脑环境配置。",
    summary: "定制节点 ¥80/月 · AI 工具咨询 ¥100/小时/次",
    price: "¥80/月 · ¥100/小时/次",
    variants: [
      {
        planId: "CUSTOM-NODE-MONTHLY-2026",
        displayName: "定制节点",
        kind: "subscription",
        packageName: "custom",
        includedQuotaBytes: 0,
        active: false,
        priceAmount: 8000,
        priceCurrency: "CNY",
        priceUnit: "month",
        features: {
          family: "custom",
          tier_rank: 30,
          checkout_mode: "subscription",
          audience: "订阅用户",
          quota_label: "独享IP · 独享节点",
          dunning: { policy: "downgrade_to_free", grace_days: 3 },
          comparison_matrix: {
            resources: "独享节点",
            exit_ip: "独享IP",
            ip_changes: "每个月免费更换一次，再次更换10元/次",
          },
        },
      },
      {
        planId: "CUSTOM-AI-CONSULT-2026",
        displayName: "AI 工具咨询，电脑环境配置",
        kind: "service",
        packageName: "custom",
        includedQuotaBytes: 0,
        active: false,
        priceAmount: 10000,
        priceCurrency: "CNY",
        priceUnit: "once",
        features: {
          family: "custom",
          tier_rank: 30,
          checkout_mode: "payment",
          price_unit_label: "小时/次",
          audience: "面向非订阅用户的付费服务",
          description:
            "支持：MacOS Windows Linux IOS Android，不支持：国产华为纯血鸿蒙系统",
          dunning: { policy: "none", grace_days: 3 },
          comparison_matrix: {
            support:
              "MacOS / Windows / Linux / IOS / Android（不支持国产华为纯血鸿蒙系统）",
          },
        },
      },
    ],
  },
];

export function quotaToGB(bytes?: number): string {
  if (bytes === undefined) return "0";
  if (!Number.isSafeInteger(bytes) || bytes < 0) return "";
  return String(bytes / GB);
}

export function quotaFromGB(value: string): number {
  if (!value.trim()) throw new Error("请填写高速流量（GB）。");
  const gb = Number(value);
  const bytes = Math.round(gb * GB);
  if (!Number.isFinite(gb) || gb < 0 || !Number.isSafeInteger(bytes)) {
    throw new Error("请输入有效且不超出范围的 GB 数值。");
  }
  return bytes;
}

export function partitionCatalog(plans: BillingPlan[]) {
  const familyBuckets: Record<FamilyId, BillingPlan[]> = {
    free: [],
    plus: [],
    pro: [],
    custom: [],
  };
  const legacy: BillingPlan[] = [];

  for (const plan of plans) {
    const fam = inferFamilyId(plan);
    if (fam) {
      familyBuckets[fam].push(plan);
    } else {
      legacy.push(plan);
    }
  }

  return {
    families: CATALOG_FAMILIES.map((f) => {
      const persisted = familyBuckets[f.id];
      const mergedTemplates = f.variants.map(
        (template) =>
          persisted.find((p) => p.planId === template.planId) ?? template,
      );
      const templateIds = new Set(f.variants.map((v) => v.planId));
      const extras = persisted.filter((p) => !templateIds.has(p.planId));
      return {
        ...f,
        variants: [...mergedTemplates, ...extras],
      };
    }),
    legacy,
  };
}
