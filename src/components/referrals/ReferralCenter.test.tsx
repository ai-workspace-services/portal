import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import content from "@/data/content/referral.json";
import type { ReferralContent } from "@/lib/referral-content";
vi.mock("@/i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "en" }),
}));
vi.mock("@/components/LanguageToggle", () => ({ default: () => null }));
vi.mock("@/components/common/BoundaryLink", () => ({
  default: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: ({
    unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => (
    // The test mock preserves component props without Next image loading.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" {...props} />
  ),
}));
import ReferralCenter from "./ReferralCenter";
const overview = {
  code: "AB12CD34",
  inviteUrl: "https://xworktech.com/referral?code=AB12CD34",
  stats: { successfulInvites: 0, awardedDays: 0, cashByCurrency: [] },
  referrals: [],
  settlements: [],
  extensions: [],
};
describe("personal referral center", () => {
  it("discloses bounded histories while showing the full-ledger summary", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ...overview,
          historyHasMore: {
            referrals: true,
            settlements: false,
            extensions: false,
          },
        }),
      ),
    );
    render(<ReferralCenter content={content as ReferralContent} />);
    await screen.findByText(content.en.center.records.historyLimitNote);
  });
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  it("shows genuine empty state without fabricated reward balances", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(overview)),
    );
    render(<ReferralCenter content={content as ReferralContent} />);
    await waitFor(() =>
      expect(screen.getByDisplayValue(overview.inviteUrl)).toBeInTheDocument(),
    );
    expect(
      screen.getByText(content.en.center.records.empty),
    ).toBeInTheDocument();
    expect(
      screen.getByText(content.en.center.extensions.empty),
    ).toBeInTheDocument();
    expect(screen.queryByText("$109.50")).not.toBeInTheDocument();
  });
  it("shows an authentication recovery CTA on expired session", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 401 }),
    );
    render(<ReferralCenter content={content as ReferralContent} />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        content.en.center.errors.unauthorized,
      ),
    );
    expect(
      screen.getByRole("link", { name: content.en.center.actions.signIn }),
    ).toHaveAttribute("href", "/login?redirect=%2Freferrals");
  });
  it("separates currencies and submits an available balance for review", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (_url, init) =>
        new Response(
          JSON.stringify(
            init?.method === "POST"
              ? { id: "s1" }
              : {
                  ...overview,
                  stats: {
                    ...overview.stats,
                    cashByCurrency: [
                      {
                        currency: "USD",
                        earnedMinor: 1200,
                        pendingMinor: 0,
                        eligibleMinor: 1200,
                        settledMinor: 0,
                        reversedMinor: 0,
                      },
                      {
                        currency: "JPY",
                        earnedMinor: 100,
                        pendingMinor: 100,
                        eligibleMinor: 0,
                        settledMinor: 0,
                        reversedMinor: 0,
                      },
                    ],
                  },
                },
          ),
        ),
    );
    render(<ReferralCenter content={content as ReferralContent} />);
    const button = await screen.findByRole("button", {
      name: `${content.en.center.settlements.request} · USD`,
    });
    expect(screen.getAllByText("$12.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("¥100").length).toBeGreaterThan(0);
    fireEvent.click(button);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/referrals/settlements",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ currency: "USD" }),
        }),
      ),
    );
  });
});
