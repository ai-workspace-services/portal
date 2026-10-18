"use client";

import { useMemo, useState } from "react";

import CheckoutStatusBanner from "@components/billing/CheckoutStatusBanner";
import { usePaymentMfaRequired } from "@components/billing/PaymentMfaNotice";
import { startStripeCheckout } from "@components/billing/stripe-client";
import Card from "../components/Card";
import { formatBytes } from "@lib/format";
import {
  billingPlans,
  formatPlanPrice,
  isPurchasable,
  useBillingCatalog,
  XCONNECT_PRODUCT_SLUG,
  type CatalogPlan,
} from "@modules/billing/catalog";
import { useLanguage } from "@i18n/LanguageProvider";
import MembershipTierMark from "../components/MembershipTierMark";

type Mode = "subscription" | "payg";
type Currency = "CNY" | "USD";
type FixedTopUp = { planId: string; currency: Currency; amountMinor: number };

const TOP_UPS: FixedTopUp[] = [
  { planId: "PAYG-TOPUP-50", currency: "CNY", amountMinor: 5000 },
  { planId: "PAYG-TOPUP-100", currency: "CNY", amountMinor: 10000 },
  { planId: "PAYG-TOPUP-200", currency: "CNY", amountMinor: 20000 },
  { planId: "PAYG-TOPUP-USD-20", currency: "USD", amountMinor: 2000 },
  { planId: "PAYG-TOPUP-USD-50", currency: "USD", amountMinor: 5000 },
  { planId: "PAYG-TOPUP-USD-100", currency: "USD", amountMinor: 10000 },
];

type PurchaseOption = {
  planId: string;
  currency: Currency;
  amountMinor: number;
  plan?: CatalogPlan;
  custom?: boolean;
};

const CUSTOM_TOPUP_LIMITS: Record<
  Currency,
  { min: number; max: number; planId: string }
> = {
  CNY: { min: 10, max: 200, planId: "PAYG-CUSTOM-CNY" },
  USD: { min: 5, max: 100, planId: "PAYG-CUSTOM-USD" },
};

function matchesTopUpPlan(option: FixedTopUp, plan?: CatalogPlan): boolean {
  return Boolean(
    plan?.active &&
    plan.kind === "paygo_topup" &&
    plan.priceAmount === option.amountMinor &&
    plan.priceCurrency?.toUpperCase() === option.currency &&
    plan.priceUnit?.toLowerCase() === "once",
  );
}

function priceLabel(currency: Currency, amountMinor: number): string {
  const amount = amountMinor / 100;
  return `${currency === "CNY" ? "¥" : "$"}${amount}`;
}

export default function BillingOptionsPanel({
  currentPlanId,
}: {
  currentPlanId?: string;
}) {
  const requiresMfa = usePaymentMfaRequired();
  const { language } = useLanguage();
  const zh = language === "zh";
  const catalog = useBillingCatalog();
  const [mode, setMode] = useState<Mode>("subscription");
  const [currency, setCurrency] = useState<Currency>("CNY");
  const [selectedTopUp, setSelectedTopUp] = useState("PAYG-TOPUP-50");
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const subscriptionOptions = useMemo(
    () =>
      billingPlans(catalog)
        .filter(
          ({ plan }) =>
            plan.kind === "subscription" &&
            ["PLUS", "PRO-MONTHLY-V2", "PRO-YEARLY-V2"].includes(plan.planId),
        )
        .map(({ plan }) => plan),
    [catalog],
  );

  const topUpOptions = useMemo<PurchaseOption[]>(
    () =>
      TOP_UPS.filter((option) => option.currency === currency).map(
        (option) => ({
          ...option,
          plan: catalog.get(option.planId),
        }),
      ),
    [catalog, currency],
  );

  const selectedOption =
    customAmount.trim() !== ""
      ? {
          planId: CUSTOM_TOPUP_LIMITS[currency].planId,
          currency,
          amountMinor: Number(customAmount) * 100,
          custom: true,
        }
      : (topUpOptions.find((option) => option.planId === selectedTopUp) ??
        topUpOptions[0]);

  const customAmountValid =
    Number.isInteger(Number(customAmount)) &&
    Number(customAmount) >= CUSTOM_TOPUP_LIMITS[currency].min &&
    Number(customAmount) <= CUSTOM_TOPUP_LIMITS[currency].max;

  const handleCheckout = async (option: PurchaseOption, checkoutMode: Mode) => {
    if (
      checkoutMode === "payg" &&
      option.custom &&
      (!customAmountValid ||
        !Number.isSafeInteger(option.amountMinor) ||
        option.amountMinor <= 0)
    ) {
      setMessage(
        zh
          ? `请输入 ${currency === "CNY" ? "¥" : "$"}${CUSTOM_TOPUP_LIMITS[currency].min}–${CUSTOM_TOPUP_LIMITS[currency].max} 的整数金额。`
          : `Enter a whole amount from ${currency === "CNY" ? "¥" : "$"}${CUSTOM_TOPUP_LIMITS[currency].min} to ${CUSTOM_TOPUP_LIMITS[currency].max}.`,
      );
      return;
    }
    if (
      checkoutMode === "payg" &&
      !option.custom &&
      !matchesTopUpPlan(option, option.plan)
    ) {
      setMessage(
        zh
          ? "该固定档位尚未配置可用的 Stripe 价格。"
          : "This fixed tier is not configured for checkout yet.",
      );
      return;
    }
    if (!option.custom && !isPurchasable(option.plan)) {
      setMessage(
        zh
          ? "该固定档位尚未配置可用的 Stripe 价格。"
          : "This fixed tier is not configured for checkout yet.",
      );
      return;
    }
    if (requiresMfa) {
      setMessage(
        zh ? "请先绑定 MFA，再发起支付。" : "Bind MFA before starting payment.",
      );
      return;
    }
    setSubmitting(option.planId);
    setMessage(null);
    try {
      await startStripeCheckout({
        planId: option.planId,
        stripePriceId: option.plan?.stripePriceId ?? "",
        ...(option.custom
          ? { amountMinor: option.amountMinor, currency: option.currency }
          : {}),
        mode: checkoutMode === "payg" ? "payment" : "subscription",
        productSlug: XCONNECT_PRODUCT_SLUG,
        sourcePath: "/panel/subscription",
      });
    } catch (error) {
      console.warn("Failed to start Stripe checkout", error);
      setMessage(
        zh
          ? "暂时无法打开在线结算，请稍后重试。"
          : "Could not open checkout. Please try again.",
      );
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Card className="space-y-5" data-testid="fixed-currency-billing-options">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-heading)]">
          {zh ? "升级你的使用方式" : "Choose how you use XConnect"}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
          {zh
            ? "按业务需要，在月度订阅与按量充值之间选择。"
            : "Choose a monthly plan or a one-time balance top-up."}
        </p>
      </div>

      <div className="grid grid-cols-2 rounded-lg border border-[color:var(--color-surface-border)] p-1">
        {(
          [
            ["subscription", zh ? "订阅套餐" : "Subscription plans"],
            ["payg", zh ? "按量付费" : "Pay as you go"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => {
              setMode(value);
              setMessage(null);
            }}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${mode === value ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-subtle)] hover:bg-[var(--color-surface)]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <CheckoutStatusBanner />
      {message ? (
        <p
          role="status"
          className="text-sm text-[color:var(--color-danger-foreground)]"
        >
          {message}
        </p>
      ) : null}

      {mode === "subscription" ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-[var(--color-surface)] p-4">
            <p className="flex items-center gap-2 font-semibold text-[var(--color-heading)]">
              <MembershipTierMark
                plan={{
                  planId: "PLUS-20GB",
                  displayName: "Plus",
                  packageName: "plus",
                }}
              />
              Plus · 20 GB/{zh ? "月" : "month"}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
              {zh
                ? "适合日常 AI 对话与轻度使用。"
                : "For everyday AI conversations and lighter use."}
            </p>
          </div>
          {subscriptionOptions.length ? (
            subscriptionOptions.map((plan) => {
              const price = formatPlanPrice(plan, zh ? "zh" : "en");
              const ready = isPurchasable(plan);
              const fastLane = plan.features?.fast_lane as
                | { mode?: string }
                | undefined;
              const unlimited = fastLane?.mode === "unlimited";
              return (
                <div
                  key={plan.planId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[color:var(--color-surface-border)] p-4"
                >
                  <div>
                    <p className="flex items-center gap-2 font-semibold text-[var(--color-heading)]">
                      <MembershipTierMark plan={plan} />
                      {plan.displayName || plan.planId}
                    </p>
                    <p className="text-sm text-[var(--color-text-subtle)]">
                      {price
                        ? `${price.amount}${price.period}`
                        : zh
                          ? "价格待配置"
                          : "Price not configured"}
                      {unlimited
                        ? ` · ${zh ? "不限流量" : "Unlimited traffic"}`
                        : typeof plan.includedQuotaBytes === "number" &&
                            plan.includedQuotaBytes > 0
                          ? ` · ${formatBytes(plan.includedQuotaBytes)}`
                          : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={
                      !ready ||
                      requiresMfa ||
                      submitting === plan.planId ||
                      plan.planId === currentPlanId
                    }
                    onClick={() =>
                      handleCheckout(
                        {
                          planId: plan.planId,
                          currency:
                            plan.priceCurrency?.toUpperCase() === "USD"
                              ? "USD"
                              : "CNY",
                          amountMinor: plan.priceAmount ?? 0,
                          plan,
                        },
                        "subscription",
                      )
                    }
                    className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {plan.planId === currentPlanId
                      ? zh
                        ? "当前套餐"
                        : "Current plan"
                      : submitting === plan.planId
                        ? zh
                          ? "跳转中…"
                          : "Opening…"
                        : requiresMfa
                          ? zh
                            ? "绑定 MFA 后可支付"
                            : "Bind MFA to pay"
                          : ready
                            ? zh
                              ? "订阅 Plus"
                              : "Subscribe"
                            : zh
                              ? "即将上线"
                              : "Coming soon"}
                  </button>
                </div>
              );
            })
          ) : (
            <p className="rounded-lg border border-dashed border-[color:var(--color-surface-border)] p-4 text-sm text-[var(--color-text-subtle)]">
              {zh
                ? "Plus 价格尚未在套餐目录中上架。"
                : "Plus is not yet available in the billing catalog."}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-[color:var(--color-surface-border)] p-4">
          <div>
            <h3 className="font-semibold text-[var(--color-heading)]">
              {zh ? "自由充值，按需使用" : "Top up once, use as needed"}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
              {zh
                ? "无月费；可选快捷档或自定义金额，一次性充值，不自动续费。"
                : "No monthly fee. Choose a preset or custom one-time amount; no auto-renewal."}
            </p>
          </div>
          <div
            className="flex gap-2"
            role="group"
            aria-label={zh ? "充值币种" : "Top-up currency"}
          >
            {(["CNY", "USD"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={currency === value}
                onClick={() => {
                  setCurrency(value);
                  setSelectedTopUp(
                    value === "CNY" ? "PAYG-TOPUP-50" : "PAYG-TOPUP-USD-20",
                  );
                  setCustomAmount("");
                  setMessage(null);
                }}
                className={`rounded-md border px-4 py-2 text-sm font-medium ${currency === value ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]" : "border-[color:var(--color-surface-border)] text-[var(--color-text-subtle)]"}`}
              >
                {value === "CNY" ? "人民币 CNY" : "美元 USD"}
              </button>
            ))}
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-[var(--color-heading)]">
              {zh ? "选择充值金额" : "Choose a top-up amount"}
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {topUpOptions.map((option) => {
                const matches = matchesTopUpPlan(option, option.plan);
                const label = priceLabel(currency, option.amountMinor);
                return (
                  <button
                    key={option.planId}
                    type="button"
                    aria-pressed={selectedOption?.planId === option.planId}
                    onClick={() => {
                      setSelectedTopUp(option.planId);
                      setCustomAmount("");
                      setMessage(null);
                    }}
                    className={`rounded-md border px-3 py-3 text-sm font-semibold ${selectedOption?.planId === option.planId ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]" : "border-[color:var(--color-surface-border)] text-[var(--color-heading)]"}`}
                  >
                    {label}
                    {!matches ? (
                      <span className="mt-1 block text-xs font-normal text-[var(--color-text-subtle)]">
                        {zh ? "待开通" : "Unavailable"}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label className="block text-sm font-medium text-[var(--color-heading)]">
            {zh ? "自定义金额" : "Custom amount"}
            <span className="mt-1 block text-xs font-normal text-[var(--color-text-subtle)]">
              {zh
                ? `最低 ${currency === "CNY" ? "¥10" : "$5"}，最高 ${currency === "CNY" ? "¥200" : "$100"}；仅支持整数。`
                : `Minimum ${currency === "CNY" ? "¥10" : "$5"}, maximum ${currency === "CNY" ? "¥200" : "$100"}; whole amounts only.`}
            </span>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-[color:var(--color-surface-border)] px-3">
              <span aria-hidden="true">{currency === "CNY" ? "¥" : "$"}</span>
              <input
                type="number"
                min={CUSTOM_TOPUP_LIMITS[currency].min}
                max={CUSTOM_TOPUP_LIMITS[currency].max}
                step={1}
                inputMode="numeric"
                value={customAmount}
                onChange={(event) => {
                  setCustomAmount(event.target.value);
                  setMessage(null);
                }}
                placeholder={zh ? "输入自定义充值金额" : "Enter an amount"}
                aria-label={zh ? "自定义充值金额" : "Custom top-up amount"}
                className="w-full bg-transparent py-2 outline-none"
              />
            </div>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[var(--color-surface)] p-3">
            <p className="text-sm text-[var(--color-text-subtle)]">
              {zh
                ? `本次支付 ${selectedOption ? priceLabel(currency, selectedOption.amountMinor) : "—"} · 一次性充值 · 不自动续费`
                : `Pay ${selectedOption ? priceLabel(currency, selectedOption.amountMinor) : "—"} once · no auto-renewal`}
            </p>
            <button
              type="button"
              disabled={
                !selectedOption ||
                (selectedOption.custom
                  ? !customAmountValid
                  : !isPurchasable(selectedOption.plan) ||
                    !matchesTopUpPlan(selectedOption, selectedOption.plan)) ||
                requiresMfa ||
                submitting === selectedOption?.planId
              }
              onClick={() =>
                selectedOption && handleCheckout(selectedOption, "payg")
              }
              className="rounded-md bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? zh
                  ? "跳转中…"
                  : "Opening…"
                : requiresMfa
                  ? zh
                    ? "绑定 MFA 后可支付"
                    : "Bind MFA to pay"
                  : zh
                    ? `充值 ${selectedOption ? priceLabel(currency, selectedOption.amountMinor) : ""}`
                    : `Top up ${selectedOption ? priceLabel(currency, selectedOption.amountMinor) : ""}`}
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-subtle)]">
            {currency === "USD"
              ? zh
                ? "按量充值与有效订阅互斥；美元余额独立记账、不自动兑换，当前流量费率以人民币配置。"
                : "PAYG top-ups are mutually exclusive with an active subscription. USD is held separately with no auto-conversion; current traffic rates are configured in CNY."
              : zh
                ? "按量充值与有效订阅互斥；按量模式从余额扣费。"
                : "CNY top-ups are recorded in the ledger and charged at the configured CNY rate."}
          </p>
        </div>
      )}
    </Card>
  );
}
