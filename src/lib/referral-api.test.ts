import { describe, expect, it } from "vitest";
import { isReferralOverview } from "./referral-api";

const overview = {
  code: "AB12CD34",
  inviteUrl: "https://xworktech.com/referral?code=AB12CD34",
  stats: { successfulInvites: 1, awardedDays: 0, cashByCurrency: [] },
  referrals: [
    {
      createdAt: "2026-10-20T00:00:00Z",
      invitee: "a***@example.com",
      planType: "month",
      paidMinor: 1000,
      currency: "USD",
      rewardMinor: 100,
      status: "pending",
      eligibleAt: "2026-10-27T00:00:00Z",
    },
  ],
  settlements: [
    {
      id: "s1",
      amountMinor: 100,
      currency: "USD",
      status: "pending_review",
      requestedAt: "2026-10-28T00:00:00Z",
      settledAt: null,
    },
  ],
  extensions: [],
};
describe("referral overview contract", () => {
  it("accepts real minor-unit rewards and a pending manual settlement", () => {
    expect(isReferralOverview(overview)).toBe(true);
  });
  it.each([
    { paidMinor: "1000" },
    { planType: "payg" },
    { eligibleAt: "invalid" },
  ])("rejects malformed reward fields %j", (fields) => {
    expect(
      isReferralOverview({
        ...overview,
        referrals: [{ ...overview.referrals[0], ...fields }],
      }),
    ).toBe(false);
  });
  it("rejects malformed settlement timestamps and history flags", () => {
    expect(
      isReferralOverview({
        ...overview,
        settlements: [{ ...overview.settlements[0], settledAt: "invalid" }],
      }),
    ).toBe(false);
    expect(
      isReferralOverview({
        ...overview,
        historyHasMore: {
          referrals: "true",
          settlements: false,
          extensions: false,
        },
      }),
    ).toBe(false);
  });
});
