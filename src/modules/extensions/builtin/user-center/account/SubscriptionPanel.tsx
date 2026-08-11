"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

import { openStripePortal } from "@components/billing/stripe-client";
import PaymentMfaNotice, {
  usePaymentMfaRequired,
} from "@components/billing/PaymentMfaNotice";
import { formatBytes } from "@lib/format";
import Card from "../components/Card";
import {
  fetchAccountBillingSummary,
  fetchAccountPolicy,
  fetchAccountUsageBuckets,
  fetchAccountUsageSummary,
} from "../lib/fetchAccountUsage";
import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";

const fetcher = (url: string) =>
  fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  }).then((res) => res.json());

type SubscriptionRecord = {
  id: string;
  provider: string;
  kind?: string;
  planId?: string;
  status: string;
  paymentMethod?: string;
  externalId: string;
  createdAt?: string;
  updatedAt?: string;
  cancelledAt?: string;
  meta?: Record<string, unknown>;
};

type SubscriptionResponse = {
  subscriptions?: SubscriptionRecord[];
  error?: string;
  message?: string;
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatQuotaBytes(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? formatBytes(value)
    : "—";
}

function formatPeriodEnd(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

// 分钟级桶只用来在客户端聚合成小时/天/月三档, accounts 没有单独的 rollup
// 接口。一次月初到现在的查询就够覆盖三档, 没必要分别请求三次。
function summarizeUsageBuckets(
  buckets: { bucketStart: string; totalBytes: number }[] | undefined,
) {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;
  let last1Hour = 0;
  let last24Hours = 0;
  let monthToDate = 0;
  for (const bucket of buckets ?? []) {
    const ts = new Date(bucket.bucketStart).getTime();
    if (Number.isNaN(ts)) continue;
    monthToDate += bucket.totalBytes;
    if (ts >= dayAgo) last24Hours += bucket.totalBytes;
    if (ts >= hourAgo) last1Hour += bucket.totalBytes;
  }
  return { last1Hour, last24Hours, monthToDate };
}

type SubscriptionPanelProps = {
  showPaymentMfaNotice?: boolean;
};

export default function SubscriptionPanel({
  showPaymentMfaNotice = true,
}: SubscriptionPanelProps) {
  const { language } = useLanguage();
  const requiresMfa = usePaymentMfaRequired();
  const copy = translations[language].userCenter.account.subscription;
  const { data, isLoading, mutate } = useSWR<SubscriptionResponse>(
    "/api/auth/subscriptions",
    fetcher,
  );
  const { data: usageSummary } = useSWR(
    "account-usage-summary",
    fetchAccountUsageSummary,
  );
  const { data: billingSummary } = useSWR(
    "account-billing-summary",
    fetchAccountBillingSummary,
  );
  const { data: accountPolicy } = useSWR("account-policy", fetchAccountPolicy);
  const monthStart = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const { data: usageBuckets } = useSWR(
    ["account-usage-buckets", monthStart.toISOString()],
    () => fetchAccountUsageBuckets(monthStart),
  );
  const usageBreakdown = useMemo(
    () => summarizeUsageBuckets(usageBuckets?.buckets),
    [usageBuckets?.buckets],
  );
  const [activeTab, setActiveTab] = useState<"overview" | "detail">("overview");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const records = useMemo(
    () => data?.subscriptions ?? [],
    [data?.subscriptions],
  );

  const handleCancel = useCallback(
    async (externalId: string) => {
      if (!externalId) return;
      if (requiresMfa) {
        setError("请先绑定 MFA，才能变更订阅。");
        return;
      }
      setSubmitting(externalId);
      setError(null);
      try {
        const response = await fetch("/api/auth/subscriptions/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ externalId }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          setError((payload?.message as string) || copy.cancelError);
          return;
        }

        await mutate();
      } catch (err) {
        console.warn("Failed to cancel subscription", err);
        setError(copy.cancelRequestError);
      } finally {
        setSubmitting(null);
      }
    },
    [copy.cancelError, copy.cancelRequestError, mutate, requiresMfa],
  );

  return (
    <Card data-testid="subscription-panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-heading)]">
            {copy.title}
          </h2>
          <p className="text-sm text-[var(--color-text-subtle)]">
            {copy.description}
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (requiresMfa) {
              setError("请先绑定 MFA，才能管理账单。");
              return;
            }
            setPortalLoading(true);
            setError(null);
            try {
              await openStripePortal({ returnPath: "/panel/subscription" });
            } catch (err) {
              console.warn("Failed to open Stripe portal", err);
              setError(copy.portalError);
            } finally {
              setPortalLoading(false);
            }
          }}
          className="inline-flex items-center justify-center rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={requiresMfa || portalLoading}
        >
          {portalLoading
            ? copy.openingBilling
            : requiresMfa
              ? "绑定 MFA 后可管理账单"
              : copy.manageBilling}
        </button>
      </div>

      {showPaymentMfaNotice ? <PaymentMfaNotice /> : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-1 text-xs shadow-sm">
        {(
          [
            { key: "overview", label: copy.overviewTab },
            { key: "detail", label: copy.detailTab },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-[var(--color-primary)] text-white shadow"
                : "text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)]"
            }`}
            onClick={() => setActiveTab(tab.key)}
            aria-pressed={activeTab === tab.key}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {usageSummary && activeTab === "overview" ? (
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]"
              aria-hidden="true"
            />
            <h3 className="text-sm font-semibold text-[var(--color-heading)]">
              当前用量与配额
            </h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
                {copy.usage}
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-heading)]">
                {formatBytes(usageSummary.totalBytes)}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
                {copy.usageDescription}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                {copy.source}：{usageSummary.sourceOfTruth || "—"}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[color:var(--color-surface-border)] pt-3 text-center">
                <div>
                  <dt className="text-[10px] uppercase text-[var(--color-text-subtle)]">
                    {copy.last1Hour}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-[var(--color-heading)]">
                    {formatBytes(usageBreakdown.last1Hour)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-[var(--color-text-subtle)]">
                    {copy.last24Hours}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-[var(--color-heading)]">
                    {formatBytes(usageBreakdown.last24Hours)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-[var(--color-text-subtle)]">
                    {copy.monthToDate}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-[var(--color-heading)]">
                    {formatBytes(usageBreakdown.monthToDate)}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
                {copy.monthlyQuota}
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-heading)]">
                {typeof usageSummary.usagePercent === "number"
                  ? `${Math.min(100, Math.max(0, usageSummary.usagePercent)).toFixed(1)}%`
                  : "—"}
              </p>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--color-surface-muted)]"
                aria-label={copy.monthlyQuota}
              >
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                  style={{
                    width: `${
                      typeof usageSummary.usagePercent === "number"
                        ? Math.min(100, Math.max(0, usageSummary.usagePercent))
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="mt-2 text-sm text-[var(--color-text-subtle)]">
                {copy.used} {formatQuotaBytes(usageSummary.usedBytes)} /{" "}
                {formatQuotaBytes(usageSummary.includedQuotaBytes)}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                {copy.periodReset}：{formatPeriodEnd(usageSummary.periodEnd)}
              </p>
            </div>
            <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
                {copy.balanceQuota}
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-heading)]">
                {typeof usageSummary.currentBalance === "number"
                  ? usageSummary.currentBalance.toFixed(2)
                  : "—"}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
                {copy.remainingQuota}{" "}
                {typeof usageSummary.remainingIncludedQuota === "number"
                  ? formatBytes(usageSummary.remainingIncludedQuota)
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                {copy.package}{" "}
                {usageSummary.billingProfile?.packageName ||
                  billingSummary?.billingProfile?.packageName ||
                  "default"}
                ， {copy.rules}{" "}
                {usageSummary.billingProfile?.pricingRuleVersion ||
                  billingSummary?.billingProfile?.pricingRuleVersion ||
                  "—"}
              </p>
            </div>
            <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
                {copy.policySync}
              </p>
              <p className="mt-2 text-base font-semibold text-[var(--color-heading)]">
                {accountPolicy?.preferredStrategy || "—"}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
                {copy.syncDelay} {usageSummary.syncDelaySeconds ?? 0} s，
                {copy.eligibleGroups}{" "}
                {accountPolicy?.eligibleNodeGroups?.join(", ") || "—"}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                {copy.status}{" "}
                {usageSummary.arrears ? copy.arrears : copy.normal} /{" "}
                {usageSummary.throttleState || "—"} /{" "}
                {usageSummary.suspendState || "—"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "detail" ? (
        <div className="mt-4 rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-[var(--color-heading)]">
                  {copy.recentLedger}
                </h3>
              </div>
              <p className="text-xs text-[var(--color-text-subtle)]">
                {copy.recentLedgerDescription}
              </p>
            </div>
            <p className="text-xs text-[var(--color-text-subtle)]">
              {copy.source}：{billingSummary?.sourceOfTruth || "—"}
            </p>
          </div>
          {billingSummary?.ledger?.length ? (
            <div className="mt-3 space-y-2">
              {billingSummary.ledger.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-[var(--color-text)]">
                      {entry.entryType}
                    </p>
                    <p className="text-xs text-[var(--color-text-subtle)]">
                      {entry.pricingRuleVersion || "—"} ·{" "}
                      {entry.bucketStart ? formatDate(entry.bucketStart) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-[var(--color-text)]">
                      {formatBytes(entry.ratedBytes)}
                    </p>
                    <p className="text-xs text-[var(--color-text-subtle)]">
                      {typeof entry.amountDelta === "number"
                        ? entry.amountDelta.toFixed(2)
                        : "—"}{" "}
                      / 余额{" "}
                      {typeof entry.balanceAfter === "number"
                        ? entry.balanceAfter.toFixed(2)
                        : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-text-subtle)]">
              {copy.empty}
            </p>
          )}
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-[var(--color-text-subtle)]">
          {copy.loading}
        </p>
      ) : records.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-4">
          <h3 className="text-sm font-semibold text-[var(--color-heading)]">
            {copy.subscriptionRecords}
          </h3>
          <p className="mt-2 text-sm text-[var(--color-text-subtle)]">
            {copy.empty}
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]"
              aria-hidden="true"
            />
            <h3 className="text-sm font-semibold text-[var(--color-heading)]">
              订阅记录
            </h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {records.map((record) => {
              const canCancel =
                record.provider === "stripe" &&
                (record.kind ?? "subscription") === "subscription";

              return (
                <div
                  key={record.id}
                  className="rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
                        {record.provider}
                      </p>
                      <h3 className="text-base font-semibold text-[var(--color-text)]">
                        {record.kind ?? "subscription"}
                      </h3>
                      {record.paymentMethod ? (
                        <p className="text-xs text-[var(--color-text-subtle)]">
                          {copy.paymentMethod}：{record.paymentMethod}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${record.status === "cancelled" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
                    >
                      {record.status}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-1 text-sm text-[var(--color-text-subtle)]">
                    <div className="flex items-center justify-between">
                      <dt>{copy.plan}</dt>
                      <dd className="font-medium text-[var(--color-text)]">
                        {record.planId || "—"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>{copy.externalId}</dt>
                      <dd className="break-all text-[var(--color-text)]">
                        {record.externalId}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>{copy.created}</dt>
                      <dd className="text-[var(--color-text)]">
                        {formatDate(record.createdAt)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>{copy.updated}</dt>
                      <dd className="text-[var(--color-text)]">
                        {formatDate(record.updatedAt)}
                      </dd>
                    </div>
                    {typeof record.meta?.startsAt === "string" ? (
                      <div className="flex items-center justify-between">
                        <dt>{copy.starts}</dt>
                        <dd className="text-[var(--color-text)]">
                          {formatDate(record.meta?.startsAt as string)}
                        </dd>
                      </div>
                    ) : null}
                    {typeof record.meta?.expiresAt === "string" ? (
                      <div className="flex items-center justify-between">
                        <dt>{copy.expires}</dt>
                        <dd className="text-[var(--color-text)]">
                          {formatDate(record.meta?.expiresAt as string)}
                        </dd>
                      </div>
                    ) : null}
                    {record.cancelledAt ? (
                      <div className="flex items-center justify-between">
                        <dt>{copy.cancelled}</dt>
                        <dd className="text-[var(--color-text)]">
                          {formatDate(record.cancelledAt)}
                        </dd>
                      </div>
                    ) : null}
                    {record.meta?.note ? (
                      <div className="flex items-center justify-between">
                        <dt>{copy.note}</dt>
                        <dd className="text-[var(--color-text)]">
                          {String(record.meta?.note)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCancel(record.externalId)}
                      disabled={
                        !canCancel ||
                        record.status === "cancelled" ||
                        requiresMfa ||
                        submitting === record.externalId
                      }
                      className="inline-flex items-center justify-center rounded-md border border-[color:var(--color-surface-border)] px-4 py-2 text-sm font-medium text-[color:var(--color-danger-foreground)] transition-colors hover:border-[color:var(--color-danger-border)] hover:text-[color:var(--color-danger-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {!canCancel
                        ? copy.historical
                        : record.status === "cancelled"
                          ? copy.cancelledAction
                          : requiresMfa
                            ? "绑定 MFA 后可变更"
                          : submitting === record.externalId
                            ? copy.processing
                            : copy.stop}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
