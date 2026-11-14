"use client";

import React, { useMemo, useState, Suspense } from "react";
import BoundaryLink from "@/components/common/BoundaryLink";
import { Check, Shield } from "lucide-react";

import CheckoutStatusBanner from "@components/billing/CheckoutStatusBanner";
import { startStripeCheckout } from "@components/billing/stripe-client";
import Footer from "../../components/Footer";
import MarketingNav from "@/components/marketing/MarketingNav";
import { useLanguage } from "../../i18n/LanguageProvider";
import {
  catalogWithFamilyDefaults,
  formatPlanPrice,
  graceDays,
  isPurchasable,
  planCheckoutMode,
  planCtaHref,
  planCtaMode,
  planDescription,
  planFamily,
  planFeatureList,
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
  badge?: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  button: string;
  highlight?: boolean;
  href?: string;
  billingPlan?: CardBillingPlan;
};

function buildDynamicCards(
  isChinese: boolean,
  catalog: Map<string, CatalogPlan>,
): PricingCard[] {
  const locale = isChinese ? "zh" : "en";
  const plans = catalogWithFamilyDefaults(catalog);

  return plans.map((plan) => {
    const family = planFamily(plan) ?? "custom";
    const price = formatPlanPrice(plan, locale);
    const ctaMode = planCtaMode(plan);
    const checkoutMode = planCheckoutMode(plan);
    const purchasable = isPurchasable(plan);
    const highlight = Boolean(plan.features?.highlight) || family === "pro";
    const badge =
      typeof plan.features?.badge === "string" && plan.features.badge.trim()
        ? plan.features.badge.trim()
        : highlight
          ? isChinese
            ? "推荐"
            : "Recommended"
          : undefined;
    const customCtaLabel =
      typeof plan.features?.cta_label === "string" &&
      plan.features.cta_label.trim()
        ? plan.features.cta_label.trim()
        : undefined;

    if (ctaMode === "stripe_checkout") {
      return {
        key: plan.planId,
        productSlug: XCONNECT_PRODUCT_SLUG,
        name: plan.displayName || plan.planId,
        badge,
        price: price?.amount ?? (isChinese ? "即将上线" : "Coming soon"),
        period: price?.period || undefined,
        description: planDescription(plan, locale),
        features: planFeatureList(plan, locale),
        highlight,
        button: purchasable
          ? customCtaLabel ??
            (checkoutMode === "payment"
              ? isChinese
                ? "使用 Stripe 购买"
                : "Pay with Stripe"
              : isChinese
                ? "使用 Stripe 订阅"
                : "Subscribe with Stripe")
          : isChinese
            ? "即将上线"
            : "Coming soon",
        billingPlan: {
          mode: checkoutMode,
          planId: plan.planId,
          stripePriceId: plan.stripePriceId ?? "",
        },
      };
    }

    return {
      key: plan.planId,
      name: plan.displayName || plan.planId,
      badge,
      price: price?.amount ?? (isChinese ? "¥0" : "$0"),
      period: price?.period || undefined,
      description: planDescription(plan, locale),
      features: planFeatureList(plan, locale),
      highlight,
      button:
        customCtaLabel ??
        (family === "free"
          ? isChinese
            ? "免费开始"
            : "Start for free"
          : isChinese
            ? "预约 / 联系我们"
            : "Contact us"),
      href: planCtaHref(plan),
    };
  });
}

export default function PricesPage() {
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const catalog = useBillingCatalog();

  const cards = useMemo(
    () => buildDynamicCards(isChinese, catalog),
    [isChinese, catalog],
  );

  const effectiveGraceDays = useMemo(() => {
    const firstPaid = [...catalog.values()].find(
      (plan) => plan.active && planFamily(plan) && planFamily(plan) !== "free",
    );
    return graceDays(firstPaid);
  }, [catalog]);

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
      {card.badge ? (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-eyebrow font-bold uppercase tracking-wider text-white">
          {card.badge}
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
        <BoundaryLink
          href={card.href || "/"}
          className={`w-full rounded-lg py-2 text-center text-xs font-semibold transition-colors ${
            card.highlight
              ? "bg-primary text-white hover:bg-primary-hover"
              : "border border-surface-border bg-surface-muted text-text hover:bg-surface-hover"
          }`}
        >
          {card.button}
        </BoundaryLink>
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
                ? `统一提供 Free、Plus、Pro 与定制（Custom）四个系列方案，实时同步套餐目录。订阅欠费享有 ${effectiveGraceDays} 天宽限期。`
                : `Four plan families — Free, Plus, Pro, and Custom — synced live from the billing catalog with a ${effectiveGraceDays}-day payment grace period.`}
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

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            {cards.map(renderPricingCard)}
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
