export type ReferralCash = {
  currency: string;
  earnedMinor: number;
  pendingMinor: number;
  eligibleMinor: number;
  settledMinor: number;
  reversedMinor: number;
};
export type ReferralOverview = {
  historyHasMore?: {
    referrals: boolean;
    settlements: boolean;
    extensions: boolean;
  };
  code: string;
  inviteUrl: string;
  stats: {
    successfulInvites: number;
    awardedDays: number;
    cashByCurrency: ReferralCash[];
  };
  referrals: Array<{
    createdAt: string;
    invitee: string;
    planType: string;
    paidMinor: number;
    currency: string;
    rewardMinor: number;
    status: string;
    eligibleAt: string;
  }>;
  settlements: Array<{
    id: string;
    amountMinor: number;
    currency: string;
    status: string;
    requestedAt: string;
    settledAt: string | null;
  }>;
  extensions: Array<{
    days: number;
    effectiveFrom: string;
    effectiveUntil: string;
    status: string;
    createdAt: string;
  }>;
};
const finiteAmount = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value);
const timestamp = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const currency = (value: unknown) =>
  typeof value === "string" && /^[A-Z]{3}$/.test(value);
export function isReferralOverview(value: unknown): value is ReferralOverview {
  const v = value as ReferralOverview;
  return (
    typeof v?.code === "string" &&
    typeof v?.inviteUrl === "string" &&
    finiteAmount(v?.stats?.successfulInvites) &&
    finiteAmount(v?.stats?.awardedDays) &&
    Array.isArray(v?.stats?.cashByCurrency) &&
    v.stats.cashByCurrency.every(
      (c) =>
        currency(c?.currency) &&
        [
          c.earnedMinor,
          c.pendingMinor,
          c.eligibleMinor,
          c.settledMinor,
          c.reversedMinor,
        ].every(finiteAmount),
    ) &&
    Array.isArray(v?.referrals) &&
    v.referrals.every(
      (r) =>
        timestamp(r?.createdAt) &&
        typeof r?.invitee === "string" &&
        typeof r?.status === "string" &&
        currency(r?.currency) &&
        finiteAmount(r?.rewardMinor),
    ) &&
    Array.isArray(v?.settlements) &&
    v.settlements.every(
      (s) =>
        timestamp(s?.requestedAt) &&
        typeof s?.id === "string" &&
        typeof s?.status === "string" &&
        currency(s?.currency) &&
        finiteAmount(s?.amountMinor),
    ) &&
    Array.isArray(v?.extensions) &&
    v.extensions.every(
      (e) =>
        finiteAmount(e?.days) &&
        timestamp(e?.createdAt) &&
        timestamp(e?.effectiveFrom) &&
        timestamp(e?.effectiveUntil) &&
        typeof e?.status === "string",
    )
  );
}
