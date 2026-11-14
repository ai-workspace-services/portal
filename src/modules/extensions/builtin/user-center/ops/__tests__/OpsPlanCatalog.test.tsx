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
});
