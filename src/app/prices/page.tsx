"use client";

import React, { useState, Suspense } from "react";
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

export default function PricesPage() {
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const billingCards: PricingCard[] = PRODUCT_LIST.flatMap((product) => {
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
        highlight: product.slug === "xconnect",
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
      name: isChinese ? "定制版本" : "Custom Version",
      price: isChinese ? "定制" : "Custom",
      description: isChinese
        ? "企业客户可联系销售获取定制交付。"
        : "Contact sales for enterprise deployment and support.",
      features: isChinese
        ? ["企业支持", "专属交付", "定制 SLA"]
        : ["Enterprise support", "Tailored delivery", "Custom SLA"],
      button: isChinese ? "联系我们" : "Contact Sales",
      href: "/support",
    },
  ];

  const cards = [...billingCards, ...extraCards];

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
              {isChinese ? "Stripe 统一定价" : "Stripe Unified Pricing"}
            </h1>
            <p className="text-lg text-text-muted">
              {isChinese
                ? "所有在线购买统一通过 Stripe 完成，历史敏感支付方式入口已移除。"
                : "All online purchases now run through Stripe. Sensitive payment options have been removed."}
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
                    className={`w-full rounded-lg py-2 text-xs font-semibold transition-colors ${
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
