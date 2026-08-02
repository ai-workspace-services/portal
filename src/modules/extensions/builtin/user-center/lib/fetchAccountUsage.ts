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

export function fetchAccountBillingSummary(): Promise<AccountBillingSummary> {
  return requestJSON<AccountBillingSummary>("/api/account/billing/summary");
}
