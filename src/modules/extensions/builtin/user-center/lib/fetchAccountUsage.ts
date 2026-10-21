"use client";

type AccountUsageError = Error & {
  status?: number;
  code?: string;
};

export type UsageFreshnessState = "fresh" | "stale" | "no_data";

export type UsageBreakdown = {
  last1Hour: number;
  last24Hours: number;
  monthToDate: number;
};

export type AccountUsageSummary = {
  accountUuid: string;
  totalBytes: number;
  sourceOfTruth?: string;
  uplinkBytes?: number;
  downlinkBytes?: number;
  currentBalance?: number;
  currentBalanceUsd?: number;
  remainingIncludedQuota?: number;
  includedQuotaBytes?: number;
  currentPlan?: AccountPlanSummary | null;
  defaultPlan?: AccountPlanSummary | null;
  planAssignmentStatus?: "assigned" | "unassigned";
  usedBytes?: number;
  usagePercent?: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  lastBucketAt?: string | null;
  syncDelaySeconds?: number;
  freshnessState?: UsageFreshnessState;
  suspendState?: string;
  throttleState?: string;
  quotaExhausted?: boolean;
  networkAccessState?: "active" | "paused" | "blocked";
  networkAccessReason?:
    | "quota_exhausted"
    | "billing_suspended"
    | "operator_paused"
    | "";
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

export type AccountPlanSummary = {
  planId?: string;
  displayName: string;
  packageName: string;
  /** Effective limit for an assigned account, or the catalog limit for a reference plan. */
  maxTrafficBytes: number;
  /** Current catalog template limit, which can differ from a prior assignment snapshot. */
  catalogMaxTrafficBytes?: number;
  quotaCycle?: string;
  unlimited: boolean;
  assigned: boolean;
  source:
    | "account_entitlement"
    | "account_billing_profile"
    | "local_catalog_default";
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
  lastBucketAt?: string | null;
  syncDelaySeconds?: number;
  freshnessState?: UsageFreshnessState;
};

export type BillingLedgerEntry = {
  id: string;
  entryType: string;
  currency?: "CNY" | "USD" | string;
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
  currentPlan?: AccountPlanSummary | null;
  defaultPlan?: AccountPlanSummary | null;
  planAssignmentStatus?: "assigned" | "unassigned";
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
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    error.code = payload.error;
  }
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

export async function fetchAccountPolicy(): Promise<AccountPolicy | null> {
  try {
    return await requestJSON<AccountPolicy>("/api/account/policy");
  } catch (error) {
    const failure = error as AccountUsageError;
    // A candidate without policy generation has no snapshot yet. Cache the
    // explicit empty state instead of repeatedly retrying a known absence.
    // Authentication, unknown routes and infrastructure errors remain errors.
    if (failure.status === 404 && failure.code === "policy_not_found")
      return null;
    throw error;
  }
}

export function currentUtcMonthStartIso(
  now: Date | number = new Date(),
): string {
  const date = typeof now === "number" ? new Date(now) : now;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  ).toISOString();
}

export function summarizeUsageBuckets(
  buckets: { bucketStart: string; totalBytes: number }[] | undefined,
  now: Date | number = new Date(),
): UsageBreakdown {
  const nowDate = typeof now === "number" ? new Date(now) : now;
  const nowMs = nowDate.getTime();
  const oneHourAgo = nowMs - 60 * 60 * 1000;
  const oneDayAgo = nowMs - 24 * 60 * 60 * 1000;
  const monthStart = new Date(currentUtcMonthStartIso(nowDate)).getTime();
  let last1Hour = 0;
  let last24Hours = 0;
  let monthToDate = 0;
  for (const bucket of buckets ?? []) {
    const bucketTime = new Date(bucket.bucketStart).getTime();
    if (Number.isNaN(bucketTime)) continue;
    const bytes =
      typeof bucket.totalBytes === "number" && Number.isFinite(bucket.totalBytes)
        ? bucket.totalBytes
        : 0;
    if (bucketTime >= monthStart && bucketTime <= nowMs) {
      monthToDate += bytes;
    }
    if (bucketTime >= oneDayAgo && bucketTime <= nowMs) {
      last24Hours += bytes;
    }
    if (bucketTime >= oneHourAgo && bucketTime <= nowMs) {
      last1Hour += bytes;
    }
  }
  return { last1Hour, last24Hours, monthToDate };
}

// Buckets are per-minute; the caller decides how far back to look (e.g.
// month-to-date) and reduces them into hour/day/month totals client-side —
// the API has no separate rollup endpoint for that.
export function fetchAccountUsageBuckets(
  start?: Date | string,
  end?: Date | string,
): Promise<AccountUsageBucketsResponse> {
  const params = new URLSearchParams();
  if (start) {
    params.set(
      "start",
      typeof start === "string" ? start : start.toISOString(),
    );
  }
  if (end) {
    params.set("end", typeof end === "string" ? end : end.toISOString());
  }
  const query = params.toString();
  return requestJSON<AccountUsageBucketsResponse>(
    `/api/account/usage/buckets${query ? `?${query}` : ""}`,
  );
}

export function fetchAccountBillingSummary(): Promise<AccountBillingSummary> {
  return requestJSON<AccountBillingSummary>("/api/account/billing/summary");
}
