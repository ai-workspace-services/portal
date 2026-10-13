import { describe, it, expect, beforeEach } from "vitest";
import { useReferralAttribution } from "./referral-attribution";
describe("registration referral attribution", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useReferralAttribution.setState({ referralCode: null });
  });
  it("preserves the first valid referral through navigation and later links", () => {
    window.history.replaceState(null, "", "/referral?code=AB12CD34");
    useReferralAttribution.getState().captureLocation();
    window.history.replaceState(null, "", "/register?ref=ZX98YX76");
    useReferralAttribution.getState().captureLocation();
    expect(useReferralAttribution.getState().referralCode).toBe("AB12CD34");
  });
  it("ignores invalid values and accepts a later valid code", () => {
    window.history.replaceState(null, "", "/referral?code=bad");
    useReferralAttribution.getState().captureLocation();
    expect(useReferralAttribution.getState().referralCode).toBe(null);
    window.history.replaceState(null, "", "/register?ref=AB12CD34");
    useReferralAttribution.getState().captureLocation();
    expect(useReferralAttribution.getState().referralCode).toBe("AB12CD34");
  });
});
