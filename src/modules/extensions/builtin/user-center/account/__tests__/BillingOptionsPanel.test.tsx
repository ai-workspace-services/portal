import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BillingOptionsPanel from "../BillingOptionsPanel";

const { checkout, preview, pending, retry, plans } = vi.hoisted(() => ({
  checkout: vi.fn(),
  preview: vi.fn().mockResolvedValue({
    action: "subscribe",
    amountDue: 50000,
    currency: "CNY",
    renewalAmount: 50000,
    renewalAt: 0,
    previewToken: "signed-preview",
  }),
  pending: vi.fn().mockResolvedValue({ pending: false }),
  retry: vi.fn().mockResolvedValue(undefined),
  plans: new Map([
    [
      "PLUS",
      {
        planId: "PLUS",
        kind: "subscription",
        active: true,
        stripePriceId: "price_plus_monthly",
        displayName: "Plus",
        includedQuotaBytes: 21474836480,
        priceAmount: 2000,
        priceCurrency: "CNY",
        priceUnit: "month",
      },
    ],
    [
      "PRO-MONTHLY-V2",
      {
        planId: "PRO-MONTHLY-V2",
        kind: "subscription",
        active: true,
        stripePriceId: "price_pro_monthly",
        displayName: "Pro 月付",
        includedQuotaBytes: 53687091200,
        priceAmount: 5000,
        priceCurrency: "CNY",
        priceUnit: "month",
      },
    ],
    [
      "PRO-YEARLY-V2",
      {
        planId: "PRO-YEARLY-V2",
        kind: "subscription",
        active: true,
        stripePriceId: "price_pro_yearly",
        displayName: "Pro 年付",
        includedQuotaBytes: 9223372036854775807,
        priceAmount: 50000,
        priceCurrency: "CNY",
        priceUnit: "year",
        features: { fast_lane: { mode: "unlimited" } },
      },
    ],
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
      "PAYG-TOPUP-100",
      {
        planId: "PAYG-TOPUP-100",
        kind: "paygo_topup",
        active: true,
        stripePriceId: "price_cny_100",
        priceAmount: 10000,
        priceCurrency: "CNY",
        priceUnit: "once",
      },
    ],
    [
      "PAYG-TOPUP-200",
      {
        planId: "PAYG-TOPUP-200",
        kind: "paygo_topup",
        active: true,
        stripePriceId: "price_cny_200",
        priceAmount: 20000,
        priceCurrency: "CNY",
        priceUnit: "once",
      },
    ],
    [
      "PAYG-TOPUP-USD-50",
      {
        planId: "PAYG-TOPUP-USD-50",
        kind: "paygo_topup",
        active: true,
        stripePriceId: "price_usd_50",
        priceAmount: 5000,
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
        stripePriceId: "price_usd_20",
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
  previewSubscription: preview,
  getSubscriptionPurchase: pending,
  retrySubscriptionPurchase: retry,
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
  it("retries only the pending operation without starting another checkout", async () => {
    checkout.mockClear();
    retry.mockClear();
    pending.mockResolvedValueOnce({ pending: true, retryable: true });
    render(<BillingOptionsPanel />);
    fireEvent.click(
      await screen.findByRole("button", { name: "重试本次支付" }),
    );
    await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
    expect(checkout).not.toHaveBeenCalled();
  });
  it("previews a fresh annual subscription, names its button correctly and waits for confirmation", async () => {
    checkout.mockClear();
    preview.mockClear();
    render(<BillingOptionsPanel currentPlanId="FREE" />);
    const button = screen.getByRole("button", { name: "订阅 Pro 年付" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await screen.findByRole("dialog");
    expect(checkout).not.toHaveBeenCalled();
    expect(screen.getByText("本次应付")).toBeInTheDocument();
    expect(screen.getByText("下次续费金额")).toBeInTheDocument();
    expect(screen.getByText("下次续费日期")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认并支付" }));
    await waitFor(() =>
      expect(checkout).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: "PRO-YEARLY-V2",
          previewToken: "signed-preview",
        }),
      ),
    );
    expect(screen.getAllByRole("button", { name: "同步中" })).toHaveLength(3);
  });

  it("offers only a same-cycle Pro monthly upgrade to an existing Plus subscriber", async () => {
    render(<BillingOptionsPanel currentPlanId="PLUS" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "升级到 Pro" })).toBeEnabled(),
    );
    expect(screen.getByRole("button", { name: "当前套餐" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "升级为年付" })).toBeDisabled();
  });

  it("restores the durable purchase lock on reload", async () => {
    pending.mockResolvedValueOnce({ pending: true });
    render(<BillingOptionsPanel />);
    await screen.findByText(
      "支付或权益同步中，请勿重复购买。确认后将恢复操作。",
    );
    expect(screen.getAllByRole("button", { name: "同步中" })).toHaveLength(3);
  });
  it("offers the configured presets and bounded custom top-ups", async () => {
    render(<BillingOptionsPanel />);
    expect(screen.getByText("Plus · 20 GB/月")).toBeInTheDocument();
    expect(
      screen.getByText("适合日常 AI 对话与轻度使用。"),
    ).toBeInTheDocument();
    expect(screen.getByText(/不限流量/)).toBeInTheDocument();
    expect(screen.getByText(/50 GB/)).toBeInTheDocument();
    expect(screen.queryByText(/专属节点/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "按量付费" }));

    expect(screen.getByRole("button", { name: "¥50" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "¥100" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "¥200" })).toBeInTheDocument();
    const customInput = screen.getByRole("spinbutton", {
      name: "自定义充值金额",
    });
    fireEvent.change(customInput, { target: { value: "9" } });
    expect(screen.getByRole("button", { name: "充值 ¥9" })).toBeDisabled();
    fireEvent.change(customInput, { target: { value: "10" } });
    expect(screen.getByRole("button", { name: "充值 ¥10" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "充值 ¥10" }));
    expect(checkout).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "PAYG-CUSTOM-CNY",
        amountMinor: 1000,
        currency: "CNY",
        mode: "payment",
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "充值 ¥10" })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "美元 USD" }));
    expect(screen.getByRole("button", { name: "$20" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "$50" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "$100" })).toBeInTheDocument();
    expect(screen.getByText(/美元余额独立记账/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "人民币 CNY" }));
    fireEvent.click(screen.getByRole("button", { name: "¥50" }));
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
