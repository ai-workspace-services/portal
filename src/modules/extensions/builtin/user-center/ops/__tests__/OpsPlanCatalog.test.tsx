import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OpsPlanCatalog from "../components/OpsPlanCatalog";

const fixture = vi.hoisted(() => ({
  plans: [] as Record<string, unknown>[],
  mutate: vi.fn(),
}));

vi.mock("swr", () => ({
  default: () => ({ data: { plans: fixture.plans }, mutate: fixture.mutate }),
}));
vi.mock("@lib/userStore", () => ({
  useUserStore: (select: (s: unknown) => unknown) =>
    select({ user: { isRoot: true } }),
}));

beforeEach(() => {
  fixture.plans = [];
  fixture.mutate.mockResolvedValue({ plans: [] });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});

describe("catalog settings apply", () => {
  it("publishes edited quota and 3-day grace using the existing plan endpoint", async () => {
    render(<OpsPlanCatalog />);
    fireEvent.click(screen.getByRole("tab", { name: "Plus · 30 GB" }));
    fireEvent.change(screen.getByLabelText("账户配额（GB）"), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByLabelText("操作原因"), {
      target: { value: "quota review" },
    });
    fireEvent.click(screen.getByLabelText("发布并开放应用"));
    fireEvent.click(screen.getByText("保存并应用设置"));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/billing/plans/PLUS-MONTHLY-2026");
    expect(JSON.parse(String(options?.body))).toMatchObject({
      active: true,
      packageName: "plus",
      includedQuotaBytes: 30 * 1024 ** 3,
      priceAmount: 3000,
    });
  });

  it("renders dual-bucket Pro quotas without squeezing and saves highSpeedQuotaBytes", async () => {
    fixture.plans = [
      {
        planId: "PRO-MONTHLY-V2",
        displayName: "Pro 月付",
        kind: "subscription",
        packageName: "pro",
        active: true,
        includedQuotaBytes: 50 * 1024 ** 3,
        highSpeedQuotaBytes: 30 * 1024 ** 3,
        priceAmount: 5000,
        priceCurrency: "CNY",
        priceUnit: "month",
      },
    ];
    render(<OpsPlanCatalog />);
    expect(screen.getByText(/30 GB 高速 \+ 50 GB VPS/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Pro"));
    fireEvent.change(screen.getByLabelText("高速流量配额（GB）"), {
      target: { value: "35" },
    });
    fireEvent.change(screen.getByLabelText("操作原因"), {
      target: { value: "adjust fast lane quota" },
    });
    fireEvent.click(screen.getByText("保存并应用设置"));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(options?.body))).toMatchObject({
      planId: "PRO-MONTHLY-V2",
      highSpeedQuotaBytes: 35 * 1024 ** 3,
    });
  });

  it("lets a root operator edit a legacy trial/payg entry and deactivate it", async () => {
    fixture.plans = [
      {
        planId: "FREE-3GB-2026",
        displayName: "Legacy Trial 3GB",
        kind: "trial",
        packageName: "free",
        active: true,
        includedQuotaBytes: 3 * 1024 ** 3,
      },
    ];
    render(<OpsPlanCatalog />);
    fireEvent.click(screen.getByText("待清理历史记录", { exact: false }));
    fireEvent.click(screen.getByText("Legacy Trial 3GB"));
    fireEvent.click(screen.getByLabelText("发布并开放应用"));
    fireEvent.change(screen.getByLabelText("操作原因"), {
      target: { value: "disable legacy trial" },
    });
    fireEvent.click(screen.getByText("保存并应用设置"));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(
      JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)),
    ).toMatchObject({ planId: "FREE-3GB-2026", active: false });
  });

  it("lets a root operator delete a retired plan entry with reason", async () => {
    fixture.plans = [
      {
        planId: "FREE-3GB-2026",
        displayName: "Legacy Trial 3GB",
        kind: "trial",
        packageName: "free",
        active: true,
        includedQuotaBytes: 3 * 1024 ** 3,
      },
    ];
    render(<OpsPlanCatalog />);
    fireEvent.click(screen.getByText("待清理历史记录", { exact: false }));
    fireEvent.click(screen.getByText("Legacy Trial 3GB"));
    fireEvent.change(screen.getByLabelText("操作原因"), {
      target: { value: "delete retired plan" },
    });
    fireEvent.click(screen.getByText("删除套餐"));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [delUrl, delOpts] = vi.mocked(fetch).mock.calls[0];
    expect(String(delUrl)).toContain(
      "/billing/plans/FREE-3GB-2026?reason=delete%20retired%20plan",
    );
    expect(delOpts?.method).toBe("DELETE");
  });

  it("edits multi-entity stripeProfile, businessLine, and merchantEntity fields", async () => {
    fixture.plans = [
      {
        planId: "PRO-MONTHLY-V2",
        displayName: "Pro 月付",
        kind: "subscription",
        packageName: "pro",
        active: true,
        includedQuotaBytes: 50 * 1024 ** 3,
        highSpeedQuotaBytes: 30 * 1024 ** 3,
        priceAmount: 5000,
        priceCurrency: "USD",
        priceUnit: "month",
        stripeProfile: "us",
        businessLine: "us_nodes",
        merchantEntity: "US Entity Inc",
      },
    ];
    render(<OpsPlanCatalog />);
    fireEvent.click(screen.getByText("Pro"));
    fireEvent.change(screen.getByLabelText("收款主体（Stripe Profile）"), {
      target: { value: "us" },
    });
    fireEvent.change(screen.getByLabelText("业务线（Business Line）"), {
      target: { value: "us_retail" },
    });
    fireEvent.change(screen.getByLabelText("收款公司名称（Merchant Entity）"), {
      target: { value: "US Retail LLC" },
    });
    fireEvent.change(screen.getByLabelText("操作原因"), {
      target: { value: "assign us entity" },
    });
    fireEvent.click(screen.getByText("保存并应用设置"));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(options?.body))).toMatchObject({
      planId: "PRO-MONTHLY-V2",
      stripeProfile: "us",
      businessLine: "us_retail",
      merchantEntity: "US Retail LLC",
    });
  });
});
