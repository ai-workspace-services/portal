"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileKey2,
  KeyRound,
  Loader2,
  MonitorSmartphone,
  Network,
  Plus,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Breadcrumbs from "@/app/panel/components/Breadcrumbs";
import { useLanguage } from "@i18n/LanguageProvider";
import {
  isXConnectZeroAdminOverview,
  xconnectNodeStatusLabel,
  xconnectRoleStatusLabel,
  type XConnectZeroAdminOverview,
  type XConnectZeroAdapterErrorResponse,
  type XConnectZeroDevice,
  type XConnectZeroInvite,
  type XConnectZeroNetwork,
} from "@lib/xconnectZero";

type Page = "overview" | "join" | "configuration";
type NodeRole = "gateway" | "one";
type Platform = "linux" | "darwin" | "windows";
type InvitationTtl = 15 | 30 | 60;
type ConnectionModeId = "wg_udp_l3" | "wg_vless_l3" | "wg_vless_l2";
type ResourceState = "loading" | "ready" | "error" | "unavailable";
type State =
  | { kind: "loading" }
  | { kind: "available"; overview: XConnectZeroAdminOverview }
  | { kind: "unavailable" }
  | { kind: "error"; code?: string };
type Resources = {
  networks: XConnectZeroNetwork[];
  devices: XConnectZeroDevice[];
  invites: XConnectZeroInvite[];
};

const modes: Array<{
  id: ConnectionModeId;
  icon: typeof SlidersHorizontal;
  name: { zh: string; en: string };
  technology: string;
  description: { zh: string; en: string };
  recommended?: boolean;
  linuxGatewayOnly?: boolean;
}> = [
  {
    id: "wg_udp_l3",
    icon: SlidersHorizontal,
    name: { zh: "高性能直连", en: "High-performance direct" },
    technology: "WireGuard UDP / L3",
    description: {
      zh: "纯三层 VPN，直接使用 WireGuard UDP；延迟最低、吞吐最高，需要网络允许 UDP 51820。",
      en: "A pure L3 VPN using WireGuard UDP directly for the lowest latency and highest throughput; requires UDP 51820 access.",
    },
  },
  {
    id: "wg_vless_l3",
    icon: ShieldCheck,
    name: { zh: "抗干扰连接", en: "Resilient connection" },
    technology: "WireGuard over VLESS / L3",
    description: {
      zh: "通过 VLESS/TLS/XUDP 封装 WireGuard；适合 UDP 受限或容易受到干扰的网络。",
      en: "Wraps WireGuard with VLESS/TLS/XUDP for networks where UDP is restricted or easily disrupted.",
    },
    recommended: true,
  },
  {
    id: "wg_vless_l2",
    icon: Network,
    name: { zh: "二层互联", en: "Layer 2 interconnect" },
    technology: "WireGuard over VLESS / L2-MAC",
    description: {
      zh: "在安全隧道上扩展二层网络；支持 MAC、ARP 和广播，仅限 Linux Gateway。",
      en: "Extends Layer 2 networking over the secure tunnel with MAC, ARP and broadcast support; Linux Gateways only.",
    },
    linuxGatewayOnly: true,
  },
];

function bootstrapTemplate(role: NodeRole): string {
  return JSON.stringify(
    {
      network: {
        id: "",
        display_name: "",
        cidr: "10.77.0.0/24",
        gateway_id: "",
        gateway_wireguard_public_key: "",
        gateway_wireguard_address: "10.77.0.1/32",
        gateway_endpoint_host: "",
        gateway_endpoint_port: 51820,
        transport_server_name: "",
        transport_port: 443,
        transport_auth_id: "",
      },
      invite: {
        platform: "linux",
        role,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    },
    null,
    2,
  );
}

function errorCode(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || !("error" in value))
    return undefined;
  const error = (value as { error?: unknown }).error;
  return typeof error === "string" && /^[a-z0-9_-]{1,64}$/.test(error)
    ? error
    : undefined;
}

async function getOverview(): Promise<State> {
  try {
    const response = await fetch("/api/xconnect-zero/overview", {
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as
      | XConnectZeroAdminOverview
      | XConnectZeroAdapterErrorResponse
      | null;
    if (
      response.status === 503 ||
      (body && "error" in body && body.error === "control_plane_unavailable")
    )
      return { kind: "unavailable" };
    return response.ok && isXConnectZeroAdminOverview(body)
      ? { kind: "available", overview: body }
      : { kind: "error", code: errorCode(body) };
  } catch {
    return { kind: "error" };
  }
}

async function getResources(): Promise<Resources> {
  const responses = await Promise.all(
    ["networks", "devices", "invites"].map(async (name) => {
      const response = await fetch(`/api/xconnect-zero/${name}`, {
        cache: "no-store",
      });
      if (!response.ok) throw Error();
      return response.json();
    }),
  );
  return {
    networks: responses[0].networks ?? [],
    devices: responses[1].devices ?? [],
    invites: responses[2].invites ?? [],
  };
}

function Button({
  children,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`tactile-button ${primary ? "tactile-button-primary" : "tactile-button-soft"} px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

function Frame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <h2 className="border-b border-[color:var(--color-divider)] px-5 py-4 text-base font-semibold text-[var(--color-heading)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  icon: Icon,
  title,
  detail,
  value,
  onClick,
  disabled = false,
}: {
  icon: typeof SlidersHorizontal;
  title: string;
  detail: string;
  value: string | number;
  onClick?: () => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick || disabled}
      className="flex w-full items-center gap-3 border-b border-[color:var(--color-divider)] px-5 py-4 text-left last:border-0 enabled:hover:bg-[var(--color-surface-hover)] disabled:cursor-default"
    >
      <span className="rounded-[8px] bg-[var(--color-primary-muted)] p-2 text-[var(--color-primary)]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-sm text-[var(--color-heading)]">{title}</b>
        <small className="block text-xs text-[var(--color-text-subtle)]">
          {detail}
        </small>
      </span>
      <span className="text-sm font-semibold text-[var(--color-heading)]">
        {value}
      </span>
      {onClick ? (
        <ChevronRight className="h-4 w-4 text-[var(--color-primary)]" />
      ) : null}
    </button>
  );
}

function Telemetry({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}): JSX.Element {
  return (
    <section className="rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[color:var(--color-divider)] px-5 py-4">
        <h2 className="text-base font-semibold text-[var(--color-heading)]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
          {description}
        </p>
      </div>
      <div
        className={`flex items-center justify-center text-sm text-[var(--color-text-muted)] ${compact ? "h-32" : "h-52"}`}
      >
        暂无数据
      </div>
    </section>
  );
}

function revoked(device: XConnectZeroDevice): boolean {
  return device.status === "revoked" || device.connection_status === "revoked";
}

export default function XConnectZeroNodeManagement(): JSX.Element {
  const { language } = useLanguage();
  const zh = language === "zh";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [resourceState, setResourceState] = useState<ResourceState>("loading");
  const [resourceData, setResourceData] = useState<Resources | null>(null);
  const [page, setPage] = useState<Page>("overview");
  const [role, setRole] = useState<NodeRole>("gateway");
  const [platform, setPlatform] = useState<Platform>("linux");
  const [networkId, setNetworkId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [ttl, setTtl] = useState<InvitationTtl>(15);
  const [bootstrapJson, setBootstrapJson] = useState(() =>
    bootstrapTemplate("gateway"),
  );
  const [joinUri, setJoinUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [invitePending, setInvitePending] = useState(false);
  const [bootstrapPending, setBootstrapPending] = useState(false);
  const [revokePending, setRevokePending] = useState(false);
  const [mutationPending, setMutationPending] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<XConnectZeroDevice | null>(
    null,
  );
  const [roleFilter, setRoleFilter] = useState<"all" | NodeRole>("all");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
  const [connectionMode] = useState<ConnectionModeId>("wg_vless_l3");

  const networks = resourceData?.networks ?? [];
  const selectedNetwork = networks.find((network) => network.id === networkId);
  const devices = useMemo(() => resourceData?.devices ?? [], [resourceData]);
  const controlPlaneAvailable = state.kind === "available";
  const writeReady =
    controlPlaneAvailable &&
    resourceState === "ready" &&
    resourceData !== null &&
    !mutationPending;
  const overview = controlPlaneAvailable ? state.overview : null;
  const oneCount = overview
    ? (overview.oneCount ??
      Math.max(overview.deviceCount - overview.gatewayCount, 0))
    : "—";
  const gatewayStatus = overview
    ? (overview.gatewayStatus ??
      (overview.gatewayCount ? "active" : "not_configured"))
    : undefined;
  const oneStatus = overview
    ? (overview.oneStatus ??
      (oneCount !== "—" && oneCount > 0 ? "active" : "not_configured"))
    : undefined;
  const ackCount = devices.filter(
    (device) => device.connection_status === "recent_ack",
  ).length;
  const filteredDevices = useMemo(
    () =>
      devices.filter(
        (device) =>
          (roleFilter === "all" || device.role === roleFilter) &&
          (networkFilter === "all" || device.network_id === networkFilter) &&
          (platformFilter === "all" || device.platform === platformFilter),
      ),
    [devices, networkFilter, platformFilter, roleFilter],
  );

  const refresh = useCallback(async (): Promise<void> => {
    setState({ kind: "loading" });
    setResourceState("loading");
    setResourceData(null);
    setError(null);
    const nextState = await getOverview();
    setState(nextState);
    setCheckedAt(new Date());
    if (nextState.kind !== "available") {
      setResourceState(
        nextState.kind === "unavailable" ? "unavailable" : "error",
      );
      return;
    }
    try {
      setResourceData(await getResources());
      setResourceState("ready");
    } catch {
      setResourceState("error");
      setError(zh ? "加载资源失败" : "Failed to load resources");
    }
  }, [zh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const chooseRole = (nextRole: NodeRole): void => {
    if (mutationPending) return;
    setRole(nextRole);
    setPlatform("linux");
    setDeviceId(
      nextRole === "gateway" ? (selectedNetwork?.gateway_id ?? "") : "",
    );
    setBootstrapJson(bootstrapTemplate(nextRole));
    setJoinUri(null);
    setError(null);
    setPage("join");
  };

  const changeNetwork = (nextNetworkId: string): void => {
    setNetworkId(nextNetworkId);
    if (role === "gateway") {
      setDeviceId(
        networks.find((network) => network.id === nextNetworkId)?.gateway_id ??
          "",
      );
    }
    setJoinUri(null);
  };

  const changePlatform = (nextPlatform: Platform): void => {
    setPlatform(nextPlatform);
    setJoinUri(null);
  };

  const changeDeviceId = (nextDeviceId: string): void => {
    setDeviceId(nextDeviceId);
    setJoinUri(null);
  };

  const changeTtl = (nextTtl: InvitationTtl): void => {
    setTtl(nextTtl);
    setJoinUri(null);
  };

  const issueInvite = async (): Promise<void> => {
    setJoinUri(null);
    setError(null);
    const network = networks.find((item) => item.id === networkId);
    if (!writeReady) return;
    if (!network) {
      setError(zh ? "请选择一个已授权网络" : "Select an authorized network");
      return;
    }
    const trimmedDeviceId = (
      role === "gateway" ? network.gateway_id : deviceId
    ).trim();
    if (!trimmedDeviceId) {
      setError(zh ? "设备 ID 不能为空" : "Device ID is required");
      return;
    }
    if (role === "gateway" && platform !== "linux") {
      setError(zh ? "Gateway 仅支持 Linux" : "Gateways only support Linux");
      return;
    }
    if (role === "gateway" && !network.gateway_id.trim()) {
      setError(
        zh
          ? "所选网络没有可用的 Gateway ID"
          : "The selected network has no Gateway ID",
      );
      return;
    }
    setInvitePending(true);
    setMutationPending(true);
    try {
      const response = await fetch("/api/xconnect-zero/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network_id: network.id,
          device_id: trimmedDeviceId,
          platform,
          role,
          expires_at: new Date(Date.now() + ttl * 60 * 1000).toISOString(),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.join_uri) throw Error();
      setJoinUri(body.join_uri);
      setResourceData(await getResources());
      setResourceState("ready");
    } catch {
      setError(zh ? "签发设备邀请失败" : "Failed to issue device invitation");
    } finally {
      setInvitePending(false);
      setMutationPending(false);
    }
  };

  const submitBootstrap = async (): Promise<void> => {
    setJoinUri(null);
    setError(null);
    if (!writeReady) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(bootstrapJson) as unknown;
    } catch {
      setError(
        zh
          ? "高级 bootstrap JSON 格式无效"
          : "The advanced bootstrap JSON is invalid",
      );
      return;
    }
    const isRecord = (value: unknown): value is Record<string, unknown> =>
      Boolean(value) && typeof value === "object" && !Array.isArray(value);
    const root = isRecord(parsed) ? parsed : null;
    const invite = root && isRecord(root.invite) ? root.invite : null;
    const network = root && isRecord(root.network) ? root.network : null;
    const expiresAt = invite?.expires_at;
    const expiresTimestamp =
      typeof expiresAt === "string" ? Date.parse(expiresAt) : NaN;
    const requiredNetworkFields = [
      "id",
      "display_name",
      "cidr",
      "gateway_id",
      "gateway_wireguard_public_key",
      "gateway_wireguard_address",
      "gateway_endpoint_host",
      "transport_server_name",
      "transport_auth_id",
    ];
    const hasRequiredNetworkFields = Boolean(
      network &&
      requiredNetworkFields.every(
        (field) => typeof network[field] === "string" && network[field].trim(),
      ),
    );
    if (
      !root ||
      !invite ||
      !network ||
      !hasRequiredNetworkFields ||
      bootstrapJson.includes("REPLACE") ||
      bootstrapJson.includes("2030") ||
      invite.role !== role ||
      invite.platform !== "linux" ||
      !Number.isFinite(expiresTimestamp) ||
      expiresTimestamp <= Date.now() ||
      expiresTimestamp > Date.now() + 60 * 60 * 1000
    ) {
      setError(
        zh
          ? "bootstrap 只允许短期有效值；请完成本机 init 后再提交。"
          : "Bootstrap values must be short-lived; complete local init before submitting.",
      );
      return;
    }
    setBootstrapPending(true);
    setMutationPending(true);
    try {
      const response = await fetch("/api/xconnect-zero/networks/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bootstrapJson,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw Error();
      setJoinUri(body?.join_uri ?? null);
      setResourceData(await getResources());
      setResourceState("ready");
    } catch {
      setError(
        zh
          ? "创建网络或邀请失败"
          : "Failed to create the network or invitation",
      );
    } finally {
      setBootstrapPending(false);
      setMutationPending(false);
    }
  };

  const confirmRevoke = async (): Promise<void> => {
    if (!revokeTarget || revoked(revokeTarget) || !writeReady) return;
    setRevokePending(true);
    setMutationPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/xconnect-zero/devices/${encodeURIComponent(revokeTarget.id)}/revoke`,
        { method: "POST" },
      );
      if (!response.ok) throw Error();
      setRevokeTarget(null);
      setResourceData(await getResources());
      setResourceState("ready");
    } catch {
      setError(zh ? "撤销节点失败" : "Failed to revoke node");
    } finally {
      setRevokePending(false);
      setMutationPending(false);
    }
  };

  const status =
    state.kind === "loading"
      ? zh
        ? "检测中"
        : "Checking"
      : controlPlaneAvailable
        ? zh
          ? "控制面可用"
          : "Control plane available"
        : zh
          ? "连接异常"
          : "Connection issue";
  const syncValue =
    resourceState === "ready"
      ? ackCount
        ? `${ackCount} ${zh ? "个 ACK" : "ACKs"}`
        : zh
          ? "暂无 ACK"
          : "No ACK yet"
      : zh
        ? "等待加载"
        : "Waiting for load";
  const selectedMode = modes.find((mode) => mode.id === connectionMode);
  const resourceMessage =
    resourceState === "loading"
      ? zh
        ? "正在加载节点资源…"
        : "Loading node resources…"
      : resourceState === "error"
        ? zh
          ? "节点资源加载失败，请重新检测。"
          : "Node resources failed to load. Check again."
        : resourceState === "unavailable"
          ? zh
            ? "控制面不可用，暂不能读取节点。"
            : "The control plane is unavailable; nodes cannot be read."
          : devices.length === 0
            ? zh
              ? "暂无已加入节点。"
              : "No joined nodes yet."
            : filteredDevices.length === 0
              ? zh
                ? "没有符合当前筛选条件的节点。"
                : "No nodes match the current filters."
              : null;

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/panel" },
          { label: "XConnect Zero", href: "/panel/xconnect-zero" },
        ]}
      />
      <header className="border-b border-[color:var(--color-divider)]">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--color-heading)]">
                XConnect Zero
              </h1>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${controlPlaneAvailable ? "bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]" : "bg-[var(--color-danger-muted)] text-[var(--color-danger-foreground)]"}`}
              >
                {status}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-subtle)]">
              {zh
                ? "使用 Zero Trust 管理私有网络、Gateway 与 One 节点。"
                : "Manage private networks, Gateways and One nodes with Zero Trust."}
            </p>
            <small className="text-[var(--color-text-muted)]">
              {zh ? "上次检测" : "Last checked"}:{" "}
              {checkedAt?.toLocaleString() ?? "—"}
            </small>
          </div>
          <Button
            primary
            onClick={() => void refresh()}
            disabled={state.kind === "loading"}
          >
            <RefreshCw
              className={`h-4 w-4 ${state.kind === "loading" ? "animate-spin" : ""}`}
            />
            {zh ? "重新检测" : "Check again"}
          </Button>
        </div>
        <nav className="-mb-px flex gap-7">
          {(
            [
              ["overview", zh ? "Zero 概览" : "Zero overview"],
              ["join", zh ? "节点管理" : "Node management"],
              ["configuration", zh ? "配置管理" : "Configuration"],
            ] as [Page, string][]
          ).map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setPage(key)}
              className={`border-b-2 px-1 pb-3 text-sm font-semibold ${page === key ? "border-[color:var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[var(--color-text-muted)]"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {page === "overview" ? (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <Frame title={zh ? "账户运行状况" : "Account health"}>
              <Row
                icon={SlidersHorizontal}
                title={zh ? "控制面连接" : "Control-plane connection"}
                detail="accounts /api/overlay/v1/admin/overview"
                value={status}
                onClick={() => setPage("configuration")}
              />
              <Row
                icon={Server}
                title={zh ? "Gateway 节点" : "Gateway nodes"}
                detail={`${zh ? "受控中继与安全连接" : "Governed relay and secure connection"} · ${xconnectRoleStatusLabel(gatewayStatus, zh)}`}
                value={overview?.gatewayCount ?? "—"}
                onClick={() => chooseRole("gateway")}
                disabled={mutationPending}
              />
              <Row
                icon={MonitorSmartphone}
                title={zh ? "One 节点" : "One nodes"}
                detail={`${zh ? "受策略保护的设备" : "Policy-protected devices"} · ${xconnectRoleStatusLabel(oneStatus, zh)}`}
                value={oneCount}
                onClick={() => chooseRole("one")}
                disabled={mutationPending}
              />
              <Row
                icon={ClipboardCheck}
                title={zh ? "配置同步" : "Configuration sync"}
                detail={
                  zh
                    ? "仅按已加载设备的配置 ACK 统计"
                    : "Derived only from loaded device config ACKs"
                }
                value={syncValue}
                onClick={() => setPage("configuration")}
              />
            </Frame>
            <Frame title={zh ? "可执行操作" : "Actions"}>
              <Row
                icon={RefreshCw}
                title={zh ? "重新检测" : "Check again"}
                detail={
                  zh
                    ? "检查控制面与节点资源"
                    : "Check control plane and node resources"
                }
                value=""
                onClick={() => void refresh()}
              />
              <Row
                icon={SlidersHorizontal}
                title={zh ? "查看接入配置" : "View integration settings"}
                detail="accounts"
                value=""
                onClick={() => setPage("configuration")}
              />
            </Frame>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Telemetry
              title="SASE 流量分析"
              description="按 Internet 与专用网络细分的数据传输"
            />
            <Telemetry
              title="已连接用户"
              description="通过应用程序或设备客户端连接的用户"
            />
            <Telemetry
              title="热门专用应用程序"
              description="按用户统计的热门专用应用程序"
              compact
            />
            <Telemetry
              title="热门用户"
              description="按数据传输量统计"
              compact
            />
          </div>
        </div>
      ) : null}

      {page === "join" ? (
        <div className="space-y-5">
          <Frame title={zh ? "安全加入节点" : "Join nodes securely"}>
            <div className="grid md:grid-cols-2">
              <Row
                icon={Server}
                title={zh ? "加入 Gateway · Linux" : "Join a Gateway · Linux"}
                detail={
                  zh
                    ? "Gateway 角色固定使用 Linux"
                    : "Gateway role is fixed to Linux"
                }
                value={role === "gateway" ? (zh ? "当前角色" : "Selected") : ""}
                onClick={() => chooseRole("gateway")}
                disabled={mutationPending}
              />
              <Row
                icon={MonitorSmartphone}
                title={zh ? "加入 One 节点" : "Join a One node"}
                detail={
                  zh
                    ? "One 可选择 Linux、macOS 或 Windows"
                    : "One supports Linux, macOS or Windows"
                }
                value={role === "one" ? (zh ? "当前角色" : "Selected") : ""}
                onClick={() => chooseRole("one")}
                disabled={mutationPending}
              />
            </div>
          </Frame>
          <Frame title={zh ? "签发节点邀请" : "Issue a node invitation"}>
            <div className="p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <fieldset>
                  <legend className="text-sm font-semibold text-[var(--color-heading)]">
                    {zh ? "角色" : "Role"}
                  </legend>
                  <div className="mt-2 flex gap-2">
                    {(["gateway", "one"] as NodeRole[]).map((item) => (
                      <label
                        key={item}
                        className="flex items-center gap-2 rounded border border-[color:var(--color-surface-border)] px-3 py-2 text-sm"
                      >
                        <input
                          type="radio"
                          name="xconnect-invite-role"
                          checked={role === item}
                          onChange={() => chooseRole(item)}
                          disabled={!writeReady}
                        />
                        {item === "gateway" ? "Gateway" : "One"}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label
                    htmlFor="xconnect-network"
                    className="text-sm font-semibold text-[var(--color-heading)]"
                  >
                    {zh ? "已授权网络" : "Authorized network"}
                  </label>
                  <select
                    id="xconnect-network"
                    value={networkId}
                    onChange={(event) => changeNetwork(event.target.value)}
                    disabled={!writeReady}
                    className="mt-2 w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <option value="">
                      {zh ? "请选择网络" : "Select a network"}
                    </option>
                    {networks.map((network) => (
                      <option key={network.id} value={network.id}>
                        {network.display_name} · {network.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="xconnect-device-id"
                    className="text-sm font-semibold text-[var(--color-heading)]"
                  >
                    {zh ? "设备 ID" : "Device ID"}
                  </label>
                  <input
                    id="xconnect-device-id"
                    value={
                      role === "gateway"
                        ? (selectedNetwork?.gateway_id ?? "")
                        : deviceId
                    }
                    onChange={
                      role === "one"
                        ? (event) => changeDeviceId(event.target.value)
                        : undefined
                    }
                    readOnly={role === "gateway"}
                    placeholder={
                      role === "gateway" ? "linux-gateway-01" : "one-device-01"
                    }
                    disabled={!writeReady}
                    className="mt-2 w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm disabled:opacity-50"
                  />
                  <small className="mt-1 block text-xs text-[var(--color-text-muted)]">
                    {role === "gateway"
                      ? zh
                        ? "Gateway ID 绑定所选网络 gateway_id，只读。"
                        : "Gateway ID is bound read-only to the selected network gateway_id."
                      : zh
                        ? "One ID 独立于网络 Gateway ID。"
                        : "One ID is independent of the network Gateway ID."}
                  </small>
                </div>
                <fieldset>
                  <legend className="text-sm font-semibold text-[var(--color-heading)]">
                    {zh ? "平台" : "Platform"}
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(role === "gateway"
                      ? ["linux"]
                      : ["linux", "darwin", "windows"]
                    ).map((item) => (
                      <label
                        key={item}
                        className="flex items-center gap-2 rounded border border-[color:var(--color-surface-border)] px-3 py-2 text-sm"
                      >
                        <input
                          type="radio"
                          name="xconnect-invite-platform"
                          value={item}
                          checked={platform === item}
                          onChange={() => changePlatform(item as Platform)}
                          disabled={!writeReady || role === "gateway"}
                        />
                        {item === "darwin"
                          ? "macOS"
                          : item === "windows"
                            ? "Windows"
                            : "Linux"}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="md:col-span-2">
                  <legend className="text-sm font-semibold text-[var(--color-heading)]">
                    {zh ? "有效期" : "Validity"}
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {([15, 30, 60] as InvitationTtl[]).map((minutes) => (
                      <label
                        key={minutes}
                        className="flex items-center gap-2 rounded border border-[color:var(--color-surface-border)] px-3 py-2 text-sm"
                      >
                        <input
                          type="radio"
                          name="xconnect-invite-ttl"
                          value={minutes}
                          checked={ttl === minutes}
                          onChange={() => changeTtl(minutes)}
                          disabled={!writeReady}
                        />
                        {minutes} {zh ? "分钟" : "minutes"}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              <p className="mt-4 text-xs text-[var(--color-text-muted)]">
                {zh
                  ? "普通加入只签发当前已授权网络的短时邀请，不会重新初始化网络。"
                  : "A normal join only issues a short-lived invite for the selected authorized network; it does not bootstrap a network."}
              </p>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {zh
                  ? role === "gateway"
                    ? "操作顺序：diagnose → init（本机生成公钥）→ 登记网络/签发 Gateway 邀请 → join → up。身份与密钥仅由本机和控制面处理。"
                    : "操作顺序：join（无 init 命令，直接应用运行时）→ sync/status/diagnose；down 保留控制面登记。请勿把邀请 URI 拼接到命令或日志。"
                  : role === "gateway"
                    ? "Order: diagnose → init (generate the local public key) → register network / issue Gateway invite → join → up. Identity and keys stay with the host and control plane."
                    : "Order: join (no init command; applies runtime directly) → sync/status/diagnose; down keeps the control-plane registration. Do not put the invite URI in commands or logs."}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Button
                  primary
                  onClick={() => void issueInvite()}
                  disabled={
                    !writeReady || networks.length === 0 || invitePending
                  }
                >
                  {invitePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {invitePending
                    ? zh
                      ? "签发中…"
                      : "Issuing…"
                    : zh
                      ? "签发设备邀请"
                      : "Issue device invitation"}
                </Button>
                {!writeReady ? (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {zh
                      ? "资源加载完成后可写入"
                      : "Writes unlock after resources load"}
                  </span>
                ) : null}
              </div>
            </div>
          </Frame>
          <Frame
            title={
              zh ? "新网络初始化（高级）" : "New network bootstrap (advanced)"
            }
          >
            <details>
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--color-heading)]">
                {zh
                  ? "查看并提交 bootstrap JSON"
                  : "View and submit bootstrap JSON"}
              </summary>
              <div className="border-t border-[color:var(--color-divider)] p-5">
                <p className="text-sm text-[var(--color-text-muted)]">
                  {zh
                    ? `模板当前按 ${role === "gateway" ? "Gateway / Linux" : "One / Linux"} 角色生成，15 分钟后过期。Gateway 必须先在本机 init 生成公钥，再补全字段提交。`
                    : `Template is generated for ${role === "gateway" ? "Gateway / Linux" : "One / Linux"} and expires in 15 minutes. A Gateway must run local init to generate its public key before submission.`}
                </p>
                <textarea
                  aria-label={
                    zh ? "高级 bootstrap JSON" : "Advanced bootstrap JSON"
                  }
                  value={bootstrapJson}
                  onChange={(event) => setBootstrapJson(event.target.value)}
                  disabled={!writeReady || bootstrapPending}
                  className="mt-4 min-h-64 w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 p-3 font-mono text-xs disabled:opacity-50"
                />
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    primary
                    onClick={() => void submitBootstrap()}
                    disabled={!writeReady || bootstrapPending}
                  >
                    {bootstrapPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {bootstrapPending
                      ? zh
                        ? "提交中…"
                        : "Submitting…"
                      : zh
                        ? "提交网络初始化"
                        : "Submit network bootstrap"}
                  </Button>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {zh
                      ? "仅使用现有 bootstrap API"
                      : "Uses the existing bootstrap API only"}
                  </span>
                </div>
              </div>
            </details>
          </Frame>
          {joinUri ? (
            <Frame
              title={
                zh
                  ? "一次性邀请（仅本次页面显示）"
                  : "One-time invitation (shown once on this page)"
              }
            >
              <code className="block break-all p-5 text-xs">{joinUri}</code>
            </Frame>
          ) : null}
          <Frame title={zh ? "已加入节点" : "Joined nodes"}>
            <div className="grid gap-3 border-b border-[color:var(--color-divider)] p-5 md:grid-cols-3">
              <label className="text-xs font-semibold text-[var(--color-text-muted)]">
                {zh ? "角色筛选" : "Role filter"}
                <select
                  aria-label={zh ? "角色筛选" : "Role filter"}
                  value={roleFilter}
                  onChange={(event) =>
                    setRoleFilter(event.target.value as "all" | NodeRole)
                  }
                  className="mt-1 block w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-2 py-2 text-sm font-normal text-[var(--color-heading)]"
                >
                  <option value="all">{zh ? "全部角色" : "All roles"}</option>
                  <option value="gateway">Gateway</option>
                  <option value="one">One</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-[var(--color-text-muted)]">
                {zh ? "网络筛选" : "Network filter"}
                <select
                  aria-label={zh ? "网络筛选" : "Network filter"}
                  value={networkFilter}
                  onChange={(event) => setNetworkFilter(event.target.value)}
                  className="mt-1 block w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-2 py-2 text-sm font-normal text-[var(--color-heading)]"
                >
                  <option value="all">
                    {zh ? "所有已授权网络" : "All authorized networks"}
                  </option>
                  {networks.map((network) => (
                    <option key={network.id} value={network.id}>
                      {network.display_name} · {network.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-[var(--color-text-muted)]">
                {zh ? "平台筛选" : "Platform filter"}
                <select
                  aria-label={zh ? "平台筛选" : "Platform filter"}
                  value={platformFilter}
                  onChange={(event) =>
                    setPlatformFilter(event.target.value as "all" | Platform)
                  }
                  className="mt-1 block w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-2 py-2 text-sm font-normal text-[var(--color-heading)]"
                >
                  <option value="all">
                    {zh ? "全部平台" : "All platforms"}
                  </option>
                  <option value="linux">Linux</option>
                  <option value="darwin">macOS</option>
                  <option value="windows">Windows</option>
                </select>
              </label>
            </div>
            {resourceMessage ? (
              <p className="p-5 text-sm text-[var(--color-text-muted)]">
                {resourceMessage}
              </p>
            ) : (
              filteredDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-3 border-b border-[color:var(--color-divider)] px-5 py-4 last:border-0"
                >
                  <MonitorSmartphone className="h-4 w-4 text-[var(--color-primary)]" />
                  <span className="min-w-0 flex-1">
                    <b className="block text-sm">{device.name || device.id}</b>
                    <small className="block text-xs text-[var(--color-text-subtle)]">
                      {device.role === "gateway" ? "Gateway" : "One"} ·{" "}
                      {device.network_id} · {device.platform} ·{" "}
                      {device.wireguard_address} ·{" "}
                      {xconnectNodeStatusLabel(device, zh)}
                      {device.last_seen_at &&
                      !Number.isNaN(Date.parse(device.last_seen_at))
                        ? ` · ${zh ? "上次配置确认" : "Last config ACK"}: ${new Date(device.last_seen_at).toLocaleString(zh ? "zh-CN" : "en-US")}`
                        : ""}
                    </small>
                  </span>
                  {revoked(device) ? (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {zh ? "已撤销" : "Revoked"}
                    </span>
                  ) : (
                    <Button
                      onClick={() => setRevokeTarget(device)}
                      disabled={!writeReady}
                    >
                      {zh ? "撤销" : "Revoke"}
                    </Button>
                  )}
                </div>
              ))
            )}
          </Frame>
        </div>
      ) : null}

      {page === "configuration" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <Frame
              title={
                zh
                  ? "Gateway / One 互联网络模式"
                  : "Gateway / One connection mode"
              }
            >
              <div className="p-5">
                <p className="text-sm text-[var(--color-text-subtle)]">
                  {zh
                    ? "当前模式展示保留；控制面下发接口尚未接入，因此暂不可切换。"
                    : "The current mode cards remain visible; switching is disabled until the control-plane dispatch API is available."}
                </p>
                <fieldset className="mt-4 grid gap-3 lg:grid-cols-3">
                  <legend className="sr-only">
                    {zh ? "选择互联网络模式" : "Select a connection mode"}
                  </legend>
                  {modes.map((mode) => {
                    const Icon = mode.icon;
                    const selected = connectionMode === mode.id;
                    return (
                      <label
                        key={mode.id}
                        aria-disabled="true"
                        className={`relative flex cursor-not-allowed flex-col rounded-[var(--radius-lg)] border p-4 opacity-75 ${selected ? "border-[color:var(--color-primary)] bg-[var(--color-primary-muted)]/35 ring-1 ring-[color:var(--color-primary)]" : "border-[color:var(--color-surface-border)]"}`}
                      >
                        <input
                          type="radio"
                          name="xconnect-connection-mode"
                          value={mode.id}
                          checked={selected}
                          disabled
                          aria-label={zh ? mode.name.zh : mode.name.en}
                          className="sr-only"
                        />
                        <span className="flex items-start justify-between gap-3">
                          <span
                            className={`rounded-[8px] p-2 ${selected ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-primary-muted)] text-[var(--color-primary)]"}`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="flex flex-wrap justify-end gap-1.5">
                            {mode.recommended ? (
                              <span className="rounded-full bg-[var(--color-success-muted)] px-2 py-1 text-[11px] font-semibold text-[var(--color-success-foreground)]">
                                {zh ? "推荐 · 默认" : "Recommended · Default"}
                              </span>
                            ) : null}
                            {mode.linuxGatewayOnly ? (
                              <span className="rounded-full bg-[var(--color-warning-muted)] px-2 py-1 text-[11px] font-semibold text-[var(--color-warning-foreground)]">
                                {zh ? "仅 Linux Gateway" : "Linux Gateway only"}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span className="mt-4 text-sm font-semibold text-[var(--color-heading)]">
                          {zh ? mode.name.zh : mode.name.en}
                        </span>
                        <span className="mt-1 text-xs font-medium text-[var(--color-primary)]">
                          {mode.technology}
                        </span>
                        <span className="mt-3 flex-1 text-xs leading-5 text-[var(--color-text-subtle)]">
                          {zh ? mode.description.zh : mode.description.en}
                        </span>
                        <code className="mt-4 w-fit rounded bg-[var(--color-surface-muted)] px-2 py-1 text-[11px] text-[var(--color-text-muted)]">
                          {mode.id}
                        </code>
                      </label>
                    );
                  })}
                </fieldset>
                <div
                  aria-live="polite"
                  className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)]/60 px-4 py-3 text-sm text-[var(--color-text-subtle)]"
                >
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-success-foreground)]" />
                  <span>
                    {zh
                      ? "默认预设（非实际下发状态）"
                      : "Default preset (not a dispatch status)"}
                    :
                  </span>
                  <strong className="text-[var(--color-heading)]">
                    {zh ? selectedMode?.name.zh : selectedMode?.name.en}
                  </strong>
                  <code className="text-xs">{connectionMode}</code>
                  <span className="ml-auto text-xs text-[var(--color-text-muted)]">
                    {zh
                      ? "未下发 · 切换暂不可用"
                      : "Not dispatched · switching unavailable"}
                  </span>
                </div>
              </div>
            </Frame>
          </div>
          <Frame title={zh ? "VPC 与私有网络" : "VPC and private networks"}>
            <Row
              icon={Network}
              title={zh ? "网络与 CIDR" : "Network and CIDR"}
              detail={networks[0]?.display_name ?? "—"}
              value={networks[0]?.cidr ?? "—"}
            />
            <Row
              icon={Server}
              title={zh ? "Gateway 节点" : "Gateway nodes"}
              detail={zh ? "网络绑定" : "Network binding"}
              value={overview?.gatewayCount ?? "—"}
            />
          </Frame>
          <Frame title={zh ? "IP 分配" : "IP allocation"}>
            <Row
              icon={SlidersHorizontal}
              title={zh ? "地址池" : "Address pool"}
              detail={zh ? "地址池与节点分配" : "Address pool and assignments"}
              value={networks[0]?.cidr ?? "—"}
            />
          </Frame>
          <Frame title={zh ? "WG 与签名证书" : "WG and signing certificates"}>
            <Row
              icon={FileKey2}
              title={zh ? "Ed25519 签名状态" : "Ed25519 signing status"}
              detail={
                zh
                  ? "状态由控制面读取；Portal 不提供证书重置。"
                  : "Read from the control plane; Portal does not offer certificate reset."
              }
              value={zh ? "只读" : "Read-only"}
            />
          </Frame>
          <Frame title={zh ? "节点 UUID" : "Node UUID"}>
            {devices.length ? (
              devices.map((device) => (
                <Row
                  key={device.id}
                  icon={KeyRound}
                  title={device.name || device.id}
                  detail={`${device.network_id} · ${device.role === "gateway" ? "Gateway" : "One"} · ${device.platform}`}
                  value={device.id}
                />
              ))
            ) : (
              <Row
                icon={KeyRound}
                title="UUID"
                detail={
                  zh
                    ? "已加载节点的只读 UUID 会随节点显示"
                    : "Read-only UUIDs appear with loaded nodes"
                }
                value="—"
              />
            )}
          </Frame>
          {state.kind !== "available" || resourceState !== "ready" ? (
            <div className="lg:col-span-2 flex gap-2 rounded border border-[color:var(--color-warning-muted)] bg-[var(--color-warning-muted)]/40 p-4 text-sm">
              <AlertCircle className="h-4 w-4" />
              {state.kind === "loading" || resourceState === "loading"
                ? zh
                  ? "正在加载控制面与实时资源，写操作暂禁用。"
                  : "Loading control-plane and live resources; writes are disabled."
                : zh
                  ? "控制面或资源不可用，写操作暂禁用。"
                  : "The control plane or resources are unavailable; writes are disabled."}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded border border-[color:var(--color-warning-muted)] p-3 text-sm"
        >
          {error}
        </p>
      ) : null}
      <AlertDialog.Root
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !revokePending) setRevokeTarget(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)]">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="float-right"
                disabled={revokePending}
              >
                <X className="h-4 w-4" />
              </button>
            </AlertDialog.Cancel>
            <ShieldAlert className="h-6 w-6 text-[var(--color-danger-foreground)]" />
            <AlertDialog.Title className="mt-3 text-xl font-semibold">
              {zh ? "撤销此节点？" : "Revoke this node?"}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-[var(--color-text-muted)]">
              {zh
                ? `节点 ${revokeTarget?.name || revokeTarget?.id || "—"} 将不能继续使用当前加入凭据。`
                : `Node ${revokeTarget?.name || revokeTarget?.id || "—"} will no longer use its current enrollment.`}
            </AlertDialog.Description>
            {error ? (
              <p
                role="alert"
                className="mt-3 rounded border border-[color:var(--color-warning-muted)] p-2 text-sm"
              >
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Cancel
                className="tactile-button tactile-button-soft"
                disabled={revokePending}
              >
                {zh ? "取消" : "Cancel"}
              </AlertDialog.Cancel>
              <button
                type="button"
                onClick={() => void confirmRevoke()}
                disabled={revokePending || !writeReady}
                className="tactile-button tactile-button-primary disabled:opacity-50"
              >
                {revokePending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {revokePending
                  ? zh
                    ? "撤销中…"
                    : "Revoking…"
                  : zh
                    ? "确认撤销"
                    : "Confirm revoke"}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
