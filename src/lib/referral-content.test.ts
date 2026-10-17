import { describe, expect, it } from "vitest";
import content from "@/data/content/referral.json";
import { validateReferralLocale } from "./referral-content";
describe("reviewed campaign content contract", () => {
  it("accepts both canonical generated locales", () => {
    expect(() => validateReferralLocale(content.zh, "zh")).not.toThrow();
    expect(() => validateReferralLocale(content.en, "en")).not.toThrow();
  });
  it("rejects mismatched monetary or entitlement rules", () => {
    const invalid = structuredClone(content.en);
    invalid.campaign.cashbackRatePercent = 20;
    expect(() => validateReferralLocale(invalid, "en")).toThrow(
      "invalid referral campaign contract",
    );
  });
  it("rejects incomplete interactive UI copy", () => {
    const invalid = structuredClone(content.en);
    invalid.calculator.fields.activeSubscription.label = "";
    expect(() => validateReferralLocale(invalid, "en")).toThrow(
      "missing calculator.fields.activeSubscription.label",
    );
  });
});
