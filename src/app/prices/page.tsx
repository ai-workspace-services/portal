"use client";

import React, { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { Check, Shield } from "lucide-react";

import CheckoutStatusBanner from "@components/billing/CheckoutStatusBanner";
import { startStripeCheckout } from "@components/billing/stripe-client";
import Footer from "../../components/Footer";
import MarketingNav from "@/components/marketing/MarketingNav";
import { useLanguage } from "../../i18n/LanguageProvider";
import {
  formatPlanPrice,
  isPurchasable,
  PLAN_COPY,
  useBillingCatalog,
  XCONNECT_PRODUCT_SLUG,
  type CatalogPlan,
} from "@modules/billing/catalog";

type CardBillingPlan = {
  planId: string;
  mode: "payment" | "subscription";
  stripePriceId: string;
};

type PricingCard = {
  key: string;
  productSlug?: string;
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  button: string;
  highlight?: boolean;
  href?: string;
  billingPlan?: CardBillingPlan;
};

// billing_plans is the live source of truth for what is purchasable; the
// display copy lives in @modules/billing/catalog so this page and the user
// center quote the same numbers for the same planId.
function useXconnectCards(
  isChinese: boolean,
  catalog: Map<string, CatalogPlan>,
): PricingCard[] {
  return useMemo(() => {
    const purchasable = (planId: string) => isPurchasable(catalog.get(planId));
    const priceIdOf = (planId: string) =>
      catalog.get(planId)?.stripePriceId ?? "";
    // Copy comes from the shared module, the amount from the catalog. A plan
    // with no published price reads as "coming soon" rather than borrowing a
    // number the catalog does not carry.
    const copyOf = (planId: string) => {
      const copy = isChinese ? PLAN_COPY[planId].zh : PLAN_COPY[planId].en;
      const price = formatPlanPrice(catalog.get(planId), isChinese ? "zh" : "en");
      return {
        ...copy,
        price: price?.amount ?? (isChinese ? "即将上线" : "Coming soon"),
        period: price?.period || undefined,
      };
    };

    const cards: PricingCard[] = [
      {
        key: "xconnect-free",
        name: isChinese ? "Free" : "Free",
        price: isChinese ? "¥0" : "$0",
        description: isChinese
          ? "登录即可使用：每月 5 GB 高速流量，用完自动降级为标准 VPS 流量，不断线。"
          : "Sign in to use it: 5 GB of accelerated traffic per month, then a seamless fallback to standard VPS traffic.",
        features: isChinese
          ? [
              "每月 5 GB 高速流量，用完降级 VPS",
              "Demo 资源卡片：每天 1 次、每次 1 小时",
              "不承诺 SLA，不提供多端会话持久化",
            ]
          : [
              "5 GB of accelerated traffic per month, then VPS fallback",
              "Demo resource card: 1 run/day, 1 hour/run",
              "No SLA, no persisted multi-device sessions",
            ],
        button: isChinese ? "免费开始" : "Start for free",
        href: "/login",
      },
      {
        key: "xconnect-payg",
        productSlug: XCONNECT_PRODUCT_SLUG,
        name: isChinese ? "按量付费" : "Pay-As-You-Go",
        price: isChinese ? "¥1/GB" : "$0.15/GB",
        description: isChinese
          ? "预充值账户余额，高速流量按 ¥1/GB 计费，资源卡片明码实价。欠费立即停机，计算资源保留 7 天、对象存储保留 30 天后释放。"
          : "Top up your balance and pay $0.15/GB for accelerated traffic, with resource cards billed at list price. Suspended immediately on zero balance; compute is kept for 7 days and object storage for 30.",
        features: isChinese
          ? [
              "高速流量 ¥1/GB，按量扣费",
              "资源服务卡片明码实价",
              "欠费立即停机，7 天内可恢复",
            ]
          : [
              "Accelerated traffic at $0.15/GB",
              "Resource cards billed at list price",
              "Suspends immediately on zero balance, recoverable within 7 days",
            ],
        button: isChinese ? "登录后充值" : "Sign in to top up",
        href: "/panel/subscription",
      },
      {
        key: "xconnect-pro-monthly",
        productSlug: XCONNECT_PRODUCT_SLUG,
        ...copyOf("PRO-MONTHLY"),
        highlight: true,
        button: purchasable("PRO-MONTHLY")
          ? isChinese
            ? "使用 Stripe 订阅"
            : "Subscribe with Stripe"
          : isChinese
            ? "即将上线"
            : "Coming soon",
        billingPlan: {
          mode: "subscription",
          planId: "PRO-MONTHLY",
          stripePriceId: priceIdOf("PRO-MONTHLY"),
        },
      },
      {
        key: "xconnect-pro-yearly",
        productSlug: XCONNECT_PRODUCT_SLUG,
        ...copyOf("PRO-YEARLY"),
        button: purchasable("PRO-YEARLY")
          ? isChinese
            ? "使用 Stripe 订阅"
            : "Subscribe with Stripe"
          : isChinese
            ? "即将上线"
            : "Coming soon",
        billingPlan: {
          mode: "subscription",
          planId: "PRO-YEARLY",
          stripePriceId: priceIdOf("PRO-YEARLY"),
        },
      },
    ];

    return cards;
  }, [isChinese, catalog]);
}

export default function PricesPage() {
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const catalog = useBillingCatalog();
  const xconnectCards = useXconnectCards(isChinese, catalog);
  const selfHostCard: PricingCard = {
    key: "open-source",
    name: isChinese ? "开源自建" : "Open Source (Self-Host)",
    price: isChinese ? "免费" : "Free",
    period: isChinese ? "/永久" : "/forever",
    description: isChinese
      ? "开源代码，自行部署和运行；从第一天起拥有完整控制权。"
      : "Open source software you deploy and run yourself, with full control from day one.",
    features: isChinese
      ? ["开源代码", "私有化部署", "社区支持"]
      : ["Open source code", "Self-host deployment", "Community support"],
    button: isChinese ? "开始自建" : "Start self-hosting",
    href: "/download",
  };

  const managedPaygoCard: PricingCard = {
    key: "managed-paygo",
    name: isChinese ? "托管服务按量付费" : "Managed Services — Pay as You Go",
    price: isChinese ? "规格费用 + 20%" : "List price + 20%",
    description: isChinese
      ? "按实际使用的资源规格收费，并收取 20% 托管服务费；更多托管服务将持续加入。"
      : "Pay for the infrastructure you use at its published specification price, plus a 20% managed-service fee. More managed services are on the way.",
    features: isChinese
      ? [
          "按资源规格与实际用量计费",
          "统一收取 20% 托管服务费",
          "可随业务增长灵活扩展",
        ]
      : [
          "Billed by resource specification and usage",
          "A single 20% managed-service fee",
          "Scale services up as your workload grows",
        ],
    button: isChinese ? "登录后按量使用" : "Sign in to use on demand",
    href: "/panel/subscription",
    highlight: true,
  };

  const customCard: PricingCard = {
    key: "custom",
    name: isChinese ? "专属定制" : "Custom",
    price: isChinese ? "商务洽谈" : "Talk to us",
    description: isChinese
      ? "针对合规、SLA 或大规模使用需求，由团队提供专属方案。"
      : "For compliance, SLA, or high-scale requirements, work with our team on a tailored plan.",
    features: isChinese
      ? ["合同级 SLA", "专属交付与支持", "适配企业治理需求"]
      : [
          "Contractual SLA",
          "Dedicated delivery and support",
          "Enterprise governance options",
        ],
    button: isChinese ? "联系我们" : "Contact Sales",
    href: "/support",
  };

  const extraCards: PricingCard[] = [
    selfHostCard,
    managedPaygoCard,
    customCard,
  ];

  const handleCheckout = async (card: PricingCard) => {
    if (
      !card.billingPlan?.planId ||
      !card.billingPlan?.stripePriceId ||
      !card.productSlug
    ) {
      setStatusMessage(
        isChinese
          ? "该套餐尚未配置 Stripe 价格。"
          : "Stripe pricing is not configured for this plan.",
      );
      return;
    }

    try {
      setStatusMessage(null);
      await startStripeCheckout({
        planId: card.billingPlan.planId,
        stripePriceId: card.billingPlan.stripePriceId,
        mode: card.billingPlan.mode,
        productSlug: card.productSlug,
        sourcePath: "/prices",
      });
    } catch (error) {
      console.warn("Failed to start Stripe checkout", error);
      setStatusMessage(
        isChinese
          ? "暂时无法跳转到 Stripe 结算。"
          : "Unable to start Stripe checkout right now.",
      );
    }
  };

  const renderPricingCard = (card: PricingCard) => (
    <div
      key={card.key}
      className={`relative flex h-full flex-col rounded-2xl border p-6 ${
        card.highlight
          ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10"
          : "border-surface-border bg-surface"
      }`}
    >
      {card.highlight ? (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-eyebrow font-bold uppercase tracking-wider text-white">
          {isChinese ? "推荐" : "Recommended"}
        </div>
      ) : null}

      <div className="mb-6">
        <h3 className="text-base font-semibold text-text-muted mb-2">
          {card.name}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-heading">{card.price}</span>
          {card.period ? (
            <span className="text-xs text-text-muted">{card.period}</span>
          ) : null}
        </div>
        <p className="mt-3 min-h-[2.5em] text-xs text-text-subtle">
          {card.description}
        </p>
      </div>

      <div className="mb-6 flex-1 space-y-3">
        {card.features.map((feature) => (
          <div key={feature} className="flex items-start gap-2">
            <div
              className={`mt-0.5 rounded-full p-0.5 ${
                card.highlight
                  ? "bg-primary/20 text-primary"
                  : "bg-surface-muted text-text-muted"
              }`}
            >
              <Check size={12} />
            </div>
            <span className="text-xs leading-tight text-text-muted">
              {feature}
            </span>
          </div>
        ))}
      </div>

      {card.billingPlan ? (
        <button
          type="button"
          onClick={() => void handleCheckout(card)}
          disabled={!card.billingPlan.stripePriceId}
          className={`w-full rounded-lg py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            card.highlight
              ? "bg-primary text-white hover:bg-primary-hover"
              : "border border-surface-border bg-surface-muted text-text hover:bg-surface-hover"
          }`}
        >
          {card.button}
        </button>
      ) : (
        <Link
          href={card.href || "/"}
          className={`w-full rounded-lg py-2 text-center text-xs font-semibold transition-colors ${
            card.highlight
              ? "bg-primary text-white hover:bg-primary-hover"
              : "border border-surface-border bg-surface-muted text-text hover:bg-surface-hover"
          }`}
        >
          {card.button}
        </Link>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-text transition-colors duration-150 flex flex-col">
      <MarketingNav />

      <main className="flex-1 relative overflow-hidden pt-24 pb-20">
        <div
          className="absolute inset-0 bg-gradient-app-from opacity-20 pointer-events-none"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-heading sm:text-6xl">
              {isChinese ? "定价方案" : "Pricing"}
            </h1>
            <p className="text-lg text-text-muted">
              {isChinese
                ? "先免费开源自建；需要托管时，再按实际用量付费。托管资源按规格费用加收 20% 服务费，更多服务将陆续上线。"
                : "Start free with self-hosting. When you need managed services, pay only for what you use: published resource pricing plus a 20% service fee. More services are coming."}
            </p>
          </div>

          <Suspense fallback={null}>
            <CheckoutStatusBanner className="mx-auto mb-6 max-w-3xl" />
          </Suspense>
          {statusMessage ? (
            <p className="mx-auto mb-6 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {statusMessage}
            </p>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {extraCards.map(renderPricingCard)}
          </div>

          <section className="mt-16">
            <div className="mx-auto mb-8 max-w-3xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">
                {isChinese ? "XConnect 核心套餐" : "XConnect core plans"}
              </h2>
              <p className="mt-3 text-sm text-text-muted">
                {isChinese
                  ? "从免费体验开始；需要更高的连接与加速额度时，再按用量或套餐升级。"
                  : "Start with the free experience, then use pay as you go or a plan when you need more connection and acceleration capacity."}
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {xconnectCards.map(renderPricingCard)}
            </div>
          </section>

          <div className="mt-20 max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface px-4 py-2 text-xs font-medium text-text-muted">
              <Shield size={14} />
              {isChinese
                ? "所有支付由 Stripe 安全处理"
                : "Payments secured by Stripe"}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
