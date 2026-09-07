import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import XConnectZeroOverviewRoute from "./overview";

vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));

vi.mock("@/app/panel/components/Breadcrumbs", () => ({
  default: () => <nav aria-label="Breadcrumb">Dashboard / XConnect Zero</nav>,
}));

describe("XConnectZeroOverviewRoute", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps multi-node operations discoverable without fabricating unavailable data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "control_plane_unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<XConnectZeroOverviewRoute />);

    await waitFor(() => {
      expect(screen.getAllByText("连接异常").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("GPG 证书重置")).toBeInTheDocument();
    expect(screen.getByText("UUID")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "IP 分配" }));
    expect(
      screen.getByRole("heading", { name: "IP 分配" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("连接中心控面后加载实时数据并启用写操作。").length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "证书" }));
    await user.click(screen.getByRole("button", { name: "重置" }));
    expect(
      screen.getByRole("alertdialog", { name: "重置 GPG 证书？" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "写入接口未接入" }),
    ).toBeDisabled();
  });

  it("uses live overview counts when the accounts control plane is available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "available",
            networkCount: 2,
            deviceCount: 12,
            gatewayCount: 3,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<XConnectZeroOverviewRoute />);

    await waitFor(() => {
      expect(screen.getAllByText("已连接").length).toBeGreaterThan(0);
    });
    await user.click(screen.getByRole("button", { name: "节点" }));

    expect(screen.getByText("Gateway 节点")).toBeInTheDocument();
    expect(screen.getByText("One 节点")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
