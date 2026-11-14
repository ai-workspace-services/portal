import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BillingOptionsPanel from "../BillingOptionsPanel";

const { checkout, preview, pending, retry, plans, mutate } = vi.hoisted(() => ({
  mutate: vi.fn().mockResolvedValue(undefined),
  checkout: vi.fn(),
  preview: vi.fn().mockResolvedValue({
    action: "subscribe",
    amountDue: 5000,
    currency: "CNY",
    renewalAmount: 5000,
    renewalAt: 0,
    previewToken: "signed-preview",
  }),
  pending: vi.fn().mockResolvedValue({ pending: false }),
  retry: vi.fn().mockResolvedValue(undefined),
  plans: new Map([
    [
      "FREE",
      {
        planId: "FREE",
        kind: "subscription",
        packageName: "free",
        active: true,
        displayName: "Free",
        includedQuotaBytes: 5 * 1024 ** 3,
        priceAmount: 0,
        priceCurrency: "CNY",
        priceUnit: "month",
      },
    ],
    [
      "PLUS-MONTHLY-2026",
      {
        planId: "PLUS-MONTHLY-2026",
        kind: "subscription",
        packageName: "plus",
        active: true,
        stripePriceId: "price_plus_monthly",
        displayName: "Plus",
        includedQuotaBytes: 30 * 1024 ** 3,
        priceAmount: 3000,
        priceCurrency: "CNY",
        priceUnit: "month",
        features: { family: "plus", dunning: { grace_days: 3 } },
      },
    ],
    [
      "PRO-MONTHLY-2026",
      {
        planId: "PRO-MONTHLY-2026",
        kind: "subscription",
        packageName: "pro",
        active: true,
        stripePriceId: "price_pro_monthly",
        displayName: "Pro",
        includedQuotaBytes: 50 * 1024 ** 3,
        priceAmount: 5000,
        priceCurrency: "CNY",
        priceUnit: "month",
        features: { family: "pro", dunning: { grace_days: 3 } },
      },
    ],
    [
      "CUSTOM-NODE-MONTHLY-2026",
      {
        planId: "CUSTOM-NODE-MONTHLY-2026",
        kind: "subscription",
        packageName: "custom",
        active: true,
        stripePriceId: "price_custom_node",
        displayName: "定制节点",
        includedQuotaBytes: 0,
        priceAmount: 8000,
        priceCurrency: "CNY",
        priceUnit: "month",
        features: {
          family: "custom",
          quota_label: "独享IP · 独享节点",
          dunning: { grace_days: 3 },
        },
      },
    ],
    [
      "CUSTOM-AI-CONSULT-2026",
      {
        planId: "CUSTOM-AI-CONSULT-2026",
        kind: "service",
        packageName: "custom",
        active: true,
        stripePriceId: "price_ai_consult",
        displayName: "AI 工具咨询，电脑环境配置",
        includedQuotaBytes: 0,
        priceAmount: 10000,
        priceCurrency: "CNY",
        priceUnit: "once",
        features: {
          family: "custom",
          checkout_mode: "payment",
          price_unit_label: "小时/次",
        },
      },
    ],
  ]),
}));

vi.mock("swr", () => ({
  useSWRConfig: () => ({ mutate }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));

vi.mock("@modules/billing/catalog", async () => {
  const actual = await vi.importActual<typeof import("@modules/billing/catalog")>(
    "@modules/billing/catalog",
  );
  return {
    ...actual,
    useBillingCatalog: () => plans,
  };
});

vi.mock("@components/billing/stripe-client", () => ({
  startStripeCheckout: checkout,
  previewSubscription: preview,
  getSubscriptionPurchase: pending,
  retrySubscriptionPurchase: retry,
}));

describe("BillingOptionsPanel", () => {
  beforeEach(() => {
    checkout.mockClear();
    preview.mockClear();
  });

  it("renders the 4-family aligned paid options dynamically without PAYG tabs", async () => {
    pending.mockResolvedValue({ pending: false });
    render(<BillingOptionsPanel />);

    expect(await screen.findByText("Plus")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("定制节点")).toBeInTheDocument();
    expect(screen.getByText("AI 工具咨询，电脑环境配置")).toBeInTheDocument();
    expect(screen.queryByText("按量付费")).not.toBeInTheDocument();
  });

  it("previews a subscription purchase and confirms via Stripe checkout", async () => {
    pending.mockResolvedValue({ pending: false });
    preview.mockResolvedValue({
      action: "subscribe",
      amountDue: 5000,
      currency: "CNY",
      renewalAmount: 5000,
      renewalAt: 0,
      previewToken: "signed-preview",
    });

    render(<BillingOptionsPanel />);
    const btn = await screen.findByRole("button", { name: "订阅 Pro" });
    fireEvent.click(btn);

    await waitFor(() => expect(preview).toHaveBeenCalledTimes(1));
    expect(preview).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "PRO-MONTHLY-2026",
        stripePriceId: "price_pro_monthly",
        mode: "subscription",
      }),
    );

    const confirmBtn = await screen.findByRole("button", { name: "确认并支付" });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(checkout).toHaveBeenCalledTimes(1));
  });

  it("allows upgrading from Plus to Pro or Custom Node, while disabling downgrade", async () => {
    pending.mockResolvedValue({ pending: false });
    render(<BillingOptionsPanel currentPlanId="PLUS-MONTHLY-2026" />);

    expect(
      await screen.findByRole("button", { name: "当前套餐" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "升级到 Pro" }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: "升级到 定制节点" }),
    ).not.toBeDisabled();
  });

  it("launches one-time payment mode directly for AI consult service", async () => {
    pending.mockResolvedValue({ pending: false });
    render(<BillingOptionsPanel />);

    const buyBtn = await screen.findByRole("button", { name: "立即购买" });
    fireEvent.click(buyBtn);

    await waitFor(() => expect(checkout).toHaveBeenCalledTimes(1));
    expect(checkout).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "CUSTOM-AI-CONSULT-2026",
        stripePriceId: "price_ai_consult",
        mode: "payment",
      }),
    );
  });

  it("blocks checkout while refund review is pending", async () => {
    pending.mockResolvedValue({
      pending: false,
      refundReviewPending: true,
    });
    render(<BillingOptionsPanel />);

    const buttons = await screen.findAllByRole("button", { name: "退款待审核" });
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }
  });
});
