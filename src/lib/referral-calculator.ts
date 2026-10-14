/** Estimates only. This never creates a financial or entitlement record. */
export function calculateReferralEstimate(
  invitees: number,
  amountMinor: number,
  annual: boolean,
  activeSubscription: boolean,
) {
  const count = Number.isFinite(invitees)
    ? Math.max(0, Math.min(100000, Math.floor(invitees)))
    : 0;
  const amount = Number.isFinite(amountMinor)
    ? Math.max(0, Math.min(100000000000, Math.floor(amountMinor)))
    : 0;
  // Each invoice is rounded before summing, matching the Accounts reward contract.
  return {
    cashbackMinor: count * Math.floor(amount / 10),
    extensionDays: annual && activeSubscription ? count * 30 : 0,
  };
}
export function formatReferralMoney(
  amountMinor: number,
  currency: string,
  language: string,
) {
  return new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency,
  }).format(
    amountMinor /
      10 **
        (new Intl.NumberFormat("en", {
          style: "currency",
          currency,
        }).resolvedOptions().maximumFractionDigits ?? 2),
  );
}
