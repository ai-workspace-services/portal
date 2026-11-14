"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import * as Dialog from "@radix-ui/react-dialog";

import CheckoutStatusBanner from "@components/billing/CheckoutStatusBanner";
import {
  getSubscriptionPurchase,
  previewSubscription,
  retrySubscriptionPurchase,
  startStripeCheckout,
  type SubscriptionPreview,
  type StripeCheckoutPayload,
} from "@components/billing/stripe-client";
import BoundaryLink from "@components/common/BoundaryLink";
import Card from "../components/Card";
import {
  billingPlans,
  canUpgradeSubscription,
  formatPlanPrice,
  formatPlanQuota,
  graceDays,
  isPurchasable,
  planCheckoutMode,
  planCtaHref,
  planCtaMode,
  planDescription,
  planFamily,
  useBillingCatalog,
  XCONNECT_PRODUCT_SLUG,
  type CatalogPlan,
} from "@modules/billing/catalog";
import { useLanguage } from "@i18n/LanguageProvider";
import MembershipTierMark from "../components/MembershipTierMark";

export default function BillingOptionsPanel({
  currentPlanId,
}: {
  currentPlanId?: string;
}) {
  const { language } = useLanguage();
  const zh = language === "zh";
  const locale = zh ? "zh" : "en";
  const catalog = useBillingCatalog();
  const { mutate } = useSWRConfig();
  const lastPurchase = useRef<
    { pending: boolean; planId?: string } | undefined
  >(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [purchasePending, setPurchasePending] = useState<boolean | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | undefined>();
  const [canRetry, setCanRetry] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<string>();
  const [reviewPending, setReviewPending] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string>();
  const [confirmation, setConfirmation] = useState<{
    quote: SubscriptionPreview;
    payload: StripeCheckoutPayload;
    name: string;
  } | null>(null);
  const [settledPlanId, setSettledPlanId] = useState<string | undefined>();
  const selectedPlanId = settledPlanId ?? currentPlanId;

  const currentCatalogPlan = selectedPlanId
    ? catalog.get(selectedPlanId)
    : undefined;
  const currentFamily = planFamily(currentCatalogPlan);
  const hasPaidSubscription = Boolean(
    selectedPlanId &&
    currentFamily !== "free" &&
    (currentCatalogPlan?.kind ?? "subscription") === "subscription",
  );

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const status = await getSubscriptionPurchase();
        if (active) {
          const previous = lastPurchase.current;
          const settled =
            !status.pending &&
            status.planId &&
            (previous?.pending ||
              (!previous && status.planId !== currentPlanId) ||
              (previous && previous.planId !== status.planId));
          lastPurchase.current = {
            pending: status.pending,
            planId: status.planId,
          };
          if (settled) {
            void mutate((key) => {
              const name = Array.isArray(key) ? key[0] : key;
              return (
                typeof name === "string" &&
                [
                  "/api/auth/subscriptions",
                  "account-usage-summary",
                  "account-billing-summary",
                  "account-policy",
                  "user-center-agent-nodes",
                  "team-nodes",
                ].includes(name)
              );
            }).catch(() => undefined);
          }
          setPurchasePending(status.pending);
          setPendingUrl(status.pending ? status.url : undefined);
          setCanRetry(status.pending && status.retryable === true);
          setCooldownUntil(status.cooldownUntil);
          setReviewPending(status.refundReviewPending === true);
          setPendingPlanId(status.pendingPlanId);
          if (!status.pending) setSettledPlanId(status.planId || undefined);
        }
      } catch {
        if (active) setPurchasePending(null);
      }
    };
    void check();
    const timer = window.setInterval(() => {
      void check();
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [currentPlanId, mutate]);

  const catalogOptions = useMemo(
    () =>
      billingPlans(catalog)
        .filter(({ family }) => family !== "free")
        .map(({ plan }) => plan),
    [catalog],
  );

  const handleCheckout = async (plan: CatalogPlan) => {
    if (!isPurchasable(plan)) {
      setMessage(
        zh
          ? "该套餐尚未配置可用的 Stripe 价格。"
          : "This plan is not configured for Stripe checkout yet.",
      );
      return;
    }
    setSubmitting(plan.planId);
    setMessage(null);
    const checkoutMode = planCheckoutMode(plan);
    try {
      const payload: StripeCheckoutPayload = {
        planId: plan.planId,
        stripePriceId: plan.stripePriceId ?? "",
        mode: checkoutMode,
        productSlug: XCONNECT_PRODUCT_SLUG,
        sourcePath: "/panel/subscription",
      };
      if (checkoutMode === "subscription") {
        const quote = await previewSubscription(payload);
        setConfirmation({
          quote,
          payload,
          name: plan.displayName || plan.planId,
        });
      } else {
        await startStripeCheckout(payload);
      }
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
          {zh ? "选择或升级方案" : "Choose or upgrade your plan"}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
          {zh
            ? "实时同步套餐目录（Free / Plus / Pro / Custom），订阅欠费保留 3 天宽限期。"
            : "Synced live from the 4-family billing catalog (Free / Plus / Pro / Custom) with a 3-day payment grace period."}
        </p>
      </div>

      <CheckoutStatusBanner />
      {purchasePending !== false && (
        <p role="status" className="text-sm text-[var(--color-text-subtle)]">
          {purchasePending
            ? zh
              ? "支付或权益同步中，请勿重复购买。确认后将恢复操作。"
              : "Payment or entitlement synchronization is pending. Do not purchase again."
            : zh
              ? "正在核验支付状态，暂不可重复购买。"
              : "Checking payment status before another purchase."}
          {pendingUrl && (
            <a className="ml-2 underline" href={pendingUrl}>
              {zh ? "继续本次支付" : "Continue this payment"}
            </a>
          )}
          {canRetry && (
            <button
              type="button"
              disabled={Boolean(submitting)}
              className="ml-2 underline disabled:opacity-50"
              onClick={async () => {
                setSubmitting("retry");
                try {
                  await retrySubscriptionPurchase();
                  setMessage(
                    zh
                      ? "已重试原支付请求，正在核验结果。"
                      : "The original payment was retried; checking its result.",
                  );
                } catch {
                  setMessage(
                    zh
                      ? "暂未确认支付结果，请勿新建订单；可稍后重试原请求。"
                      : "The payment result is still unconfirmed. Retry this request, not a new order.",
                  );
                } finally {
                  setSubmitting(null);
                }
              }}
            >
              {zh ? "重试本次支付" : "Retry this payment"}
            </button>
          )}
        </p>
      )}
      <Dialog.Root
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open && !submitting) setConfirmation(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-xl bg-[var(--color-surface)] p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold">
              {zh ? "确认套餐与费用" : "Confirm plan and payment"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-[var(--color-text-subtle)]">
              {confirmation?.name} ·{" "}
              {confirmation?.quote.action === "upgrade"
                ? zh
                  ? "同周期升级，保留已用流量，不叠加额度。"
                  : "Same-period upgrade; usage is retained, allowances are not stacked."
                : zh
                  ? "全新订阅，自动续费。"
                  : "New subscription with automatic renewal."}
            </Dialog.Description>
            {confirmation && (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt>{zh ? "本次应付" : "Due now"}</dt>
                  <dd>
                    {new Intl.NumberFormat(zh ? "zh-CN" : "en-US", {
                      style: "currency",
                      currency: confirmation.quote.currency,
                    }).format(confirmation.quote.amountDue / 100)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>{zh ? "生效时间" : "Effective"}</dt>
                  <dd>{zh ? "付款确认后" : "After payment is confirmed"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{zh ? "下次续费金额" : "Next renewal"}</dt>
                  <dd>
                    {new Intl.NumberFormat(zh ? "zh-CN" : "en-US", {
                      style: "currency",
                      currency: confirmation.quote.currency,
                    }).format(confirmation.quote.renewalAmount / 100)}
                  </dd>
                </div>
                <div className="flex justify-between text-[var(--color-text-subtle)]">
                  <dt>{zh ? "下次续费日期" : "Next renewal date"}</dt>
                  <dd>
                    {confirmation.quote.renewalAt
                      ? new Date(
                          confirmation.quote.renewalAt * 1000,
                        ).toLocaleDateString(zh ? "zh-CN" : "en-US")
                      : zh
                        ? "付款确认后确定"
                        : "Established after payment"}
                  </dd>
                </div>
              </dl>
            )}
            <div className="flex justify-end gap-3">
              <Dialog.Close
                disabled={Boolean(submitting)}
                className="rounded-md border px-4 py-2 text-sm"
              >
                {zh ? "暂不支付" : "Not now"}
              </Dialog.Close>
              <button
                type="button"
                disabled={Boolean(submitting) || purchasePending !== false}
                className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-[var(--color-action)]"
                onClick={async () => {
                  if (!confirmation || submitting) return;
                  setSubmitting(confirmation.payload.planId);
                  try {
                    await startStripeCheckout({
                      ...confirmation.payload,
                      previewToken: confirmation.quote.previewToken,
                    });
                    setPurchasePending(true);
                    setConfirmation(null);
                  } catch {
                    setMessage(
                      zh
                        ? "支付结果需要重新核验，请刷新状态，勿重复购买。"
                        : "Recheck the payment result before trying again.",
                    );
                    setPurchasePending(null);
                    setConfirmation(null);
                  } finally {
                    setSubmitting(null);
                  }
                }}
              >
                {submitting
                  ? zh
                    ? "确认中…"
                    : "Confirming…"
                  : zh
                    ? "确认并支付"
                    : "Confirm and pay"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {message ? (
        <p
          role="status"
          className="text-sm text-[color:var(--color-danger-foreground)]"
        >
          {message}
        </p>
      ) : null}

      <div className="space-y-3">
        {catalogOptions.length ? (
          catalogOptions.map((plan) => {
            const price = formatPlanPrice(plan, locale);
            const quotaText = formatPlanQuota(plan, locale);
            const description = planDescription(plan, locale);
            const ready = isPurchasable(plan);
            const ctaMode = planCtaMode(plan);
            const checkoutMode = planCheckoutMode(plan);
            const isCurrent = plan.planId === selectedPlanId;
            const upgradeEligible =
              !hasPaidSubscription ||
              checkoutMode === "payment" ||
              canUpgradeSubscription(currentCatalogPlan, plan);
            const cooldownActive =
              hasPaidSubscription &&
              checkoutMode === "subscription" &&
              Boolean(cooldownUntil) &&
              Date.parse(cooldownUntil!) > Date.now();

            return (
              <div
                key={plan.planId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[color:var(--color-surface-border)] p-4"
              >
                <div className="max-w-xl">
                  <p className="flex items-center gap-2 font-semibold text-[var(--color-heading)]">
                    <MembershipTierMark plan={plan} />
                    {plan.displayName || plan.planId}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--color-text-subtle)]">
                    {price
                      ? `${price.amount}${price.period}`
                      : zh
                        ? "价格待配置"
                        : "Price not configured"}
                    {quotaText ? ` · ${quotaText}` : ""}
                    {checkoutMode === "subscription"
                      ? ` · ${graceDays(plan)} ${zh ? "天宽限期" : "day grace"}`
                      : ""}
                  </p>
                  {description ? (
                    <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                      {description}
                    </p>
                  ) : null}
                </div>

                {ctaMode === "contact_sales" ? (
                  <BoundaryLink
                    href={planCtaHref(plan)}
                    className="rounded-md border border-[color:var(--color-surface-border)] px-4 py-2 text-sm font-semibold text-[var(--color-heading)] hover:bg-[var(--color-surface)]"
                  >
                    {zh ? "联系 / 预约" : "Contact us"}
                  </BoundaryLink>
                ) : (
                  <button
                    type="button"
                    disabled={
                      !ready ||
                      Boolean(submitting) ||
                      purchasePending !== false ||
                      reviewPending ||
                      Boolean(pendingPlanId) ||
                      cooldownActive ||
                      !upgradeEligible ||
                      isCurrent
                    }
                    onClick={() => void handleCheckout(plan)}
                    className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[var(--color-action)]"
                  >
                    {isCurrent
                      ? zh
                        ? "当前套餐"
                        : "Current plan"
                      : purchasePending === true
                        ? zh
                          ? "同步中"
                          : "Synchronizing"
                        : pendingPlanId === "FREE"
                          ? zh
                            ? "已安排取消"
                            : "Cancellation scheduled"
                          : reviewPending
                            ? zh
                              ? "退款待审核"
                              : "Refund under review"
                            : cooldownActive && cooldownUntil
                              ? zh
                                ? `可于 ${new Date(cooldownUntil).toLocaleString()} 变更`
                                : `Available ${new Date(cooldownUntil).toLocaleString()}`
                              : submitting === plan.planId
                                ? zh
                                  ? "跳转中…"
                                  : "Opening…"
                                : hasPaidSubscription &&
                                    checkoutMode === "subscription" &&
                                    !upgradeEligible
                                  ? zh
                                    ? "暂不支持此变更"
                                    : "Change unavailable"
                                  : ready
                                    ? checkoutMode === "payment"
                                      ? zh
                                        ? "立即购买"
                                        : "Purchase"
                                      : zh
                                        ? hasPaidSubscription
                                          ? `升级到 ${plan.displayName || plan.planId}`
                                          : `订阅 ${plan.displayName || plan.planId}`
                                        : `${hasPaidSubscription ? "Upgrade to" : "Subscribe to"} ${plan.displayName || plan.planId}`
                                    : zh
                                      ? "即将上线"
                                      : "Coming soon"}
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <p className="rounded-lg border border-dashed border-[color:var(--color-surface-border)] p-4 text-sm text-[var(--color-text-subtle)]">
            {zh
              ? "套餐目录暂未配置可用方案，请在运营后台 /panel/ops/billing/plans 发布。"
              : "No plans are currently published in /panel/ops/billing/plans."}
          </p>
        )}
      </div>
    </Card>
  );
}
