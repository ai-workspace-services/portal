import type { BillingPlan } from "./planUpsert";

export const GB = 1024 ** 3;
export type FamilyId = "plus" | "pro" | "custom";

export type Family = {
  id: FamilyId;
  name: string;
  description: string;
  summary: string;
  price: string;
  variants: BillingPlan[];
};

const FAMILY_SET = new Set<FamilyId>(["plus", "pro", "custom"]);

export function inferFamilyId(plan: BillingPlan): FamilyId | null {
  const kind = (plan.kind || "").toLowerCase().trim();
  const pkg = (plan.packageName || "").toLowerCase().trim();
  const upperId = (plan.planId || "").toUpperCase().trim();
  if (
    kind === "trial" ||
    kind === "paygo_topup" ||
    kind === "whitelist_group" ||
    kind === "paused" ||
    pkg === "whitelist" ||
    pkg === "free" ||
    pkg === "payg" ||
    pkg === "paygo" ||
    upperId === "FREE" ||
    upperId.startsWith("FREE-") ||
    upperId === "PAYG" ||
    upperId.startsWith("PAYG-") ||
    upperId === "WHITELIST-FREE" ||
    upperId === "TRIAL-5GB-ONCE" ||
    upperId === "PAUSED"
  ) {
    return null;
  }
  const featureFamily =
    typeof plan.features?.family === "string"
      ? plan.features.family.toLowerCase().trim()
      : "";
  if (FAMILY_SET.has(featureFamily as FamilyId)) {
    return featureFamily as FamilyId;
  }
  if (FAMILY_SET.has(pkg as FamilyId)) {
    return pkg as FamilyId;
  }
  if (upperId === "PLUS" || upperId.startsWith("PLUS-")) return "plus";
  if (upperId === "PRO" || upperId.startsWith("PRO-")) return "pro";
  if (upperId === "CUSTOM" || upperId.startsWith("CUSTOM-")) return "custom";
  return null;
}

export const CATALOG_FAMILIES: Family[] = [
  {
    id: "plus",
    name: "Plus",
    description: "订阅用户 VPS 共享流量套餐，月付无年付优惠，含 3 天欠款宽限期；到期或耗尽进入暂停流量模式。",
    summary: "20 GB / ¥20 月 · 30 GB / ¥30 月 · Media-Pool",
    price: "¥20 – ¥30 / 月",
    variants: [
      {
        planId: "PLUS",
        displayName: "Plus · 20 GB",
        kind: "subscription",
        packageName: "plus",
        includedQuotaBytes: 20 * GB,
        highSpeedQuotaBytes: 0,
        sortOrder: 10,
        active: false,
        priceAmount: 2000,
        priceCurrency: "CNY",
        priceUnit: "month",
        features: {
          family: "plus",
          tier_rank: 10,
          audience: "订阅用户",
          quota_cycle: "natural_month",
          dunning: { policy: "pause_traffic", grace_days: 3 },
          comparison_matrix: {
            resources: "Media-Pool 共享资源池",
            exit_ip: "共享出口",
          },
        },
      },
      {
        planId: "PLUS-MONTHLY-2026",
        displayName: "Plus · 30 GB",
        kind: "subscription",
        packageName: "plus",
        includedQuotaBytes: 30 * GB,
        highSpeedQuotaBytes: 0,
        sortOrder: 15,
        active: false,
        priceAmount: 3000,
        priceCurrency: "CNY",
        priceUnit: "month",
        features: {
          family: "plus",
          tier_rank: 10,
          audience: "订阅用户",
          quota_cycle: "natural_month",
          dunning: { policy: "pause_traffic", grace_days: 3 },
          comparison_matrix: {
            resources: "Media-Pool 共享资源池",
            exit_ip: "共享出口",
          },
        },
      },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Pro 双资源池订阅：30 GB/月高速流量资源池 + 50 GB/月 VPS 流量资源池，含 3 天欠款宽限期。",
    summary: "30 GB 高速 + 50 GB VPS / 月",
    price: "¥50 / 月 · ¥500 / 年",
    variants: [
      {
        planId: "PRO-MONTHLY-V2",
        displayName: "Pro 月付",
        kind: "subscription",
        packageName: "pro",
        includedQuotaBytes: 50 * GB,
        highSpeedQuotaBytes: 30 * GB,
        sortOrder: 20,
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
          dunning: { policy: "pause_traffic", grace_days: 3 },
          comparison_matrix: {
            resources: "30 GB 高速池 (Pro-EC2-Pool) + 50 GB VPS 池 (Media-Pool)",
            exit_ip: "Pro 高速专属节点 + 共享出口",
          },
        },
      },
      {
        planId: "PRO-YEARLY-V2",
        displayName: "Pro 年付",
        kind: "subscription",
        packageName: "pro",
        includedQuotaBytes: 50 * GB,
        highSpeedQuotaBytes: 30 * GB,
        sortOrder: 25,
        active: false,
        priceAmount: 50000,
        priceCurrency: "CNY",
        priceUnit: "year",
        features: {
          family: "pro",
          tier_rank: 20,
          audience: "订阅用户",
          highlight: true,
          quota_cycle: "natural_month",
          dunning: { policy: "pause_traffic", grace_days: 3 },
          comparison_matrix: {
            resources: "30 GB/月 高速池 + 50 GB/月 VPS 池（年付，按自然月发放额度）",
            exit_ip: "Pro 高速专属节点 + 共享出口",
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
        highSpeedQuotaBytes: 0,
        sortOrder: 30,
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
          dunning: { policy: "pause_traffic", grace_days: 3 },
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
        highSpeedQuotaBytes: 0,
        sortOrder: 35,
        active: false,
        priceAmount: 10000,
        priceCurrency: "CNY",
        priceUnit: "once",
        features: {
          family: "custom",
          tier_rank: 30,
          checkout_mode: "payment",
          price_unit_label: "小时/次",
          audience: "面向用户的付费服务",
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
  if (!value.trim()) throw new Error("请填写流量（GB）。");
  const gb = Number(value);
  const bytes = Math.round(gb * GB);
  if (!Number.isFinite(gb) || gb < 0 || !Number.isSafeInteger(bytes)) {
    throw new Error("请输入有效且不超出范围的 GB 数值。");
  }
  return bytes;
}

export function partitionCatalog(plans: BillingPlan[]) {
  const familyBuckets: Record<FamilyId, BillingPlan[]> = {
    plus: [],
    pro: [],
    custom: [],
  };
  const legacy: BillingPlan[] = [];

  for (const plan of plans) {
    const kind = (plan.kind || "").toLowerCase().trim();
    const pkg = (plan.packageName || "").toLowerCase().trim();
    const upperId = (plan.planId || "").toUpperCase().trim();
    if (
      kind === "whitelist_group" ||
      pkg === "whitelist" ||
      upperId === "WHITELIST-FREE"
    ) {
      continue;
    }
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
