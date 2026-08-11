"use client";

import { useMemo, useState } from "react";

import CheckoutStatusBanner from "@components/billing/CheckoutStatusBanner";
import { usePaymentMfaRequired } from "@components/billing/PaymentMfaNotice";
import { startStripeCheckout } from "@components/billing/stripe-client";
import Card from "../components/Card";
import type { BillingPlan, ProductConfig } from "@modules/products/registry";
import { PRODUCT_LIST } from "@modules/products/registry";

type ProductOption = {
  product: ProductConfig;
  plan: BillingPlan;
  kind: "paygo" | "subscription";
};

const kindLabel: Record<"paygo" | "subscription", string> = {
  paygo: "PAY-AS-YOU-GO",
  subscription: "SAAS",
};

export default function BillingOptionsPanel() {
  const requiresMfa = usePaymentMfaRequired();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const productOptions = useMemo(() => {
    const options: ProductOption[] = [];
    PRODUCT_LIST.forEach((product) => {
      if (product.billing?.paygo) {
        options.push({ product, plan: product.billing.paygo, kind: "paygo" });
      }
      if (product.billing?.saas) {
        options.push({
          product,
          plan: product.billing.saas,
          kind: "subscription",
        });
      }
    });
    return options;
  }, []);

  const handleCheckout = async (option: ProductOption) => {
    if (requiresMfa) {
      setStatusMessage("请先绑定 MFA，才能发起安全支付。");
      return;
    }
    if (!option.plan.planId || !option.plan.stripePriceId) {
      setStatusMessage("该套餐尚未配置 Stripe price_id。");
      return;
    }

    setSubmitting(option.plan.planId);
    setStatusMessage(null);
    try {
      await startStripeCheckout({
        planId: option.plan.planId,
        stripePriceId: option.plan.stripePriceId,
        mode: option.plan.mode,
        productSlug: option.product.slug,
        sourcePath: "/panel/subscription",
      });
    } catch (error) {
      console.warn("Failed to start Stripe checkout", error);
      setStatusMessage("无法跳转到 Stripe 结算，请稍后重试。");
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
            key={`${option.product.slug}-${option.kind}`}
            className="rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                {option.product.name} · {kindLabel[option.kind]}
              </p>
              <h3 className="text-lg font-semibold text-[var(--color-heading)]">
                {option.plan.name}
              </h3>
              <p className="text-sm text-[var(--color-text-subtle)]">
                {option.plan.description}
              </p>
              <p className="text-lg font-semibold text-[var(--color-heading)]">
                {option.plan.currency} {option.plan.price.toFixed(2)}
                {option.plan.interval ? ` / ${option.plan.interval}` : ""}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => handleCheckout(option)}
                disabled={requiresMfa || submitting === option.plan.planId}
                className="inline-flex w-full items-center justify-center rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting === option.plan.planId
                  ? "跳转中…"
                  : requiresMfa
                    ? "绑定 MFA 后可支付"
                    : option.kind === "subscription"
                      ? "使用 Stripe 订阅"
                      : "使用 Stripe 购买"}
              </button>
              {!option.plan.stripePriceId ? (
                <p className="text-xs text-[var(--color-text-subtle)]">
                  该套餐需要先配置 Stripe price_id。
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
