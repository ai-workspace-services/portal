"use client";

type AccountUsageError = Error & {
  status?: number;
};

export type AccountUsageSummary = {
  accountUuid: string;
  totalBytes: number;
  sourceOfTruth?: string;
  uplinkBytes?: number;
  downlinkBytes?: number;
  currentBalance?: number;
  remainingIncludedQuota?: number;
  includedQuotaBytes?: number;
  usedBytes?: number;
  usagePercent?: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  syncDelaySeconds?: number;
  suspendState?: string;
  throttleState?: string;
  arrears?: boolean;
  billingProfile?: AccountBillingProfile;
};

export type AccountPolicy = {
  accountUuid: string;
  preferredStrategy: string;
  eligibleNodeGroups?: string[];
  authState?: string;
  degradeMode?: string;
};

export type AccountBillingProfile = {
  packageName?: string;
  includedQuotaBytes?: number;
  basePricePerByte?: number;
  regionMultiplier?: number;
  lineMultiplier?: number;
  pricingRuleVersion?: string;
};

export type AccountUsageBucket = {
  bucketStart: string;
  nodeId?: string;
  accountUuid: string;
  region?: string;
  lineCode?: string;
  uplinkBytes: number;
  downlinkBytes: number;
  totalBytes: number;
};

export type AccountUsageBucketsResponse = {
  accountUuid: string;
  sourceOfTruth?: string;
  buckets?: AccountUsageBucket[];
};

export type BillingLedgerEntry = {
  id: string;
  entryType: string;
  ratedBytes: number;
  amountDelta: number;
  balanceAfter: number;
  pricingRuleVersion?: string;
  bucketStart?: string;
  bucketEnd?: string;
  createdAt?: string;
};

export type AccountBillingSummary = {
  accountUuid: string;
  sourceOfTruth?: string;
  quotaState?: {
    currentBalance?: number;
    remainingIncludedQuota?: number;
    arrears?: boolean;
    throttleState?: string;
    suspendState?: string;
  };
  billingProfile?: AccountBillingProfile;
  ledger?: BillingLedgerEntry[];
};

function toError(payload: unknown, status: number): AccountUsageError {
  const message =
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
      ? payload.message
      : payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
        ? payload.error
        : `Request failed (${status})`;
  const error = new Error(message) as AccountUsageError;
  error.status = status;
  return error;
}

async function requestJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw toError(payload, response.status);
  }
  return payload as T;
}

export function fetchAccountUsageSummary(): Promise<AccountUsageSummary> {
  return requestJSON<AccountUsageSummary>("/api/account/usage/summary");
}

export function fetchAccountPolicy(): Promise<AccountPolicy> {
  return requestJSON<AccountPolicy>("/api/account/policy");
}

// Buckets are per-minute; the caller decides how far back to look (e.g.
// month-to-date) and reduces them into hour/day/month totals client-side —
// the API has no separate rollup endpoint for that.
export function fetchAccountUsageBuckets(
  start?: Date,
  end?: Date,
): Promise<AccountUsageBucketsResponse> {
  const params = new URLSearchParams();
  if (start) params.set("start", start.toISOString());
  if (end) params.set("end", end.toISOString());
  const query = params.toString();
  return requestJSON<AccountUsageBucketsResponse>(
    `/api/account/usage/buckets${query ? `?${query}` : ""}`,
  );
}

export function fetchAccountBillingSummary(): Promise<AccountBillingSummary> {
  return requestJSON<AccountBillingSummary>("/api/account/billing/summary");
}
