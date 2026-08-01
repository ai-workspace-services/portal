"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

import { openStripePortal } from "@components/billing/stripe-client";
import { formatBytes } from "@lib/format";
import Card from "../components/Card";
import {
  fetchAccountBillingSummary,
  fetchAccountPolicy,
  fetchAccountUsageSummary,
} from "../lib/fetchAccountUsage";

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

export default function SubscriptionPanel() {
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
          setError(
            (payload?.message as string) || "取消订阅失败，请稍后重试。",
          );
          return;
        }

        await mutate();
      } catch (err) {
        console.warn("Failed to cancel subscription", err);
        setError("取消订阅时发生错误。");
      } finally {
        setSubmitting(null);
      }
    },
    [mutate],
  );

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-heading)]">
            订阅与计费
          </h2>
          <p className="text-sm text-[var(--color-text-subtle)]">
            查看 Stripe 购买记录、当前订阅状态，并直接进入客户门户管理账单。
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            setPortalLoading(true);
            setError(null);
            try {
              await openStripePortal({ returnPath: "/panel/subscription" });
            } catch (err) {
              console.warn("Failed to open Stripe portal", err);
              setError("暂时无法打开 Stripe 客户门户。");
            } finally {
              setPortalLoading(false);
            }
          }}
          className="inline-flex items-center justify-center rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={portalLoading}
        >
          {portalLoading ? "跳转中…" : "管理 Stripe 账单"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {usageSummary ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
              Authoritative Usage
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-heading)]">
              {usageSummary.totalBytes.toLocaleString()} B
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
              统计由 accounts.svc.plus 汇总，非本地客户端计数。
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              数据源：{usageSummary.sourceOfTruth || "—"}
            </p>
          </div>
          <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
              Monthly Quota
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-heading)]">
              {typeof usageSummary.usagePercent === "number"
                ? `${Math.min(100, Math.max(0, usageSummary.usagePercent)).toFixed(1)}%`
                : "—"}
            </p>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--color-surface-muted)]"
              aria-label="Monthly quota usage"
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
              已用 {formatQuotaBytes(usageSummary.usedBytes)} /{" "}
              {formatQuotaBytes(usageSummary.includedQuotaBytes)}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              本期重置：{formatPeriodEnd(usageSummary.periodEnd)}
            </p>
          </div>
          <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
              Balance / Quota
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-heading)]">
              {typeof usageSummary.currentBalance === "number"
                ? usageSummary.currentBalance.toFixed(2)
                : "—"}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
              剩余配额{" "}
              {typeof usageSummary.remainingIncludedQuota === "number"
                ? `${usageSummary.remainingIncludedQuota.toLocaleString()} B`
                : "—"}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              套餐{" "}
              {usageSummary.billingProfile?.packageName ||
                billingSummary?.billingProfile?.packageName ||
                "default"}
              ， 规则{" "}
              {usageSummary.billingProfile?.pricingRuleVersion ||
                billingSummary?.billingProfile?.pricingRuleVersion ||
                "—"}
            </p>
          </div>
          <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
              Policy / Sync
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--color-heading)]">
              {accountPolicy?.preferredStrategy || "—"}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
              统计延迟约 {usageSummary.syncDelaySeconds ?? 0} 秒，策略组{" "}
              {accountPolicy?.eligibleNodeGroups?.join(", ") || "—"}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              状态 {usageSummary.arrears ? "欠费" : "正常"} /{" "}
              {usageSummary.throttleState || "—"} /{" "}
              {usageSummary.suspendState || "—"}
            </p>
          </div>
        </div>
      ) : null}

      {billingSummary?.ledger?.length ? (
        <div className="mt-4 rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-heading)]">
                Recent Billing Ledger
              </h3>
              <p className="text-xs text-[var(--color-text-subtle)]">
                展示 accounts.svc.plus 返回的最新按量计费分录。
              </p>
            </div>
            <p className="text-xs text-[var(--color-text-subtle)]">
              数据源：{billingSummary.sourceOfTruth || "—"}
            </p>
          </div>
          <div className="mt-3 space-y-2">
            {billingSummary.ledger.slice(0, 5).map((entry) => (
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
                    {entry.ratedBytes.toLocaleString()} B
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
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-[var(--color-text-subtle)]">
          加载订阅中…
        </p>
      ) : records.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-text-subtle)]">
          暂无订阅记录。
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                        付款方式：{record.paymentMethod}
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
                    <dt>Plan</dt>
                    <dd className="font-medium text-[var(--color-text)]">
                      {record.planId || "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>External ID</dt>
                    <dd className="break-all text-[var(--color-text)]">
                      {record.externalId}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Created</dt>
                    <dd className="text-[var(--color-text)]">
                      {formatDate(record.createdAt)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Updated</dt>
                    <dd className="text-[var(--color-text)]">
                      {formatDate(record.updatedAt)}
                    </dd>
                  </div>
                  {typeof record.meta?.startsAt === "string" ? (
                    <div className="flex items-center justify-between">
                      <dt>Starts</dt>
                      <dd className="text-[var(--color-text)]">
                        {formatDate(record.meta?.startsAt as string)}
                      </dd>
                    </div>
                  ) : null}
                  {typeof record.meta?.expiresAt === "string" ? (
                    <div className="flex items-center justify-between">
                      <dt>Expires</dt>
                      <dd className="text-[var(--color-text)]">
                        {formatDate(record.meta?.expiresAt as string)}
                      </dd>
                    </div>
                  ) : null}
                  {record.cancelledAt ? (
                    <div className="flex items-center justify-between">
                      <dt>Cancelled</dt>
                      <dd className="text-[var(--color-text)]">
                        {formatDate(record.cancelledAt)}
                      </dd>
                    </div>
                  ) : null}
                  {record.meta?.note ? (
                    <div className="flex items-center justify-between">
                      <dt>备注</dt>
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
                      submitting === record.externalId
                    }
                    className="inline-flex items-center justify-center rounded-md border border-[color:var(--color-surface-border)] px-4 py-2 text-sm font-medium text-[color:var(--color-danger-foreground)] transition-colors hover:border-[color:var(--color-danger-border)] hover:text-[color:var(--color-danger-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {!canCancel
                      ? "历史记录"
                      : record.status === "cancelled"
                        ? "已取消"
                        : submitting === record.externalId
                          ? "处理中…"
                          : "停止订阅"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
