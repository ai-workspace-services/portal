import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OpsTrafficDispatch from "../components/OpsTrafficDispatch";

describe("OpsTrafficDispatch", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ agents: [] }),
      }),
    );
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderPage() {
    return render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <OpsTrafficDispatch />
      </SWRConfig>,
    );
  }

  it("falls back to canonical seed nodes when inventory is empty", async () => {
    renderPage();

    expect(await screen.findByText("基准节点模板模式")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("jp-xconnect-01.svc.plus")).toBeInTheDocument();
    expect(within(table).getByText("jp-xconnect-02.svc.plus")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("reload");
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/admin/agents/inventory",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("shows live inventory pill when agents are returned", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        agents: [
          {
            id: "jp-xconnect-01.svc.plus",
            status: "healthy",
            clientCount: 19,
          },
          {
            id: "jp-xconnect-02.svc.plus",
            status: "healthy",
            clientCount: 4,
          },
        ],
      }),
    } as Response);

    renderPage();

    expect(await screen.findByText("实时节点库存已同步")).toBeInTheDocument();
    expect(screen.getByText("19")).toBeInTheDocument();
  });

  it("switches scenario presets, adjusts weights, and switches output tabs", async () => {
    renderPage();
    await screen.findByText("基准节点模板模式");

    // Default rolling-upgrade starts at 80/20
    expect(screen.getByText("本地权重 80%")).toBeInTheDocument();
    expect(screen.getByText("目标节点 20%")).toBeInTheDocument();

    // Switch to slow-node immediate cutover (0/100)
    fireEvent.click(screen.getByRole("button", { name: "慢节点故障紧急切流" }));
    expect(screen.getByText("本地权重 0%")).toBeInTheDocument();
    expect(screen.getByText("目标节点 100%")).toBeInTheDocument();

    // Adjust slider to 35% -> switches to custom 35/65
    const slider = screen.getByLabelText("本地保留权重百分比");
    fireEvent.change(slider, { target: { value: "35" } });
    expect(screen.getByText("本地权重 35%")).toBeInTheDocument();
    expect(screen.getByText("目标节点 65%")).toBeInTheDocument();

    // Override target address and check Playbook YAML tab
    const addressInput = screen.getByLabelText("目标节点地址覆盖 (IP:Port)");
    fireEvent.change(addressInput, { target: { value: "203.0.113.10:443" } });

    fireEvent.click(screen.getByRole("tab", { name: "Playbook Role 变量 YAML" }));
    expect(screen.getByText(/haproxy_xhttp_local_weight: 35/)).toBeInTheDocument();
    expect(screen.getByText(/address: "203\.0\.113\.10:443"/)).toBeInTheDocument();

    // Switch to Fluxgate tab
    fireEvent.click(screen.getByRole("tab", { name: "Fluxgate v0.3.0 蜂群联动指令" }));
    const tabpanel = screen.getByRole("tabpanel");
    expect(tabpanel).toHaveTextContent("fluxgate swarm status");
    expect(tabpanel).toHaveTextContent("fluxgate swarm drain");

    // Copy command and verify clipboard + log entry
    fireEvent.click(screen.getByRole("button", { name: "复制指令" }));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalled(),
    );
    expect(screen.getByText(/已复制「Fluxgate 蜂群联动指令」/)).toBeInTheDocument();
  });

  it("tracks interactive checklist progress and records local operation logs", async () => {
    renderPage();
    await screen.findByText("基准节点模板模式");

    expect(screen.getByText("0/5")).toBeInTheDocument();
    const firstCheckbox = screen.getByLabelText(/1\. 备份当前配置/);
    fireEvent.click(firstCheckbox);

    expect(screen.getByText("1/5")).toBeInTheDocument();
    expect(screen.getByText(/已完成检查项：1\. 备份当前配置/)).toBeInTheDocument();
  });
});
