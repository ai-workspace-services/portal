import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AccountConnectionsPanel from "../AccountConnectionsPanel";

vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));

vi.mock("swr", () => ({
  default: vi.fn(() => ({
    data: [
      {
        name: "JP-XHTTP.SVC.PLUS",
        address: "jp-xhttp.svc.plus",
        server_name: "jp-xhttp.svc.plus",
        transport: "xhttp",
        port: 443,
        xhttp_port: 443,
        tcp_port: 1443,
        protocols: ["VLESS"],
      },
      {
        name: "Internal Agents (Shared Token)",
        address: "internal.svc.plus",
        transport: "tcp",
        port: 1443,
      },
    ],
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  })),
}));

vi.mock("../../lib/fetchAgentNodes", () => ({
  fetchAgentNodes: vi.fn(),
}));

vi.mock("../VlessQrCard", () => ({
  default: () => <div data-testid="vless-qr-card">VLESS QR</div>,
}));

describe("AccountConnectionsPanel", () => {
  it("renders service-provided node details without inventing health status", () => {
    render(<AccountConnectionsPanel proxyUuid="proxy-1" />);

    expect(screen.getByText("JP-XHTTP.SVC.PLUS")).toBeInTheDocument();
    expect(screen.getAllByText("jp-xhttp.svc.plus")).toHaveLength(2);
    expect(screen.getByText("443 / 1443")).toBeInTheDocument();
    expect(screen.getByText("VLESS")).toBeInTheDocument();
    expect(
      screen.queryByText("Internal Agents (Shared Token)"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Online")).not.toBeInTheDocument();
    expect(screen.getByTestId("vless-qr-card")).toBeInTheDocument();
  });
});
