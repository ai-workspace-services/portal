"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

import { openStripePortal } from "@components/billing/stripe-client";
import Card from "../components/Card";
import { fetchAccountBillingSummary, fetchAccountPolicy, fetchAccountUsageSummary } from "../lib/fetchAccountUsage";
import { useLanguage } from '@i18n/LanguageProvider';
import { translations } from '@i18n/translations';

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

export default function SubscriptionPanel() {
  const { language } = useLanguage();
  const copy = translations[language].userCenter.account.subscription;
  const { data, isLoading, mutate } = useSWR<SubscriptionResponse>(
    "/api/auth/subscriptions",
    fetcher,
  );
  const { data: usageSummary } = useSWR("account-usage-summary", fetchAccountUsageSummary);
  const { data: billingSummary } = useSWR("account-billing-summary", fetchAccountBillingSummary);
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
            (payload?.message as string) || copy.cancelError,
          );
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
    [copy.cancelError, copy.cancelRequestError, mutate],
  );

  return (
    <Card>
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
          disabled={portalLoading}
        >
          {portalLoading ? copy.openingBilling : copy.manageBilling}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {usageSummary ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
              {copy.usage}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-heading)]">
              {usageSummary.totalBytes.toLocaleString()} B
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
              {copy.usageDescription}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              {copy.source}：{usageSummary.sourceOfTruth || "—"}
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
              {copy.remainingQuota} {typeof usageSummary.remainingIncludedQuota === "number"
                ? `${usageSummary.remainingIncludedQuota.toLocaleString()} B`
                : "—"}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              {copy.package} {usageSummary.billingProfile?.packageName || billingSummary?.billingProfile?.packageName || "default"}，
              {copy.rules} {usageSummary.billingProfile?.pricingRuleVersion || billingSummary?.billingProfile?.pricingRuleVersion || "—"}
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
              {copy.syncDelay} {usageSummary.syncDelaySeconds ?? 0} s，{copy.eligibleGroups}{" "}
              {accountPolicy?.eligibleNodeGroups?.join(", ") || "—"}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              {copy.status} {usageSummary.arrears ? copy.arrears : copy.normal} / {usageSummary.throttleState || "—"} / {usageSummary.suspendState || "—"}
            </p>
          </div>
        </div>
      ) : null}

      {billingSummary?.ledger?.length ? (
        <div className="mt-4 rounded-xl border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-heading)]">{copy.recentLedger}</h3>
              <p className="text-xs text-[var(--color-text-subtle)]">
                {copy.recentLedgerDescription}
              </p>
            </div>
            <p className="text-xs text-[var(--color-text-subtle)]">
              {copy.source}：{billingSummary.sourceOfTruth || "—"}
            </p>
          </div>
          <div className="mt-3 space-y-2">
            {billingSummary.ledger.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-[var(--color-text)]">{entry.entryType}</p>
                  <p className="text-xs text-[var(--color-text-subtle)]">
                    {entry.pricingRuleVersion || "—"} · {entry.bucketStart ? formatDate(entry.bucketStart) : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-[var(--color-text)]">{entry.ratedBytes.toLocaleString()} B</p>
                  <p className="text-xs text-[var(--color-text-subtle)]">
                    {typeof entry.amountDelta === "number" ? entry.amountDelta.toFixed(2) : "—"} / 余额{" "}
                    {typeof entry.balanceAfter === "number" ? entry.balanceAfter.toFixed(2) : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-[var(--color-text-subtle)]">
          {copy.loading}
        </p>
      ) : records.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-text-subtle)]">
          {copy.empty}
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
                      submitting === record.externalId
                    }
                    className="inline-flex items-center justify-center rounded-md border border-[color:var(--color-surface-border)] px-4 py-2 text-sm font-medium text-[color:var(--color-danger-foreground)] transition-colors hover:border-[color:var(--color-danger-border)] hover:text-[color:var(--color-danger-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {!canCancel
                      ? copy.historical
                      : record.status === "cancelled"
                        ? copy.cancelledAction
                        : submitting === record.externalId
                          ? copy.processing
                          : copy.stop}
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
