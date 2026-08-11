"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { Check, Shield } from "lucide-react";

import CheckoutStatusBanner from "@components/billing/CheckoutStatusBanner";
import { startStripeCheckout } from "@components/billing/stripe-client";
import Footer from "../../components/Footer";
import MarketingNav from "@/components/marketing/MarketingNav";
import { useLanguage } from "../../i18n/LanguageProvider";
import { PRODUCT_LIST, type BillingPlan } from "@modules/products/registry";

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
  billingPlan?: BillingPlan;
};

// Mirrors accounts' billingPlanPayload (api/billing_plans.go). Only the
// fields this page actually reads.
type CatalogPlan = {
  planId: string;
  stripePriceId?: string;
  active: boolean;
};

// XConnect is the marketing name for the same product this catalog prices —
// billing_plans is the live source of truth (seeded via the admin API,
// checked out through the same Stripe wiring xscopehub/xcloudflow already
// use). The static price/feature copy below is display text; the only
// values read live are stripePriceId and active, so the buttons never
// offer to check out a plan that isn't actually purchasable yet.
const XCONNECT_PRODUCT_SLUG = "xconnect";

function useBillingCatalog(): Map<string, CatalogPlan> {
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
        // Catalog stays empty; cards below fall back to "coming soon".
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return catalog;
}

function useXconnectCards(
  isChinese: boolean,
  catalog: Map<string, CatalogPlan>,
): PricingCard[] {
  return useMemo(() => {
    const purchasable = (planId: string) => {
      const plan = catalog.get(planId);
      return Boolean(plan?.active && plan.stripePriceId);
    };
    const priceIdOf = (planId: string) => catalog.get(planId)?.stripePriceId ?? "";

    const cards: PricingCard[] = [
      {
        key: "xconnect-free",
        name: isChinese ? "Free 体验版" : "Free",
        price: isChinese ? "¥0" : "$0",
        description: isChinese
          ? "登录即可体验：高速流量每周 1 小时，用完自动降级为标准 VPS 流量，不断线。"
          : "Sign in and try it: 1 hour of accelerated traffic per week, then a seamless fallback to standard VPS traffic.",
        features: isChinese
          ? [
              "每周 1 小时高速流量，用完降级 VPS",
              "Demo 资源卡片：每天 1 次、每次 1 小时",
              "不承诺 SLA，不提供多端会话持久化",
            ]
          : [
              "1 hour of accelerated traffic per week, then VPS fallback",
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
        price: isChinese ? "¥1/GB" : "¥1/GB",
        description: isChinese
          ? "预充值账户余额，高速流量按 ¥1/GB 计费，资源卡片明码实价。欠费立即停机，计算资源保留 7 天、对象存储保留 30 天后释放。"
          : "Top up your balance and pay ¥1/GB for accelerated traffic, with resource cards billed at list price. Suspended immediately on zero balance; compute is kept for 7 days and object storage for 30.",
        features: isChinese
          ? [
              "高速流量 ¥1/GB，按量扣费",
              "资源服务卡片明码实价",
              "欠费立即停机，7 天内可恢复",
            ]
          : [
              "Accelerated traffic at ¥1/GB",
              "Resource cards billed at list price",
              "Suspends immediately on zero balance, recoverable within 7 days",
            ],
        button: isChinese ? "登录后充值" : "Sign in to top up",
        href: "/panel/subscription",
      },
      {
        key: "xconnect-pro-monthly",
        productSlug: XCONNECT_PRODUCT_SLUG,
        name: isChinese ? "Pro 订阅（月付）" : "Pro (Monthly)",
        price: isChinese ? "¥20" : "¥20",
        period: isChinese ? "/月" : "/month",
        description: isChinese
          ? "每月赠送 20GB 高速流量，超出部分按 ¥1/GB 自动计费。"
          : "20GB of accelerated traffic every month; overage auto-bills at ¥1/GB.",
        features: isChinese
          ? [
              "每月 20GB 高速流量",
              "超出部分 ¥1/GB 自动计费",
              "资源卡片明码实价 + 20% 托管费",
              "14 天欠费宽限期",
            ]
          : [
              "20GB accelerated traffic per month",
              "Overage auto-billed at ¥1/GB",
              "Resource cards at list price + 20% managed fee",
              "14-day grace period on payment failure",
            ],
        highlight: true,
        button: purchasable("PRO-MONTHLY")
          ? isChinese
            ? "使用 Stripe 订阅"
            : "Subscribe with Stripe"
          : isChinese
            ? "即将上线"
            : "Coming soon",
        billingPlan: {
          name: "Pro Monthly",
          price: 20,
          currency: "CNY",
          mode: "subscription",
          planId: "PRO-MONTHLY",
          stripePriceId: priceIdOf("PRO-MONTHLY"),
        },
      },
      {
        key: "xconnect-pro-yearly",
        productSlug: XCONNECT_PRODUCT_SLUG,
        name: isChinese ? "Pro 订阅（年付）" : "Pro (Yearly)",
        price: isChinese ? "¥200" : "¥200",
        period: isChinese ? "/年" : "/year",
        description: isChinese
          ? "每个自然月赠送 20GB 高速流量（全年共 240GB），比月付省 ¥40。"
          : "20GB of accelerated traffic every calendar month (240GB/year) — ¥40 cheaper than paying monthly.",
        features: isChinese
          ? [
              "每自然月 20GB 高速流量，全年 240GB",
              "超出部分 ¥1/GB 自动计费",
              "资源卡片明码实价 + 20% 托管费",
              "比月付省 ¥40/年",
            ]
          : [
              "20GB accelerated traffic per calendar month, 240GB/year",
              "Overage auto-billed at ¥1/GB",
              "Resource cards at list price + 20% managed fee",
              "¥40/year cheaper than monthly",
            ],
        button: purchasable("PRO-YEARLY")
          ? isChinese
            ? "使用 Stripe 订阅"
            : "Subscribe with Stripe"
          : isChinese
            ? "即将上线"
            : "Coming soon",
        billingPlan: {
          name: "Pro Yearly",
          price: 200,
          currency: "CNY",
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
  const billingCards: PricingCard[] = PRODUCT_LIST.filter(
    (product) => product.slug !== XCONNECT_PRODUCT_SLUG,
  ).flatMap((product) => {
    const cards: PricingCard[] = [];
    if (product.billing?.saas) {
      cards.push({
        key: `${product.slug}-subscription`,
        productSlug: product.slug,
        name: `${product.name} ${isChinese ? "订阅版" : "Subscription"}`,
        price: `$${product.billing.saas.price.toFixed(2)}`,
        period: product.billing.saas.interval
          ? `/${product.billing.saas.interval}`
          : undefined,
        description: product.billing.saas.description || "",
        features: [
          isChinese ? "Stripe 自动续费" : "Recurring billing with Stripe",
          isChinese
            ? "购买后自动同步到账户"
            : "Syncs back to your account automatically",
          isChinese
            ? "支持客户门户管理账单"
            : "Manage billing in Stripe customer portal",
        ],
        button: isChinese ? "使用 Stripe 订阅" : "Subscribe with Stripe",
        billingPlan: product.billing.saas,
      });
    }
    if (product.billing?.paygo) {
      cards.push({
        key: `${product.slug}-paygo`,
        productSlug: product.slug,
        name: `${product.name} ${isChinese ? "按量版" : "Pay as you go"}`,
        price: `$${product.billing.paygo.price.toFixed(2)}`,
        description: product.billing.paygo.description || "",
        features: [
          isChinese ? "一次性 Stripe 结算" : "One-time Stripe checkout",
          isChinese ? "适合弹性使用场景" : "Fits bursty or flexible usage",
          isChinese
            ? "订单自动写入账户中心"
            : "Orders sync into your account center",
        ],
        button: isChinese ? "使用 Stripe 购买" : "Buy with Stripe",
        billingPlan: product.billing.paygo,
      });
    }
    return cards;
  });

  const extraCards: PricingCard[] = [
    {
      key: "open-source",
      name: isChinese ? "开源版 (Self-Host)" : "Open Source (Self-Host)",
      price: isChinese ? "免费" : "Free",
      period: isChinese ? "/永久" : "/forever",
      description: isChinese
        ? "适合自托管团队，完全自主掌控。"
        : "Best for self-hosted teams with full control.",
      features: isChinese
        ? ["开源代码", "私有化部署", "社区支持"]
        : ["Open source code", "Self-host deployment", "Community support"],
      button: isChinese ? "下载" : "Download",
      href: "/download",
    },
    {
      key: "custom",
      name: isChinese ? "专属定制" : "Custom",
      price: isChinese ? "商务洽谈" : "Talk to us",
      description: isChinese
        ? "按合同约定配额与 SLA，不走自助支付，由商务与运营团队开通。"
        : "Contract-defined quota and SLA, provisioned by our team rather than self-serve checkout.",
      features: isChinese
        ? ["按合同约定配额", "合同级 SLA", "专属交付与商务支持"]
        : [
            "Contract-defined quota",
            "Contractual SLA",
            "Dedicated delivery and account support",
          ],
      button: isChinese ? "联系我们" : "Contact Sales",
      href: "/support",
    },
  ];

  const cards = [...xconnectCards, ...billingCards, ...extraCards];

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
                ? "从免费体验到按量付费、订阅与专属定制，随用量增长按需升级。所有在线购买统一通过 Stripe 完成。"
                : "From a free tier to pay-as-you-go, subscriptions, and custom contracts — upgrade as your usage grows. All online purchases run through Stripe."}
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

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.key}
                className={`relative flex h-full flex-col rounded-2xl border p-6 ${
                  card.highlight
                    ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10"
                    : "border-surface-border bg-surface"
                }`}
              >
                {card.highlight ? (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    {isChinese ? "推荐" : "Recommended"}
                  </div>
                ) : null}

                <div className="mb-6">
                  <h3 className="text-base font-semibold text-text-muted mb-2">
                    {card.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-heading">
                      {card.price}
                    </span>
                    {card.period ? (
                      <span className="text-xs text-text-muted">
                        {card.period}
                      </span>
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
                    // A plan with no Stripe price id is not purchasable yet
                    // (the catalog row exists but hasn't been wired to a
                    // Stripe Price). Disable rather than let the click fail.
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
            ))}
          </div>

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
