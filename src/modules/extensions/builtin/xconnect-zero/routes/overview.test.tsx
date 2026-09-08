import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import XConnectZeroOverviewRoute from "./overview";
vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));
vi.mock("@/app/panel/components/Breadcrumbs", () => ({
  default: () => <nav>Dashboard</nav>,
}));
describe("XConnectZeroOverviewRoute", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("keeps the experience to overview, node join, and configuration", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "control_plane_unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);
    await waitFor(() =>
      expect(screen.getAllByText("连接异常").length).toBeGreaterThan(0),
    );
    expect(
      screen.getByRole("button", { name: "Zero 概览" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "节点加入" }));
    expect(screen.getByText("安全加入节点")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "配置管理" }));
    expect(screen.getByText("WG 与签名证书")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /抗干扰连接/ })).toBeChecked();
    expect(screen.getByText("wg_udp_l3")).toBeInTheDocument();
    expect(screen.getAllByText("wg_vless_l3").length).toBeGreaterThan(0);
    expect(screen.getByText("wg_vless_l2")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /二层互联/ }));
    expect(screen.getByRole("radio", { name: /二层互联/ })).toBeChecked();
    expect(screen.getByText("仅 Linux Gateway")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /GPG 证书重置/ }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
