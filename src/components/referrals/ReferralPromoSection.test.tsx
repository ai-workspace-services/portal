import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import content from "@/data/content/referral.json";
import type { ReferralContent } from "@/lib/referral-content";
const state = vi.hoisted(() => ({ campaign: null as unknown }));
vi.mock("@/state/referral-campaign", () => ({
  useReferralCampaign: () => state.campaign,
}));
vi.mock("@/i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));
vi.mock("@/components/common/BoundaryLink", () => ({
  default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props} />
  ),
}));
import ReferralPromoSection from "./ReferralPromoSection";
afterEach(cleanup);
const campaign = {
  revision: 1,
  enabled: true,
  active: true,
  startsAt: "2020-01-01T00:00:00Z",
  endsAt: "2099-01-01T00:00:00Z",
  cashbackBps: 1000,
  annualBonusDays: 30,
};
describe("campaign entry runtime state", () => {
  it.each([
    null,
    { ...campaign, enabled: false },
    { ...campaign, active: false },
    { ...campaign, startsAt: "2098-01-01T00:00:00Z" },
  ])(
    "blocks the activity CTA for unavailable, disabled or future campaigns",
    (value) => {
      state.campaign = value;
      render(<ReferralPromoSection content={content as ReferralContent} />);
      const link = screen.getByRole("link", {
        name: content.zh.hero.primaryCta.label,
      });
      expect(link).toHaveAttribute("aria-disabled", "true");
      expect(fireEvent.click(link)).toBe(false);
      expect(
        screen.getByRole("link", { name: content.zh.hero.secondaryCta.label }),
      ).toHaveAttribute("href", "/referrals");
    },
  );
  it("keeps the existing active CTA and displays dates from the API", () => {
    state.campaign = campaign;
    render(<ReferralPromoSection content={content as ReferralContent} />);
    expect(
      screen.getByRole("link", { name: content.zh.hero.primaryCta.label }),
    ).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByText(/活动时间/).textContent).toContain("2099");
  });
});
