import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLanguageStore } from "@i18n/LanguageProvider";
import XConnectZeroGatewayRoute from "./gateway";

describe("XConnectZeroGatewayRoute", () => {
  afterEach(() => {
    cleanup();
    useLanguageStore.setState({ language: "zh" });
    vi.unstubAllGlobals();
  });

  it("renders available gateways and CLI connect command", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            gateways: [
              {
                network_id: "net-ph-xconnect",
                display_name: "PH XConnect Gateway 01",
                cidr: "10.66.0.0/16",
                gateway_id: "ph-xconnect-gateway-01",
                gateway_endpoint_host: "ph-xconnect-gateway-01.svc.plus",
                gateway_endpoint_port: 51820,
                transport_server_name: "ph-xconnect-gateway-01.svc.plus",
                transport_port: 443,
                connection_mode: "wg_vless_l3",
                runtime_healthy: true,
                last_seen_at: "2026-11-18T12:11:32Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    render(<XConnectZeroGatewayRoute />);

    await waitFor(() => {
      expect(screen.getByText("PH XConnect Gateway 01")).toBeInTheDocument();
    });
    expect(screen.getByText("ph-xconnect-gateway-01")).toBeInTheDocument();
    expect(
      screen.getByText("xconnect-one up --gateway ph-xconnect-gateway-01.svc.plus"),
    ).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "运营与管理 / 可用网关" }),
    ).toHaveAttribute("href", "/panel/agent");
  });

  it("renders empty state and English header badge when language is en", async () => {
    useLanguageStore.setState({ language: "en" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ gateways: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    render(<XConnectZeroGatewayRoute />);

    await waitFor(() => {
      expect(screen.getByText("暂无可用 Gateway 节点")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", { name: "Admin & Operations / Gateways" }),
    ).toHaveAttribute("href", "/panel/agent");
  });
});
