import { describe, expect, it } from "vitest";
import content from "@/data/content/referral.json";
import type { ReferralContent } from "./referral-content";
import {
  campaignAcceptsRegistration,
  campaignDisplayContent,
  isReferralCampaign,
  type ReferralCampaign,
} from "./referral-campaign";
const campaign: ReferralCampaign = {
  revision: 1,
  enabled: true,
  active: true,
  startsAt: "2026-10-12T16:00:00Z",
  endsAt: "2026-12-31T16:00:00Z",
  cashbackBps: 1000,
  annualBonusDays: 30,
};
describe("public referral campaign", () => {
  it("honors enabled state, start inclusivity and end exclusivity", () => {
    expect(
      campaignAcceptsRegistration(campaign, Date.parse(campaign.startsAt!) - 1),
    ).toBe(false);
    expect(
      campaignAcceptsRegistration(campaign, Date.parse(campaign.startsAt!)),
    ).toBe(true);
    expect(
      campaignAcceptsRegistration(campaign, Date.parse(campaign.endsAt!)),
    ).toBe(false);
    expect(campaignAcceptsRegistration({ ...campaign, enabled: false })).toBe(
      false,
    );
    expect(campaignAcceptsRegistration({ ...campaign, active: false })).toBe(
      false,
    );
    expect(campaignAcceptsRegistration(null)).toBe(false);
  });
  it("allows explicitly unbounded campaigns and rejects malformed public data", () => {
    const unbounded = { ...campaign, startsAt: null, endsAt: null };
    expect(isReferralCampaign(unbounded)).toBe(true);
    expect(campaignAcceptsRegistration(unbounded)).toBe(true);
    expect(isReferralCampaign({ ...campaign, endsAt: "invalid" })).toBe(false);
  });
  it("replaces dates in existing bilingual hero, FAQ and terms without mutating content", () => {
    const display = campaignDisplayContent(content as ReferralContent, {
      ...campaign,
      startsAt: "2028-01-02T00:00:00Z",
      endsAt: "2028-02-03T00:00:00Z",
    });
    expect(display.zh.hero.campaignWindow).toContain("2028");
    expect(display.en.hero.campaignWindow).toContain("2028");
    expect(display.zh.terms.sections[0].body).not.toContain("2026 年 10 月 13");
    expect(display.en.terms.sections[0].body).not.toContain("October 13, 2026");
    expect(content.zh.hero.campaignWindow).toContain("2026");
    const unavailable = campaignDisplayContent(
      content as ReferralContent,
      null,
    );
    expect(unavailable.zh.hero.campaignWindow).toContain("—");
    expect(unavailable.en.hero.campaignWindow).not.toContain(
      "December 31, 2026",
    );
  });
});
