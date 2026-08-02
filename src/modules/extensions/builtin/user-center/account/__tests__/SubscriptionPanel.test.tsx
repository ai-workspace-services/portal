import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SubscriptionPanel from "../SubscriptionPanel";

vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "en" }),
}));

vi.mock("swr", () => ({
  default: vi.fn((key: string) => {
    if (key === "/api/auth/subscriptions") {
      return {
        data: { subscriptions: [] },
        isLoading: false,
        mutate: vi.fn(),
      };
    }
    if (key === "account-usage-summary") {
      return {
        data: {
          totalBytes: 384,
          currentBalance: 87.5,
          remainingIncludedQuota: 2048,
          includedQuotaBytes: 4096,
          usedBytes: 2048,
          usagePercent: 50,
          periodStart: "2026-04-01T00:00:00Z",
          periodEnd: "2026-05-01T00:00:00Z",
          syncDelaySeconds: 12,
          arrears: false,
          sourceOfTruth: "postgresql",
          billingProfile: {
            packageName: "starter",
            pricingRuleVersion: "pricing-v1",
          },
        },
      };
    }
    if (key === "account-billing-summary") {
      return {
        data: {
          sourceOfTruth: "postgresql",
          billingProfile: {
            packageName: "starter",
            pricingRuleVersion: "pricing-v1",
          },
          ledger: [
            {
              id: "ledger-1",
              entryType: "traffic_charge",
              ratedBytes: 50,
              amountDelta: -12.5,
              balanceAfter: 75,
              pricingRuleVersion: "pricing-v1",
              bucketStart: "2026-04-08T10:30:00Z",
            },
          ],
        },
      };
    }
    if (key === "account-policy") {
      return {
        data: {
          preferredStrategy: "ewma",
          eligibleNodeGroups: ["hk-premium"],
        },
      };
    }
    return { data: undefined, isLoading: false, mutate: vi.fn() };
  }),
}));

vi.mock("@components/billing/stripe-client", () => ({
  openStripePortal: vi.fn(),
}));

vi.mock("../../lib/fetchAccountUsage", () => ({
  fetchAccountUsageSummary: vi.fn(),
  fetchAccountBillingSummary: vi.fn(),
  fetchAccountPolicy: vi.fn(),
}));

describe("SubscriptionPanel", () => {
  it("renders accounts-backed source-of-truth usage metadata", () => {
    render(<SubscriptionPanel />);

    expect(screen.getByText("Authoritative usage")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Usage is aggregated by accounts.svc.plus, not counted by the local client.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Source：postgresql")).toHaveLength(2);
    expect(screen.getByText("384 B")).toBeInTheDocument();
    expect(screen.getByText("Monthly quota")).toBeInTheDocument();
    expect(screen.getByText("50.0%")).toBeInTheDocument();
    expect(screen.getByText(/Used 2 KB \/ 4 KB/)).toBeInTheDocument();
    expect(screen.getByText(/Period reset：/)).toBeInTheDocument();
    expect(screen.getByText(/Sync delay 12 s/)).toBeInTheDocument();
    expect(screen.getByText(/Eligible groups hk-premium/)).toBeInTheDocument();
    expect(
      screen.getByText(
        (content) =>
          content.includes("Package") &&
          content.includes("starter") &&
          content.includes("Rules") &&
          content.includes("pricing-v1"),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Recent billing ledger")).toBeInTheDocument();
    expect(screen.getByText(/traffic_charge/)).toBeInTheDocument();
  });
});
