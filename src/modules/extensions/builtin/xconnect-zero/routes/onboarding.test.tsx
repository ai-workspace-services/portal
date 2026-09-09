import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import XConnectZeroOverviewRoute from "./overview";

vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));
vi.mock("@/app/panel/components/Breadcrumbs", () => ({
  default: () => <nav>Dashboard</nav>,
}));

const overview = {
  status: "available",
  networkCount: 2,
  deviceCount: 1,
  gatewayCount: 1,
  oneCount: 0,
  gatewayStatus: "active",
  oneStatus: "not_configured",
};
const networks = {
  networks: [
    {
      id: "net-a",
      display_name: "UAT A",
      cidr: "10.77.0.0/24",
      gateway_id: "gw-a",
      gateway_endpoint_host: "gw.uat.example",
      gateway_endpoint_port: 51820,
      transport_server_name: "gw.uat.example",
      transport_port: 443,
    },
    {
      id: "net-b",
      display_name: "UAT B",
      cidr: "10.78.0.0/24",
      gateway_id: "gw-b",
      gateway_endpoint_host: "gw-b.uat.example",
      gateway_endpoint_port: 51820,
      transport_server_name: "gw-b.uat.example",
      transport_port: 443,
    },
  ],
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installApi(options?: {
  inviteResponse?: Promise<Response> | Response;
  revokeResponse?: Response;
  registrationResponse?: Response | Promise<Response>;
  registrationLoadResponse?: Response;
  registrations?: unknown[];
  devices?: unknown[];
}) {
  let devices = options?.devices ?? [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/overview")) return response(overview);
    if (url.endsWith("/networks")) return response(networks);
    if (url.endsWith("/devices")) return response({ devices });
    if (url.endsWith("/registrations") && init?.method !== "POST")
      return (
        options?.registrationLoadResponse ??
        response({ registrations: options?.registrations ?? [] })
      );
    if (url.includes("/registrations/") && init?.method === "POST") {
      return (
        options?.registrationResponse ??
        response({ registration: options?.registrations?.[0] ?? {} })
      );
    }
    if (url.endsWith("/invites") && init?.method !== "POST")
      return response({ invites: [] });
    if (url.endsWith("/invites") && init?.method === "POST") {
      return (
        options?.inviteResponse ??
        response({ join_uri: "xconnect://join/one" }, 201)
      );
    }
    if (url.includes("/revoke")) {
      if (options?.revokeResponse && !options.revokeResponse.ok)
        return options.revokeResponse;
      devices = devices.map((device) => ({
        ...(device as object),
        status: "revoked",
        connection_status: "revoked",
      }));
      return new Response(null, { status: 204 });
    }
    return response({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("XConnect Zero onboarding and management", () => {
  it("binds Gateway to Linux and One to all three platforms, with explicit network and short TTL", async () => {
    const fetchMock = installApi();
    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);
    await screen.findByText("XConnect Zero");
    await user.click(screen.getByRole("button", { name: "节点管理" }));
    await user.click(screen.getByRole("button", { name: /加入 One 节点/ }));
    expect(screen.getByRole("radio", { name: "One" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "macOS" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Windows" })).toBeEnabled();
    await user.selectOptions(screen.getByLabelText("已授权网络"), "net-b");
    await user.type(screen.getByLabelText("设备 ID"), "one-win-01");
    await user.click(screen.getByRole("radio", { name: "Windows" }));
    await user.click(screen.getByRole("radio", { name: "30 分钟" }));
    await user.click(screen.getByRole("button", { name: "签发设备邀请" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/xconnect-zero/invites",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const inviteCall = fetchMock.mock.calls.find(
      ([url, init]) => url.endsWith("/invites") && init?.method === "POST",
    );
    const body = JSON.parse(String(inviteCall?.[1]?.body)) as Record<
      string,
      string
    >;
    expect(body).toMatchObject({
      network_id: "net-b",
      device_id: "one-win-01",
      platform: "windows",
      role: "one",
    });
    expect(Object.keys(body).sort()).toEqual([
      "device_id",
      "expires_at",
      "network_id",
      "platform",
      "role",
    ]);
    expect(Date.parse(body.expires_at)).toBeGreaterThan(Date.now());
    expect(Date.parse(body.expires_at)).toBeLessThan(
      Date.now() + 31 * 60 * 1000,
    );
    expect(body).not.toHaveProperty("controller_url");
    expect(await screen.findByText("xconnect://join/one")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /加入 Gateway · Linux/ }),
    );
    expect(screen.getByRole("radio", { name: "Gateway" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Linux" })).toBeDisabled();
    expect(screen.queryByText("xconnect://join/one")).not.toBeInTheDocument();
    await user.click(screen.getByText("查看并提交 bootstrap JSON"));
    const bootstrapText = (
      screen.getByLabelText("高级 bootstrap JSON") as HTMLTextAreaElement
    ).value;
    const bootstrap = JSON.parse(bootstrapText) as {
      network: Record<string, unknown>;
    };
    expect(bootstrap.network.gateway_endpoint_port).toBe(51820);
    expect(bootstrap.network.gateway_wireguard_address).toBe("10.77.0.1/32");
    expect(bootstrap.network.cidr).toBe("10.77.0.0/24");
    expect(bootstrapText).not.toContain("REPLACE");
    expect(bootstrapText).not.toContain("2030");
  });

  it("prevents duplicate invite submits while pending and reports request errors", async () => {
    let resolveInvite!: (value: Response) => void;
    const pendingInvite = new Promise<Response>((resolve) => {
      resolveInvite = resolve;
    });
    const fetchMock = installApi({ inviteResponse: pendingInvite });
    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);
    await screen.findByText("XConnect Zero");
    await user.click(screen.getByRole("button", { name: "节点管理" }));
    await user.selectOptions(screen.getByLabelText("已授权网络"), "net-a");
    await user.type(screen.getByLabelText("设备 ID"), "one-pending");
    const submit = screen.getByRole("button", { name: "签发设备邀请" });
    await user.click(submit);
    await waitFor(() => expect(submit).toBeDisabled());
    expect(screen.getByRole("radio", { name: "One" })).toBeDisabled();
    expect(screen.getByLabelText("已授权网络")).toBeDisabled();
    expect(screen.getByLabelText("设备 ID")).toBeDisabled();
    await user.click(submit);
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) => url.endsWith("/invites") && init?.method === "POST",
      ),
    ).toHaveLength(1);
    resolveInvite(response({ join_uri: "xconnect://join/pending" }, 201));
    expect(
      await screen.findByText("xconnect://join/pending"),
    ).toBeInTheDocument();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith("/overview")) return response(overview);
        if (url.endsWith("/networks")) return response(networks);
        if (url.endsWith("/devices")) return response({ devices: [] });
        if (url.endsWith("/invites") && init?.method === "POST")
          return response({ error: "invalid" }, 422);
        if (url.endsWith("/invites")) return response({ invites: [] });
        return response({}, 404);
      }),
    );
    await user.click(submit);
    expect(await screen.findByText("签发设备邀请失败")).toBeInTheDocument();
  });

  it("binds a Gateway invite ID to the selected network gateway_id across two networks", async () => {
    const fetchMock = installApi();
    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);
    await screen.findByText("XConnect Zero");
    await user.click(screen.getByRole("button", { name: "节点管理" }));
    const network = screen.getByLabelText("已授权网络");
    const gatewayId = screen.getByLabelText("设备 ID");
    await user.selectOptions(network, "net-a");
    expect(gatewayId).toHaveValue("gw-a");
    expect(gatewayId).toHaveAttribute("readonly");
    await user.selectOptions(network, "net-b");
    expect(gatewayId).toHaveValue("gw-b");
    await user.click(screen.getByRole("button", { name: "签发设备邀请" }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => url.endsWith("/invites") && init?.method === "POST",
        ),
      ).toBe(true),
    );
    const inviteCall = fetchMock.mock.calls.find(
      ([url, init]) => url.endsWith("/invites") && init?.method === "POST",
    );
    expect(JSON.parse(String(inviteCall?.[1]?.body))).toMatchObject({
      network_id: "net-b",
      device_id: "gw-b",
      role: "gateway",
      platform: "linux",
    });
  });

  it("shows an expired request but never enables its approval", async () => {
    const fetchMock = installApi({
      registrations: [
        {
          registration_id: "reg-expired",
          network_id: "net-a",
          device_id: "one-expired",
          name: "Expired One",
          hostname: "host",
          platform: "linux",
          status: "pending",
          wireguard_public_key_fingerprint: "public-fingerprint",
          created_at: "2026-01-01T00:00:00Z",
          expires_at: "2026-01-01T00:15:00Z",
        },
      ],
    });
    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);
    await screen.findByText("XConnect Zero");
    await user.click(screen.getByRole("button", { name: "节点管理" }));
    await screen.findByText("Expired One");
    await user.selectOptions(
      screen.getByLabelText("确认所属网络 one-expired"),
      "net-a",
    );
    expect(screen.getByRole("button", { name: "批准" })).toBeDisabled();
    expect(screen.getByText(/到期时间/)).toHaveTextContent("已过期");
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url.includes("/registrations/") && init?.method === "POST",
      ),
    ).toBe(false);
  });

  it("requires explicit same-network confirmation before approving a One registration", async () => {
    const registration = {
      registration_id: "reg-one-1",
      network_id: "net-a",
      device_id: "one-self-01",
      name: "Self registered One",
      hostname: "one-host",
      platform: "darwin",
      status: "pending",
      wireguard_public_key_fingerprint: "SHA256:declared-fingerprint",
      created_at: "2026-09-08T10:00:00Z",
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    const fetchMock = installApi({
      registrations: [registration],
      registrationResponse: response({
        registration: {
          ...registration,
          status: "approved",
          approved_at: "2026-09-08T10:05:00Z",
        },
      }),
    });
    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);
    await screen.findByText("XConnect Zero");
    await user.click(screen.getByRole("button", { name: "节点管理" }));
    expect(await screen.findByText("Self registered One")).toBeInTheDocument();
    expect(screen.getByText(/不是硬件认证/)).toBeInTheDocument();
    const network = screen.getByLabelText("确认所属网络 one-self-01");
    const approve = screen.getByRole("button", { name: "批准" });
    expect(approve).toBeDisabled();
    await user.selectOptions(network, "net-a");
    expect(approve).toBeEnabled();
    await user.click(approve);
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "采用该网络已有策略",
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "自动获取配置并启动 WireGuard/Xray",
    );
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url.includes("/registrations/") && init?.method === "POST",
      ),
    ).toBe(false);
    await user.click(screen.getByRole("button", { name: "确认批准" }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url.endsWith("/registrations/reg-one-1/approve") &&
            init?.method === "POST",
        ),
      ).toBe(true),
    );
    const approval = fetchMock.mock.calls.find(
      ([url, init]) =>
        url.endsWith("/registrations/reg-one-1/approve") &&
        init?.method === "POST",
    );
    expect(JSON.parse(String(approval?.[1]?.body))).toEqual({
      network_id: "net-a",
    });
    expect(
      await screen.findByText("暂无当前所属网络的待确认 One 注册。"),
    ).toBeInTheDocument();
  });

  it("requires confirmation before rejecting a pending One registration", async () => {
    const registration = {
      registration_id: "reg-one-2",
      network_id: "net-b",
      device_id: "one-self-02",
      name: "Rejectable One",
      hostname: "one-host-2",
      platform: "windows",
      status: "pending",
      wireguard_public_key_fingerprint: "SHA256:declared-fingerprint-2",
      created_at: "2026-09-08T10:00:00Z",
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    const fetchMock = installApi({
      registrations: [registration],
      registrationResponse: response({
        registration: { ...registration, status: "rejected" },
      }),
    });
    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);
    await screen.findByText("XConnect Zero");
    await user.click(screen.getByRole("button", { name: "节点管理" }));
    await screen.findByText("Rejectable One");
    await user.selectOptions(
      screen.getByLabelText("确认所属网络 one-self-02"),
      "net-b",
    );
    await user.click(screen.getByRole("button", { name: "拒绝" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "拒绝 one-self-02 的 One 注册申请",
    );
    await user.click(screen.getByRole("button", { name: "确认拒绝" }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url.endsWith("/registrations/reg-one-2/reject") &&
            init?.method === "POST",
        ),
      ).toBe(true),
    );
    const rejection = fetchMock.mock.calls.find(
      ([url, init]) =>
        url.endsWith("/registrations/reg-one-2/reject") &&
        init?.method === "POST",
    );
    expect(rejection?.[1]?.body).toBeUndefined();
  });

  it("disables a registration decision while its request is pending", async () => {
    let resolveApproval!: (value: Response) => void;
    const pendingApproval = new Promise<Response>((resolve) => {
      resolveApproval = resolve;
    });
    const registration = {
      registration_id: "reg-one-pending",
      network_id: "net-a",
      device_id: "one-self-pending",
      name: "Pending One",
      hostname: "pending-host",
      platform: "linux",
      status: "pending",
      wireguard_public_key_fingerprint: "SHA256:pending",
      created_at: "2026-09-08T10:00:00Z",
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    const fetchMock = installApi({
      registrations: [registration],
      registrationResponse: pendingApproval,
    });
    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);
    await screen.findByText("XConnect Zero");
    await user.click(screen.getByRole("button", { name: "节点管理" }));
    await screen.findByText("Pending One");
    await user.selectOptions(
      screen.getByLabelText("确认所属网络 one-self-pending"),
      "net-a",
    );
    await user.click(screen.getByRole("button", { name: "批准" }));
    const confirm = screen.getByRole("button", { name: "确认批准" });
    await user.click(confirm);
    await waitFor(() => expect(confirm).toBeDisabled());
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) =>
          url.endsWith("/registrations/reg-one-pending/approve") &&
          init?.method === "POST",
      ),
    ).toHaveLength(1);
    resolveApproval(
      response({ registration: { ...registration, status: "approved" } }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
  });

  it("keeps a registration rollout failure separate from joined-node data", async () => {
    const fetchMock = installApi({
      devices: [
        {
          id: "one-existing",
          network_id: "net-a",
          role: "one",
          name: "Existing One",
          platform: "linux",
          hostname: "existing-host",
          wireguard_address: "10.77.0.2/32",
          connection_status: "recent_ack",
        },
      ],
      registrationLoadResponse: response(
        { error: "control_plane_unavailable" },
        503,
      ),
    });
    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);
    await screen.findByText("XConnect Zero");
    await user.click(screen.getByRole("button", { name: "节点管理" }));
    expect(
      await screen.findByText(/Accounts 尚未提供待确认 One 注册接口/),
    ).toBeInTheDocument();
    expect(screen.getByText("Existing One")).toBeInTheDocument();
    expect(
      screen.queryByText("暂无当前所属网络的待确认 One 注册。"),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/xconnect-zero/registrations",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("does not treat omitted older registrations as an empty history", async () => {
    const fetchMock = installApi({
      registrationLoadResponse: response({ registrations: [], has_more: true }),
    });
    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);
    await screen.findByText("XConnect Zero");
    await user.click(screen.getByRole("button", { name: "节点管理" }));
    expect(
      await screen.findByText(/最近 100 条记录中暂无当前所属网络/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("暂无当前所属网络的待确认 One 注册。"),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/xconnect-zero/registrations",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("requires confirmation for revocation, skips revoked nodes, and keeps failure visible", async () => {
    const device = {
      id: "one-revoke",
      network_id: "net-a",
      role: "one",
      name: "One revoke",
      platform: "linux",
      hostname: "one-revoke",
      wireguard_address: "10.77.0.2/32",
      status: "active",
      connection_status: "stale",
    };
    const fetchMock = installApi({ devices: [device] });
    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);
    await screen.findByText("XConnect Zero");
    await user.click(screen.getByRole("button", { name: "节点管理" }));
    await user.click(screen.getByRole("button", { name: "撤销" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => url.includes("/revoke") && init?.method === "POST",
      ),
    ).toBe(false);
    await user.click(screen.getByRole("button", { name: "确认撤销" }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => url.includes("/revoke") && init?.method === "POST",
        ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "撤销" }),
      ).not.toBeInTheDocument(),
    );

    cleanup();
    const failingFetch = installApi({
      devices: [device],
      revokeResponse: response({ error: "failed" }, 500),
    });
    render(<XConnectZeroOverviewRoute />);
    await screen.findByText("XConnect Zero");
    await user.click(screen.getByRole("button", { name: "节点管理" }));
    await user.click(screen.getByRole("button", { name: "撤销" }));
    await user.click(screen.getByRole("button", { name: "确认撤销" }));
    await waitFor(() =>
      expect(
        failingFetch.mock.calls.some(
          ([url, init]) => url.includes("/revoke") && init?.method === "POST",
        ),
      ).toBe(true),
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent("撤销节点失败");
  });

  it("rejects the placeholder bootstrap, null JSON, and non-finite expiry without a request", async () => {
    const fetchMock = installApi();
    const user = userEvent.setup();
    render(<XConnectZeroOverviewRoute />);
    await screen.findByText("XConnect Zero");
    await user.click(screen.getByRole("button", { name: "节点管理" }));
    await user.click(screen.getByText("查看并提交 bootstrap JSON"));
    const editor = screen.getByLabelText("高级 bootstrap JSON");
    const submit = screen.getByRole("button", { name: "提交网络初始化" });

    await user.click(submit);
    expect(
      await screen.findByText(
        "bootstrap 只允许短期有效值；请完成本机 init 后再提交。",
      ),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) => url.endsWith("/networks/bootstrap")),
    ).toBe(false);

    await user.clear(editor);
    await user.type(editor, "null");
    await user.click(submit);
    expect(
      await screen.findByText(
        "bootstrap 只允许短期有效值；请完成本机 init 后再提交。",
      ),
    ).toBeInTheDocument();

    await user.clear(editor);
    fireEvent.change(editor, {
      target: {
        value: JSON.stringify({
          network: {
            id: "net-new",
            display_name: "New network",
            cidr: "10.80.0.0/24",
            gateway_id: "gw-new",
            gateway_wireguard_public_key: "public-key",
            gateway_wireguard_address: "10.80.0.1/32",
            gateway_endpoint_host: "gw-new.example",
            transport_server_name: "gw-new.example",
            transport_auth_id: "auth-id",
          },
          invite: {
            role: "gateway",
            platform: "linux",
            expires_at: "not-a-date",
          },
        }),
      },
    });
    await user.click(submit);
    expect(
      await screen.findByText(
        "bootstrap 只允许短期有效值；请完成本机 init 后再提交。",
      ),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) => url.endsWith("/networks/bootstrap")),
    ).toBe(false);
  });
});
