import { describe, expect, it } from "vitest";

import { resolveMembershipTier } from "./MembershipTierMark";

describe("resolveMembershipTier", () => {
  it.each([
    [
      { planId: "FREE-5GB", displayName: "Free 5 GB", packageName: "free" },
      "free",
    ],
    [
      { planId: "PLUS-20GB", displayName: "Plus 20 GB", packageName: "plus" },
      "plus",
    ],
    [
      { planId: "PRO-MONTHLY", displayName: "Pro monthly", packageName: "pro" },
      "pro",
    ],
    [
      {
        planId: "TEAM-CUSTOM",
        displayName: "专属团队",
        packageName: "enterprise",
      },
      "team",
    ],
  ] as const)("maps %j to %s", (plan, tier) => {
    expect(resolveMembershipTier(plan)).toBe(tier);
  });

  it("does not assign a subscription tier to unrelated plans", () => {
    expect(
      resolveMembershipTier({
        planId: "PAYG-TOPUP-50",
        displayName: "余额充值 ¥50",
        packageName: "paygo",
      }),
    ).toBeNull();
  });
});
