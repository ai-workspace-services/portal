import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BillingOptionsPanel from "../BillingOptionsPanel";

const { checkout, plans } = vi.hoisted(() => ({
  checkout: vi.fn(),
  plans: new Map([
    [
      "PAYG-TOPUP-50",
      {
        planId: "PAYG-TOPUP-50",
        kind: "paygo_topup",
        active: true,
        stripePriceId: "price_cny_50",
        priceAmount: 5000,
        priceCurrency: "CNY",
        priceUnit: "once",
      },
    ],
    [
      "PAYG-TOPUP-10",
      {
        planId: "PAYG-TOPUP-10",
        kind: "paygo_topup",
        active: true,
        priceAmount: 1000,
        priceCurrency: "CNY",
        priceUnit: "once",
      },
    ],
    [
      "PAYG-TOPUP-USD-5",
      {
        planId: "PAYG-TOPUP-USD-5",
        kind: "paygo_topup",
        active: true,
        priceAmount: 500,
        priceCurrency: "USD",
        priceUnit: "once",
      },
    ],
    [
      "PAYG-TOPUP-USD-10",
      {
        planId: "PAYG-TOPUP-USD-10",
        kind: "paygo_topup",
        active: true,
        priceAmount: 1000,
        priceCurrency: "USD",
        priceUnit: "once",
      },
    ],
    [
      "PAYG-TOPUP-USD-20",
      {
        planId: "PAYG-TOPUP-USD-20",
        kind: "paygo_topup",
        active: true,
        priceAmount: 2000,
        priceCurrency: "USD",
        priceUnit: "once",
      },
    ],
    [
      "PAYG-TOPUP-USD-100",
      {
        planId: "PAYG-TOPUP-USD-100",
        kind: "paygo_topup",
        active: true,
        priceAmount: 10000,
        priceCurrency: "USD",
        priceUnit: "once",
      },
    ],
  ]),
}));

vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));
vi.mock("@components/billing/PaymentMfaNotice", () => ({
  usePaymentMfaRequired: () => false,
}));
vi.mock("@components/billing/CheckoutStatusBanner", () => ({
  default: () => null,
}));
vi.mock("@components/billing/stripe-client", () => ({
  startStripeCheckout: checkout,
}));
vi.mock("@modules/billing/catalog", () => ({
  useBillingCatalog: () => plans,
  billingPlans: (catalog: Map<string, unknown>) =>
    [...catalog.values()].map((plan: unknown) => ({
      plan,
      planId: (plan as { planId: string }).planId,
      copy: {},
    })),
  formatPlanPrice: () => null,
  isPurchasable: (plan?: { active?: boolean; stripePriceId?: string }) =>
    Boolean(plan?.active && plan.stripePriceId),
  XCONNECT_PRODUCT_SLUG: "xconnect",
}));

describe("BillingOptionsPanel", () => {
  it("offers only fixed CNY and USD denominations and checks catalog prices", async () => {
    render(<BillingOptionsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "按量付费" }));

    expect(screen.getByRole("button", { name: "¥10" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "¥10" }));
    expect(screen.getByRole("button", { name: "充值 ¥10" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "¥50" })).toBeEnabled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "美元 USD" }));
    expect(screen.getByRole("button", { name: "$5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /充值 \$10/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "$100" })).toBeInTheDocument();
    expect(screen.getByText(/美元余额独立记账/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "人民币 CNY" }));
    fireEvent.click(screen.getByRole("button", { name: "充值 ¥50" }));
    expect(checkout).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "PAYG-TOPUP-50",
        stripePriceId: "price_cny_50",
        mode: "payment",
      }),
    );
  });
});
