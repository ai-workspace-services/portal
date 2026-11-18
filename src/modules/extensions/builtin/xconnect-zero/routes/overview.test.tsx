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
      within(screen.getByText("UAT Gateway").parentElement!).getByText(
        /10.77.0.1\/32/,
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByText("UAT Linux One").parentElement!).getByText(
        /10.77.0.2\/32/,
      ),
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
    expect(screen.getByRole("radio", { name: /二层互联/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /抗干扰连接/ })).toBeChecked();
    expect(screen.getByText("仅 Linux Gateway")).toBeInTheDocument();
    expect(screen.getByText("Ed25519 签名状态")).toBeInTheDocument();
    expect(screen.queryByText("GPG 证书重置")).not.toBeInTheDocument();
  });

  it("renders live telemetry cards, device runtime metrics, and connection mode switching when available", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/overview")) {
        return new Response(
          JSON.stringify({
            status: "available",
            networkCount: 1,
            deviceCount: 1,
            gatewayCount: 0,
            oneCount: 1,
            gatewayStatus: "not_configured",
            oneStatus: "connected",
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/networks")) {
        return new Response(
          JSON.stringify({
            networks: [
              {
                id: "net-a",
                display_name: "UAT Network",
                cidr: "10.77.0.0/24",
                gateway_id: "gw-a",
                gateway_endpoint_host: "gw.uat.example",
                gateway_endpoint_port: 51820,
                transport_server_name: "gw.uat.example",
                transport_port: 443,
                connection_mode: "wg_vless_l3",
              },
            ],
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/devices")) {
        return new Response(
          JSON.stringify({
            devices: [
              {
                id: "one-live",
                network_id: "net-a",
                name: "Live One",
                role: "one",
                platform: "linux",
                hostname: "live-one",
                wireguard_address: "10.77.0.2/32",
                status: "active",
                connection_status: "recent_ack",
                active_path: "vless_xhttp_l3",
                rtt_ms: 18,
                rx_bytes: 2048,
                tx_bytes: 4096,
              },
            ],
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/telemetry")) {
        return new Response(
          JSON.stringify({
            status: "available",
            sase_traffic: {
              internet_rx_bytes: 1024,
              internet_tx_bytes: 2048,
              private_rx_bytes: 4096,
              private_tx_bytes: 8192,
            },
            connected_users: [
              {
                device_id: "one-live",
                name: "Live One",
                network_id: "net-a",
                wireguard_address: "10.77.0.2/32",
                active_path: "vless_xhttp_l3",
                rtt_ms: 18,
              },
            ],
            top_private_apps: [
              {
                app: "ssh.internal",
                rx_bytes: 1024,
                tx_bytes: 2048,
                connections: 4,
              },
            ],
            top_users: [
              {
                device_id: "one-live",
                name: "Live One",
                rx_bytes: 2048,
                tx_bytes: 4096,
                total_bytes: 6144,
              },
            ],
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/networks/net-a/mode") && init?.method === "PUT") {
        return new Response(
          JSON.stringify({
            network: { id: "net-a", connection_mode: "wg_udp_l3" },
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ invites: [], registrations: [] }),
        { headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);

    expect(await screen.findByText("ssh.internal")).toBeInTheDocument();
    expect(screen.getAllByText("Live One").length).toBeGreaterThan(0);
    expect(screen.getByText("18 ms")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "节点管理" }));
    expect(await screen.findByText(/vless_xhttp_l3/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "配置管理" }));
    const directRadio = screen.getByRole("radio", { name: /高性能直连/ });
    expect(directRadio).toBeEnabled();
    await user.click(directRadio);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/xconnect-zero/networks/net-a/mode",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ connection_mode: "wg_udp_l3" }),
        }),
      ),
    );
    expect(directRadio).toBeChecked();
  });
});
