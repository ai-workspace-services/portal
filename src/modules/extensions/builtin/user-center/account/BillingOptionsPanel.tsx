"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";

import CheckoutStatusBanner from "@components/billing/CheckoutStatusBanner";
import { usePaymentMfaRequired } from "@components/billing/PaymentMfaNotice";
import { startStripeCheckout } from "@components/billing/stripe-client";
import Card from "../components/Card";
import { formatBytes } from "@lib/format";
import {
  formatPlanPrice,
  billingPlans,
  isPurchasable,
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
  maxTrafficBytes?: number;
};

const kindLabel: Record<"payment" | "subscription", string> = {
  payment: "PAY-AS-YOU-GO",
  subscription: "SAAS",
};

type BillingOptionsPanelProps = {
  currentPlanId?: string;
};

export default function BillingOptionsPanel({
  currentPlanId,
}: BillingOptionsPanelProps) {
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
      billingPlans(catalog).map(({ planId, copy, plan }) => ({
        planId,
        copy: isChinese ? copy.zh : copy.en,
        price: formatPlanPrice(plan, isChinese ? "zh" : "en"),
        mode: copy.mode,
        stripePriceId: plan?.stripePriceId ?? "",
        purchasable: isPurchasable(plan),
        maxTrafficBytes: plan?.maxTrafficBytes ?? plan?.includedQuotaBytes,
      })),
    [catalog, isChinese],
  );

  const handleCheckout = async (option: ProductOption) => {
    if (option.planId === currentPlanId) {
      return;
    }
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
          ? "无法打开在线结算，请稍后重试。"
          : "Could not open online checkout. Please try again.",
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
            {isChinese ? "套餐与在线结算" : "Plans and checkout"}
          </h2>
          <p className="text-sm text-[var(--color-text-subtle)]">
            {isChinese
              ? "套餐权益与账单状态由账户本地模型维护；当前在线支付由 Stripe 处理。"
              : "Entitlements and billing state stay in the local account model; Stripe currently handles online payment."}
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
            className={`rounded-xl border bg-[color:var(--color-surface)] p-4 shadow-sm ${
              option.planId === currentPlanId
                ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20"
                : "border-[color:var(--color-surface-border)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                  XConnect · {kindLabel[option.mode]}
                </p>
                <h3 className="text-lg font-semibold text-[var(--color-heading)]">
                  {option.copy.name}
                </h3>
              </div>
              {option.planId === currentPlanId ? (
                <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)]">
                  {isChinese ? "当前套餐" : "Current"}
                </span>
              ) : null}
            </div>
            <div className="mt-1 space-y-1">
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
              <p className="text-sm font-medium text-[var(--color-heading)]">
                {isChinese ? "最大流量" : "Max traffic"}：
                {typeof option.maxTrafficBytes === "number" &&
                option.maxTrafficBytes > 0
                  ? formatBytes(option.maxTrafficBytes)
                  : option.mode === "subscription"
                    ? isChinese
                      ? "无限制 / 由权益策略决定"
                      : "Unlimited / entitlement-defined"
                    : isChinese
                      ? "按量计费"
                      : "Metered"}
              </p>
            </div>

            {option.copy.features.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {option.copy.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-[var(--color-text-subtle)]"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]"
                      aria-hidden="true"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => handleCheckout(option)}
                disabled={
                  requiresMfa ||
                  !option.purchasable ||
                  option.planId === currentPlanId ||
                  submitting === option.planId
                }
                className="inline-flex w-full items-center justify-center rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {option.planId === currentPlanId
                  ? isChinese
                    ? "当前套餐"
                    : "Current plan"
                  : submitting === option.planId
                    ? "跳转中…"
                    : requiresMfa
                      ? "绑定 MFA 后可支付"
                      : !option.purchasable
                        ? isChinese
                          ? "即将上线"
                          : "Coming soon"
                        : option.mode === "subscription"
                          ? isChinese
                            ? "订阅此套餐"
                            : "Subscribe"
                          : isChinese
                            ? "在线充值"
                            : "Top up online"}
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
