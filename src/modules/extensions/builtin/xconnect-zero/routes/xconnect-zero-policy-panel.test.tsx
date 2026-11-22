import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  evaluateXConnectZeroPolicyDraft,
  type XConnectZeroDevice,
  type XConnectZeroNetwork,
  type XConnectZeroPolicyArtifact,
} from "@lib/xconnectZero";
import XConnectZeroPolicyPanel from "./xconnect-zero-policy-panel";

const sampleNetwork: XConnectZeroNetwork = {
  id: "net-uat",
  display_name: "UAT Mesh",
  cidr: "10.77.0.0/24",
  gateway_id: "gw-1",
  gateway_endpoint_host: "gw.uat.example",
  gateway_endpoint_port: 51820,
  transport_server_name: "gw.uat.example",
  transport_port: 443,
  config_generation: 3,
  connection_mode: "wg_vless_l3",
};

const sampleDevices: XConnectZeroDevice[] = [
  {
    id: "gw-1",
    network_id: "net-uat",
    role: "gateway",
    name: "UAT Gateway",
    platform: "linux",
    hostname: "gw-uat",
    wireguard_address: "10.77.0.1/32",
    status: "active",
    connection_status: "recent_ack",
    applied_generation: 3,
  },
  {
    id: "one-1",
    network_id: "net-uat",
    role: "one",
    name: "MacBook One",
    platform: "darwin",
    hostname: "macbook-one",
    wireguard_address: "10.77.0.2/32",
    status: "active",
    connection_status: "recent_ack",
  },
  {
    id: "one-2",
    network_id: "net-uat",
    role: "one",
    name: "Linux Worker",
    platform: "linux",
    hostname: "linux-worker",
    wireguard_address: "10.77.0.3/32",
    status: "active",
    connection_status: "recent_ack",
  },
];

const initialPolicy: XConnectZeroPolicyArtifact = {
  schema_version: 1,
  compiler_version: "1",
  network_id: "net-uat",
  revision: 3,
  default_action: "deny",
  protected_flows: ["control:gateway-heartbeat"],
  rules: [
    {
      id: "allow-ssh-gw",
      action: "allow",
      source_devices: ["one-1"],
      destination_devices: ["gw-1"],
      protocols: ["tcp"],
      ports: [22],
    },
  ],
};

describe("evaluateXConnectZeroPolicyDraft", () => {
  it("evaluates first-match-wins, protocol normalization, ports, and dynamic device IPs", () => {
    const policy: XConnectZeroPolicyArtifact = {
      schema_version: 1,
      compiler_version: "1",
      network_id: "net-uat",
      revision: 5,
      default_action: "deny",
      protected_flows: [],
      rules: [
        {
          id: "deny-worker-ssh",
          action: "deny",
          source_devices: ["one-2"],
          destination_devices: ["gw-1"],
          protocols: ["tcp"],
          ports: [22],
        },
        {
          id: "empty-proto-ports-443",
          action: "allow",
          source_devices: ["*"],
          destination_devices: ["gw-1"],
          protocols: [],
          ports: [443],
        },
        {
          id: "allow-icmp",
          action: "allow",
          source_devices: ["*"],
          destination_devices: ["*"],
          protocols: ["icmp"],
          ports: [],
        },
        {
          id: "empty-proto-empty-ports",
          action: "allow",
          source_devices: ["one-1"],
          destination_devices: ["one-2"],
          protocols: [],
          ports: [],
        },
      ],
    };

    const sshDenied = evaluateXConnectZeroPolicyDraft(
      policy,
      {
        source_device_id: "one-2",
        destination_device_id: "gw-1",
        protocol: "tcp",
        port: 22,
      },
      sampleDevices,
    );
    expect(sshDenied).toMatchObject({
      decision: "deny",
      matched_rule_id: "deny-worker-ssh",
      matched_rule_index: 0,
      source_address: "10.77.0.3/32",
      destination_address: "10.77.0.1/32",
    });

    const implicitTcpUdp = evaluateXConnectZeroPolicyDraft(
      policy,
      {
        source_device_id: "one-1",
        destination_device_id: "gw-1",
        protocol: "udp",
        port: 443,
      },
      sampleDevices,
    );
    expect(implicitTcpUdp).toMatchObject({
      decision: "allow",
      matched_rule_id: "empty-proto-ports-443",
      matched_rule_index: 1,
    });

    const icmpAllowed = evaluateXConnectZeroPolicyDraft(
      policy,
      {
        source_device_id: "one-2",
        destination_device_id: "gw-1",
        protocol: "icmp",
      },
      sampleDevices,
    );
    expect(icmpAllowed).toMatchObject({
      decision: "allow",
      matched_rule_id: "allow-icmp",
      matched_rule_index: 2,
    });

    const icmpWithPortSkipped = evaluateXConnectZeroPolicyDraft(
      policy,
      {
        source_device_id: "one-2",
        destination_device_id: "gw-1",
        protocol: "icmp",
        port: 80,
      },
      sampleDevices,
    );
    expect(icmpWithPortSkipped.decision).toBe("deny");
    expect(icmpWithPortSkipped.matched_rule_id).toBeUndefined();
    expect(icmpWithPortSkipped.matched_rule_index).toBeUndefined();

    const implicitAll = evaluateXConnectZeroPolicyDraft(
      policy,
      {
        source_device_id: "one-1",
        destination_device_id: "one-2",
        protocol: "tcp",
        port: 8080,
      },
      sampleDevices,
    );
    expect(implicitAll).toMatchObject({
      decision: "allow",
      matched_rule_id: "empty-proto-empty-ports",
      matched_rule_index: 3,
      source_address: "10.77.0.2/32",
      destination_address: "10.77.0.3/32",
    });

    const explicitAllPolicy: XConnectZeroPolicyArtifact = {
      ...policy,
      rules: [
        {
          id: "allow-all",
          action: "allow",
          source_devices: ["one-1"],
          destination_devices: ["gw-1"],
          protocols: ["all"],
          ports: [],
        },
      ],
    };
    expect(
      evaluateXConnectZeroPolicyDraft(
        explicitAllPolicy,
        {
          source_device_id: "one-1",
          destination_device_id: "gw-1",
          protocol: "udp",
          port: 51820,
        },
        sampleDevices,
      ),
    ).toMatchObject({
      decision: "allow",
      matched_rule_id: "allow-all",
      matched_rule_index: 0,
    });
  });
});

describe("XConnectZeroPolicyPanel", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads policy, toggles default action, adds device-ID rule without raw IPs, and saves via PUT", async () => {
    const savedResponse: XConnectZeroPolicyArtifact = {
      schema_version: 1,
      compiler_version: "1",
      network_id: "net-uat",
      revision: 4,
      default_action: "allow",
      protected_flows: ["control:gateway-heartbeat"],
      rules: [
        initialPolicy.rules[0],
        {
          id: "allow-web-to-gw",
          action: "allow",
          source_devices: ["one-2"],
          destination_devices: ["gw-1"],
          protocols: ["tcp"],
          ports: [80, 443],
        },
      ],
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/networks/net-uat/policy") && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify(initialPolicy), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/networks/net-uat/policy") && init?.method === "PUT") {
        return new Response(JSON.stringify(savedResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const onPolicySaved = vi.fn();
    const user = userEvent.setup();

    render(
      <XConnectZeroPolicyPanel
        zh
        writeReady
        activeNetwork={sampleNetwork}
        networks={[sampleNetwork]}
        devices={sampleDevices}
        onSelectNetwork={vi.fn()}
        onPolicySaved={onPolicySaved}
      />,
    );

    expect(await screen.findByText("Rev #3")).toBeInTheDocument();
    expect(screen.getByText(/已同步/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("allow-ssh-gw")).toBeInTheDocument();

    // Toggle default action to allow
    const allowRadio = screen.getByRole("radio", { name: /默认允许 \/ 全互联/ });
    await user.click(allowRadio);
    expect(allowRadio).toBeChecked();
    expect(screen.getByText("有未保存修改")).toBeInTheDocument();

    // Add a new rule selecting devices by "name · wireguard_address"
    await user.click(screen.getByRole("button", { name: "添加规则" }));
    const newRuleCard = screen.getByTestId("policy-rule-1");

    const ruleIdInput = within(newRuleCard).getByLabelText("规则 #2 ID");
    await user.clear(ruleIdInput);
    await user.type(ruleIdInput, "allow-web-to-gw");

    const sourceGroup = within(newRuleCard).getByRole("group", {
      name: "源设备 (Source)",
    });
    await user.click(
      within(sourceGroup).getByRole("checkbox", {
        name: "Linux Worker · 10.77.0.3/32",
      }),
    );

    const destGroup = within(newRuleCard).getByRole("group", {
      name: "目标设备 (Destination)",
    });
    await user.click(
      within(destGroup).getByRole("checkbox", {
        name: "UAT Gateway · 10.77.0.1/32",
      }),
    );

    const protoGroup = within(newRuleCard).getByRole("group", {
      name: "协议 (Protocols)",
    });
    // Check icmp-only disables ports CSV, then switch to tcp
    const icmpCheckbox = within(protoGroup).getByRole("checkbox", {
      name: "icmp",
    });
    const tcpCheckbox = within(protoGroup).getByRole("checkbox", {
      name: "tcp",
    });
    const portsInput = within(newRuleCard).getByLabelText("规则 #2 端口 (CSV)");

    await user.click(icmpCheckbox);
    expect(portsInput).toBeDisabled();
    await user.click(icmpCheckbox);
    await user.click(tcpCheckbox);
    expect(portsInput).toBeEnabled();
    await user.type(portsInput, "80, 443");

    // Save via PUT and verify device IDs (NEVER raw IPs) are persisted
    await user.click(screen.getByRole("button", { name: "保存并下发策略" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/xconnect-zero/networks/net-uat/policy",
        expect.objectContaining({ method: "PUT" }),
      ),
    );

    const putCall = fetchMock.mock.calls.find(
      ([u, init]) => u === "/api/xconnect-zero/networks/net-uat/policy" && init?.method === "PUT",
    );
    const putBody = JSON.parse(String(putCall?.[1]?.body)) as XConnectZeroPolicyArtifact;
    expect(putBody.default_action).toBe("allow");
    expect(putBody.rules[1]).toEqual({
      id: "allow-web-to-gw",
      action: "allow",
      source_devices: ["one-2"],
      destination_devices: ["gw-1"],
      protocols: ["tcp"],
      ports: [80, 443],
    });
    expect(JSON.stringify(putBody)).not.toContain("10.77.0.");
    expect(JSON.stringify(putBody)).not.toContain("10.66.0.");

    expect(onPolicySaved).toHaveBeenCalledWith(savedResponse);
    expect(
      await screen.findByText(/策略已保存并下发（Rev #4）/),
    ).toBeInTheDocument();
  });

  it("shows pending convergence badge when config_generation exceeds applied_generation and supports quick ICMP template", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ...initialPolicy, revision: 4 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <XConnectZeroPolicyPanel
        zh
        writeReady
        activeNetwork={{ ...sampleNetwork, config_generation: 4 }}
        networks={[{ ...sampleNetwork, config_generation: 4 }]}
        devices={sampleDevices}
        onSelectNetwork={vi.fn()}
        onPolicySaved={vi.fn()}
      />,
    );

    expect(await screen.findByText("Rev #4")).toBeInTheDocument();
    expect(screen.getByText(/待网关收敛/)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "允许全部节点 Ping (ICMP)" }),
    );
    expect(screen.getByDisplayValue("allow-all-icmp")).toBeInTheDocument();

    // Clicking twice stays idempotent
    await user.click(
      screen.getByRole("button", { name: "允许全部节点 Ping (ICMP)" }),
    );
    expect(screen.getAllByDisplayValue("allow-all-icmp")).toHaveLength(1);
  });

  it("runs Policy Explain via backend when clean and falls back to local draft on 404 or unsaved edits", async () => {
    let explainCallCount = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/networks/net-uat/policy")) {
        return new Response(JSON.stringify(initialPolicy), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/networks/net-uat/policy/explain") && init?.method === "POST") {
        explainCallCount += 1;
        if (explainCallCount === 1) {
          return new Response(
            JSON.stringify({
              network_id: "net-uat",
              revision: 3,
              default_action: "deny",
              decision: "allow",
              matched_rule_id: "allow-ssh-gw",
              matched_rule_index: 0,
              reason: "matched allow-ssh-gw",
              source_address: "10.77.0.2/32",
              destination_address: "10.77.0.1/32",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ error: "not_found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <XConnectZeroPolicyPanel
        zh
        writeReady
        activeNetwork={sampleNetwork}
        networks={[sampleNetwork]}
        devices={sampleDevices}
        onSelectNetwork={vi.fn()}
        onPolicySaved={vi.fn()}
      />,
    );

    await screen.findByDisplayValue("allow-ssh-gw");

    await user.selectOptions(screen.getByLabelText("模拟源设备"), "one-1");
    await user.selectOptions(screen.getByLabelText("模拟目标设备"), "gw-1");
    await user.selectOptions(screen.getByLabelText("模拟协议"), "tcp");
    await user.type(screen.getByLabelText("模拟端口（可选）"), "22");

    // 1) Control-plane explain response
    await user.click(screen.getByRole("button", { name: "模拟检测" }));
    const controlPlaneBadge = await screen.findByText("控制面裁决");
    const resultCard = controlPlaneBadge.closest("div")!.parentElement!;
    expect(within(resultCard).getByText("ALLOW")).toBeInTheDocument();
    expect(
      within(resultCard).getByText("matched allow-ssh-gw"),
    ).toBeInTheDocument();
    expect(
      within(resultCard).getByText(/MacBook One · 10\.77\.0\.2\/32/),
    ).toBeInTheDocument();
    expect(
      within(resultCard).getByText(/UAT Gateway · 10\.77\.0\.1\/32/),
    ).toBeInTheDocument();

    // 2) Backend 404 triggers clean fallback to evaluateXConnectZeroPolicyDraft
    await user.selectOptions(screen.getByLabelText("模拟协议"), "icmp");
    await user.click(screen.getByRole("button", { name: "模拟检测" }));
    expect(await screen.findByText("本地草稿预演")).toBeInTheDocument();
    expect(screen.getByText("DENY")).toBeInTheDocument();

    // 3) Unsaved draft edit evaluates locally without hitting backend
    const callsBeforeDraft = fetchMock.mock.calls.length;
    await user.click(
      screen.getByRole("button", { name: "允许全部节点 Ping (ICMP)" }),
    );
    await user.click(screen.getByRole("button", { name: "模拟检测" }));
    expect(await screen.findByText("ALLOW")).toBeInTheDocument();
    expect(screen.getByText("本地草稿预演")).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBe(callsBeforeDraft);
  });

  it("supports reordering, deleting, resetting, and client-side validation before PUT", async () => {
    const twoRulesPolicy: XConnectZeroPolicyArtifact = {
      ...initialPolicy,
      rules: [
        initialPolicy.rules[0],
        {
          id: "allow-icmp",
          action: "allow",
          source_devices: ["*"],
          destination_devices: ["*"],
          protocols: ["icmp"],
          ports: [],
        },
      ],
    };
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify(twoRulesPolicy), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <XConnectZeroPolicyPanel
        zh
        writeReady
        activeNetwork={sampleNetwork}
        networks={[sampleNetwork]}
        devices={sampleDevices}
        onSelectNetwork={vi.fn()}
        onPolicySaved={vi.fn()}
      />,
    );

    await screen.findByDisplayValue("allow-icmp");

    // Move second rule up so it becomes rule #1
    await user.click(screen.getByRole("button", { name: "上移规则 #2" }));
    expect(
      within(screen.getByTestId("policy-rule-0")).getByLabelText("规则 #1 ID"),
    ).toHaveValue("allow-icmp");

    // Reset changes restores original order
    await user.click(screen.getByRole("button", { name: "重置修改" }));
    expect(
      within(screen.getByTestId("policy-rule-0")).getByLabelText("规则 #1 ID"),
    ).toHaveValue("allow-ssh-gw");

    // Invalid ports trigger client-side validation error without PUT
    const rule0Ports = within(screen.getByTestId("policy-rule-0")).getByLabelText(
      "规则 #1 端口 (CSV)",
    );
    await user.clear(rule0Ports);
    await user.type(rule0Ports, "99999");
    await user.click(screen.getByRole("button", { name: "保存并下发策略" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("端口格式无效");
    expect(
      fetchMock.mock.calls.some(
        (call) => (call[1] as RequestInit | undefined)?.method === "PUT",
      ),
    ).toBe(false);

    // Delete second rule
    await user.click(screen.getByRole("button", { name: "删除规则 #2" }));
    expect(screen.queryByDisplayValue("allow-icmp")).not.toBeInTheDocument();
  });
});
