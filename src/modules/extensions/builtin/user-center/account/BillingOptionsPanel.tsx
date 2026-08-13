"use client";

import { useMemo, useState } from "react";

import CheckoutStatusBanner from "@components/billing/CheckoutStatusBanner";
import { usePaymentMfaRequired } from "@components/billing/PaymentMfaNotice";
import { startStripeCheckout } from "@components/billing/stripe-client";
import Card from "../components/Card";
import {
  formatPlanPrice,
  isPurchasable,
  sellablePlans,
  useBillingCatalog,
  XCONNECT_PRODUCT_SLUG,
  type FormattedPrice,
  type PlanCopy,
} from "@modules/billing/catalog";
import { useLanguage } from "@i18n/LanguageProvider";

type ProductOption = {
  planId: string;
  copy: PlanCopy;
  price: FormattedPrice | null;
  mode: "payment" | "subscription";
  stripePriceId: string;
  purchasable: boolean;
};

const kindLabel: Record<"payment" | "subscription", string> = {
  payment: "PAY-AS-YOU-GO",
  subscription: "SAAS",
};

export default function BillingOptionsPanel() {
  const requiresMfa = usePaymentMfaRequired();
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const catalog = useBillingCatalog();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Sourced from the live catalog rather than a hardcoded product list, so
  // this panel and /prices quote the same planId, price and availability.
  const productOptions = useMemo<ProductOption[]>(
    () =>
      sellablePlans(catalog).map(({ planId, copy, plan }) => ({
        planId,
        copy: isChinese ? copy.zh : copy.en,
        price: formatPlanPrice(plan, isChinese ? "zh" : "en"),
        mode: copy.mode,
        stripePriceId: plan?.stripePriceId ?? "",
        purchasable: isPurchasable(plan),
      })),
    [catalog, isChinese],
  );

  const handleCheckout = async (option: ProductOption) => {
    if (requiresMfa) {
      setStatusMessage(
        isChinese
          ? "请先绑定 MFA，才能发起安全支付。"
          : "Bind MFA before starting a payment.",
      );
      return;
    }
    if (!option.purchasable) {
      setStatusMessage(
        isChinese
          ? "该套餐尚未上架，请稍后再试。"
          : "This plan is not on sale yet.",
      );
      return;
    }

    setSubmitting(option.planId);
    setStatusMessage(null);
    try {
      await startStripeCheckout({
        planId: option.planId,
        stripePriceId: option.stripePriceId,
        mode: option.mode,
        productSlug: XCONNECT_PRODUCT_SLUG,
        sourcePath: "/panel/subscription",
      });
    } catch (error) {
      console.warn("Failed to start Stripe checkout", error);
      setStatusMessage(
        isChinese
          ? "无法跳转到 Stripe 结算，请稍后重试。"
          : "Could not open Stripe checkout. Please try again.",
      );
    } finally {
      setSubmitting(null);
    }
  };

  if (!productOptions.length) {
    return null;
  }

  return (
    <Card>
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-heading)]">
            Stripe 结算
          </h2>
          <p className="text-sm text-[var(--color-text-subtle)]">
            所有套餐统一通过 Stripe
            购买。支付完成后，订阅状态会自动同步到账户中心。
          </p>
        </div>
        <CheckoutStatusBanner />
        {statusMessage ? (
          <p className="text-sm text-[color:var(--color-danger-foreground)]">
            {statusMessage}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {productOptions.map((option) => (
          <div
            key={option.planId}
            className="rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                XConnect · {kindLabel[option.mode]}
              </p>
              <h3 className="text-lg font-semibold text-[var(--color-heading)]">
                {option.copy.name}
              </h3>
              <p className="text-sm text-[var(--color-text-subtle)]">
                {option.copy.description}
              </p>
              <p className="text-lg font-semibold text-[var(--color-heading)]">
                {option.price
                  ? `${option.price.amount}${option.price.period}`
                  : isChinese
                    ? "价格待定"
                    : "Price TBD"}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => handleCheckout(option)}
                disabled={
                  requiresMfa ||
                  !option.purchasable ||
                  submitting === option.planId
                }
                className="inline-flex w-full items-center justify-center rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting === option.planId
                  ? "跳转中…"
                  : requiresMfa
                    ? "绑定 MFA 后可支付"
                    : !option.purchasable
                      ? isChinese
                        ? "即将上线"
                        : "Coming soon"
                      : option.mode === "subscription"
                        ? "使用 Stripe 订阅"
                        : "使用 Stripe 充值"}
              </button>
              {!option.purchasable ? (
                <p className="text-xs text-[var(--color-text-subtle)]">
                  该套餐尚未在套餐目录中上架。
                </p>
              ) : (
                <p className="text-xs text-[var(--color-text-subtle)]">
                  需要登录后购买，支付结果会自动回写到订阅记录。
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
