import { render, screen, waitFor, within } from "@testing-library/react";
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
  it("shows owner-scoped Gateway and Linux One counts and honest ACK status in the existing layout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const data = url.endsWith("/overview")
          ? {
              status: "available",
              networkCount: 1,
              deviceCount: 2,
              gatewayCount: 1,
              oneCount: 1,
              gatewayStatus: "active",
              oneStatus: "connected",
            }
          : url.endsWith("/devices")
            ? {
                devices: [
                  {
                    id: "gw-test",
                    name: "UAT Gateway",
                    role: "gateway",
                    platform: "linux",
                    wireguard_address: "10.77.0.1/32",
                    status: "active",
                    connection_status: "stale",
                  },
                  {
                    id: "one-test",
                    name: "UAT Linux One",
                    role: "one",
                    platform: "linux",
                    wireguard_address: "10.77.0.2/32",
                    status: "active",
                    connection_status: "recent_ack",
                  },
                ],
              }
            : url.endsWith("/networks")
              ? { networks: [] }
              : { invites: [] };
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);
    const gatewayCard = await screen.findByRole("button", {
      name: /Gateway 节点.*无近期配置确认/,
    });
    expect(within(gatewayCard).getByText("1")).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("button", { name: /One 节点.*最近配置已确认/ }),
      ).getByText("1"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "节点管理" }));
    expect(await screen.findByText("UAT Gateway")).toBeInTheDocument();
    expect(screen.getByText("UAT Linux One")).toBeInTheDocument();
    expect(
      screen.getByText(/Gateway · linux · 10.77.0.1\/32 · 无近期配置确认/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/One · linux · 10.77.0.2\/32 · 最近配置已确认/),
    ).toBeInTheDocument();
  });
  it("keeps the experience to overview, node management, and configuration", async () => {
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
    await user.click(screen.getByRole("button", { name: "节点管理" }));
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
