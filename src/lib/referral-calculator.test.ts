import { describe, it, expect } from "vitest";
import {
  calculateReferralEstimate,
  formatReferralMoney,
} from "./referral-calculator";
import { normalizeReferralCode } from "./referral-code";
describe("referral estimates", () => {
  it("rounds cashback per invoice before totaling, not after", () => {
    expect(calculateReferralEstimate(3, 109, true, true)).toEqual({
      cashbackMinor: 30,
      extensionDays: 90,
    });
  });
  it("requires both annual purchase and existing active inviter subscription", () => {
    expect(calculateReferralEstimate(3, 36500, true, false)).toEqual({
      cashbackMinor: 10950,
      extensionDays: 0,
    });
    expect(calculateReferralEstimate(3, 36500, false, true).extensionDays).toBe(
      0,
    );
  });
  it("rejects negative and nonfinite estimates and bounds safe totals", () => {
    expect(calculateReferralEstimate(-1, -10, true, true)).toEqual({
      cashbackMinor: 0,
      extensionDays: 0,
    });
    expect(calculateReferralEstimate(NaN, Infinity, true, true)).toEqual({
      cashbackMinor: 0,
      extensionDays: 0,
    });
    expect(
      Number.isSafeInteger(
        calculateReferralEstimate(1e20, 1e20, true, true).cashbackMinor,
      ),
    ).toBe(true);
  });
  it("formats two-, zero- and three-decimal currencies", () => {
    expect(formatReferralMoney(10950, "USD", "en")).toBe("$109.50");
    expect(formatReferralMoney(100, "JPY", "en")).toBe("¥100");
    expect(formatReferralMoney(1234, "KWD", "en")).toContain("1.234");
  });
  it("validates opaque attribution codes without accepting arbitrary URL content", () => {
    expect(normalizeReferralCode(" ab12cd34 ")).toBe("AB12CD34");
    expect(normalizeReferralCode("bad?code=123")).toBe(null);
    expect(normalizeReferralCode({ code: "AB12CD34" })).toBe(null);
  });
});
