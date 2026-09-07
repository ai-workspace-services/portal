"use client";

import { useEffect, useMemo, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clipboard,
  Copy,
  FileKey2,
  Globe2,
  KeyRound,
  Loader2,
  MonitorSmartphone,
  Network,
  RefreshCw,
  Route,
  Server,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  SlidersHorizontal,
  Unplug,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import Breadcrumbs from "@/app/panel/components/Breadcrumbs";
import Card from "@/app/panel/components/Card";
import { useLanguage } from "@i18n/LanguageProvider";
import {
  isXConnectZeroAdminOverview,
  type XConnectZeroAdapterErrorResponse,
  type XConnectZeroAdminOverview,
  type XConnectZeroDevice,
  type XConnectZeroInvite,
  type XConnectZeroNetwork,
} from "@lib/xconnectZero";

type ViewState =
  | { kind: "loading" }
  | { kind: "available"; overview: XConnectZeroAdminOverview }
  | { kind: "unavailable" }
  | { kind: "forbidden" }
  | { kind: "error" };

type TabKey = "overview" | "nodes" | "ip" | "policies" | "certificates";
type LayerKey = "portal" | "accounts" | "gateways" | "networks" | "devices";
type Tone = "success" | "danger" | "warning" | "muted" | "info";

const CONTROL_PLANE_ENDPOINT = "accounts /api/overlay/v1/admin/overview";

const COPY = {
  en: {
    breadcrumb: "XConnect Zero",
    title: "XConnect Zero",
    subtitle: "The control plane for managed Zero Trust private networks.",
    retry: "Check again",
    checking: "Checking",
    checkedAt: "Last checked",
    connected: "Connected",
    connectionError: "Connection issue",
    unavailable: "Unavailable",
    unknown: "Unknown",
    waiting: "Waiting for sync",
    healthy: "Healthy",
    selected: "Selected",
    viewDetails: "View details",
    sourceNote:
      "accounts is the single control plane for Gateway, One, network, policy and signing configuration.",
    tabs: {
      overview: "Overview",
      nodes: "Nodes",
      ip: "IP allocation",
      policies: "Policies",
      certificates: "Certificates",
    },
    layers: {
      portal: ["Portal WebUI", "Administration entry point"],
      accounts: [
        "accounts control plane",
        "Identity, policy and network source",
      ],
      gateways: ["Gateway nodes", "Relay and secure tunnel"],
      networks: ["Private networks", "Policy and route resources"],
      devices: ["One nodes", "Policy access and tunnel state"],
    },
    inspector: {
      title: "Control plane details",
      summary: "Status summary",
      endpoint: "Connection endpoint",
      resources: "Node summary",
      lastResponse: "Last response",
      viewNodes: "View nodes",
      integration: "View integration settings",
      noResponse: "No successful response",
    },
    events: {
      title: "Recent checks",
      event: "Event",
      target: "Target",
      status: "Status",
      portal: "Portal WebUI is responding",
      accounts: "Control-plane connectivity check",
      sync: "Resource synchronization",
      portalTarget: "Portal runtime",
      accountsTarget: "accounts API",
      syncTarget: "Gateway and One nodes",
      viewAll: "Run diagnostics again",
    },
    operations: {
      title: "Operations",
      gpg: "Reset GPG certificate",
      gpgHint: "Requires a second confirmation",
      ip: "IP allocation",
      ipHint: "Address pools and node assignments",
      uuid: "UUID",
      uuidHint: "Select a node to view its identifier",
      policy: "Policy management",
      policyHint: "Assignment and synchronization state",
      reset: "Reset",
      manage: "Manage",
      viewNodes: "View nodes",
      managePolicies: "Manage policies",
    },
    panels: {
      nodesTitle: "Multi-node management",
      nodesBody:
        "Inspect Gateway and One nodes from the accounts control plane. Node details are never fabricated when the service is unavailable.",
      ipTitle: "IP allocation",
      ipBody:
        "Manage private address pools and assignments after the control plane exposes allocation data.",
      policyTitle: "Policy management",
      policyBody:
        "Review policy assignment and synchronization across networks and nodes.",
      certificateTitle: "Certificate management",
      certificateBody:
        "GPG certificate reset is a sensitive operation and always requires explicit confirmation.",
      gateway: "Gateway nodes",
      one: "One nodes",
      network: "Private networks",
      statusUnavailable:
        "Connect to the control plane to load live data and enable write operations.",
    },
    resetDialog: {
      title: "Reset the GPG certificate?",
      body: "This invalidates the current signing certificate. Connected nodes may need updated signing configuration before the next policy sync.",
      warning:
        "The accounts write API is not exposed by this Portal adapter yet.",
      cancel: "Cancel",
      blocked: "Write API not connected",
    },
    copied: "Copied",
    copy: "Copy",
    unavailableBody:
      "The accounts control plane cannot be reached. Downstream node and resource status is intentionally not shown as live data.",
    forbiddenBody:
      "This account is not authorized to view XConnect Zero administration.",
    errorBody:
      "The control plane could not be reached. Check network access, DNS and the integration configuration, then try again.",
  },
  zh: {
    breadcrumb: "XConnect Zero",
    title: "XConnect Zero",
    subtitle: "管理 Zero Trust 私有网络的中心控面。",
    retry: "重新检测",
    checking: "检测中",
    checkedAt: "上次检测",
    connected: "已连接",
    connectionError: "连接异常",
    unavailable: "不可用",
    unknown: "状态未知",
    waiting: "等待同步",
    healthy: "正常",
    selected: "已选择",
    viewDetails: "查看详情",
    sourceNote:
      "accounts 是 Gateway、One、网络、策略与签名配置的唯一集中控面。",
    tabs: {
      overview: "总览",
      nodes: "节点",
      ip: "IP 分配",
      policies: "策略",
      certificates: "证书",
    },
    layers: {
      portal: ["Portal WebUI", "管理员访问与操作入口"],
      accounts: ["accounts 控面", "统一身份、策略与网络控制面"],
      gateways: ["Gateway 节点", "中转与安全连接建立"],
      networks: ["私有网络", "策略与路由资源"],
      devices: ["One 节点", "策略接入与隧道状态"],
    },
    inspector: {
      title: "控面详情",
      summary: "异常摘要",
      endpoint: "连接端点",
      resources: "节点概览",
      lastResponse: "最后响应",
      viewNodes: "查看节点",
      integration: "查看接入配置",
      noResponse: "暂无成功响应",
    },
    events: {
      title: "最近检测",
      event: "事件",
      target: "对象",
      status: "状态",
      portal: "Portal WebUI 响应正常",
      accounts: "中心控面连接检测",
      sync: "资源同步",
      portalTarget: "Portal 运行时",
      accountsTarget: "accounts API",
      syncTarget: "Gateway 与 One 节点",
      viewAll: "重新运行诊断",
    },
    operations: {
      title: "待处理操作",
      gpg: "GPG 证书重置",
      gpgHint: "需要二次确认",
      ip: "IP 分配",
      ipHint: "地址池与节点分配",
      uuid: "UUID",
      uuidHint: "选择节点后查看标识",
      policy: "策略管理",
      policyHint: "分配与同步状态",
      reset: "重置",
      manage: "管理",
      viewNodes: "查看节点",
      managePolicies: "管理策略",
    },
    panels: {
      nodesTitle: "多节点管理",
      nodesBody:
        "从 accounts 控面查看 Gateway 与 One 节点；服务不可用时不会展示虚构的节点详情。",
      ipTitle: "IP 分配",
      ipBody: "在控面提供分配数据后，统一管理私有地址池与节点地址。",
      policyTitle: "策略管理",
      policyBody: "查看策略在私有网络与多节点之间的分配和同步状态。",
      certificateTitle: "证书管理",
      certificateBody: "GPG 证书重置属于敏感操作，始终需要显式二次确认。",
      gateway: "Gateway 节点",
      one: "One 节点",
      network: "私有网络",
      statusUnavailable: "连接中心控面后加载实时数据并启用写操作。",
    },
    resetDialog: {
      title: "重置 GPG 证书？",
      body: "此操作会使当前签名证书失效；已连接节点可能需要重新获取签名配置，才能继续下一次策略同步。",
      warning: "当前 Portal 适配层尚未开放 accounts 写入 API。",
      cancel: "取消",
      blocked: "写入接口未接入",
    },
    copied: "已复制",
    copy: "复制",
    unavailableBody:
      "当前无法连接 accounts 中心控面，下游节点和资源不会被伪装成实时数据。",
    forbiddenBody: "当前账号没有查看 XConnect Zero 管理面的权限。",
    errorBody: "暂时无法连接中心控面。请检查网络、DNS 与接入配置后重新检测。",
  },
} as const;

const TONE_STYLES: Record<Tone, string> = {
  success:
    "border-[color:var(--color-success-muted)] bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]",
  danger:
    "border-[color:var(--color-danger-muted)] bg-[var(--color-danger-muted)] text-[var(--color-danger-foreground)]",
  warning:
    "border-[color:var(--color-warning-muted)] bg-[var(--color-warning-muted)] text-[var(--color-warning-foreground)]",
  muted:
    "border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
  info: "border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)] text-[var(--color-primary)]",
};

async function loadOverview(): Promise<ViewState> {
  try {
    const response = await fetch("/api/xconnect-zero/overview", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | XConnectZeroAdminOverview
      | XConnectZeroAdapterErrorResponse
      | null;

    if (response.status === 401 || response.status === 403) {
      return { kind: response.status === 403 ? "forbidden" : "error" };
    }
    const adapterError =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error
        : undefined;
    if (
      response.status === 503 ||
      adapterError === "control_plane_unavailable"
    ) {
      return { kind: "unavailable" };
    }
    if (!response.ok || !isXConnectZeroAdminOverview(payload)) {
      return { kind: "error" };
    }
    return { kind: "available", overview: payload };
  } catch {
    return { kind: "error" };
  }
}

type Resources = {
  networks: XConnectZeroNetwork[];
  devices: XConnectZeroDevice[];
  invites: XConnectZeroInvite[];
};

async function loadResources(): Promise<Resources> {
  const [networks, devices, invites] = await Promise.all(
    ["networks", "devices", "invites"].map(async (resource) => {
      const response = await fetch(`/api/xconnect-zero/${resource}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`failed to load ${resource}`);
      return response.json();
    }),
  );
  return {
    networks: networks.networks ?? [],
    devices: devices.devices ?? [],
    invites: invites.invites ?? [],
  };
}

function StatusBadge({
  icon: Icon,
  label,
  tone,
}: {
  icon?: LucideIcon;
  label: string;
  tone: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold ${TONE_STYLES[tone]}`}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

function TopologyNode({
  icon: Icon,
  title,
  description,
  count,
  status,
  tone,
  selected,
  selectedLabel,
  viewDetailsLabel,
  onSelect,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  count?: number;
  status: string;
  tone: Tone;
  selected: boolean;
  selectedLabel: string;
  viewDetailsLabel: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative min-h-52 rounded-[var(--radius-xl)] border bg-[var(--color-surface)] p-4 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${selected ? "border-[color:var(--color-danger)] shadow-[var(--shadow-sm)]" : "border-[color:var(--color-surface-border)] hover:border-[color:var(--color-primary-border)] hover:bg-[var(--color-primary-muted)]/20"}`}
    >
      {typeof count === "number" ? (
        <span className="absolute right-3 top-3 min-w-6 rounded-[6px] bg-[var(--color-surface-muted)] px-1.5 py-1 text-center text-xs font-semibold text-[var(--color-heading)]">
          {count}
        </span>
      ) : null}
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)]/45 text-[var(--color-primary)]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="mt-4 block text-sm font-semibold text-[var(--color-heading)]">
        {title}
      </span>
      <span className="mt-2 block">
        <StatusBadge
          icon={
            tone === "success"
              ? CheckCircle2
              : tone === "danger"
                ? AlertCircle
                : tone === "warning"
                  ? CircleDashed
                  : Unplug
          }
          label={status}
          tone={tone}
        />
      </span>
      <span className="mt-3 block text-xs leading-5 text-[var(--color-text-subtle)]">
        {description}
      </span>
      <span className="absolute bottom-4 left-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] opacity-70 transition group-hover:opacity-100">
        {selected ? <Check className="h-3.5 w-3.5" /> : null}
        {selected ? selectedLabel : viewDetailsLabel}
      </span>
    </button>
  );
}

function SectionFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[color:var(--color-divider)] px-4 py-3">
        <h2 className="text-base font-semibold text-[var(--color-heading)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default function XConnectZeroOverviewRoute() {
  const { language } = useLanguage();
  const copy = COPY[language];
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [resources, setResources] = useState<Resources | null>(null);
  const [bootstrapPayload, setBootstrapPayload] = useState(
    '{\n  "controller_url": "https://accounts-uat.onwalk.net",\n  "network": {\n    "id": "net_uat",\n    "display_name": "UAT private",\n    "cidr": "10.77.0.0/24",\n    "gateway_id": "gw_uat",\n    "gateway_wireguard_public_key": "REPLACE",\n    "gateway_wireguard_address": "10.77.0.1/24",\n    "gateway_endpoint_host": "REPLACE",\n    "gateway_endpoint_port": 443,\n    "transport_server_name": "REPLACE",\n    "transport_port": 443,\n    "transport_auth_id": "REPLACE"\n  },\n  "invite": {\n    "platform": "darwin",\n    "role": "one",\n    "expires_at": "2030-01-01T00:00:00Z"\n  }\n}',
  );
  const [joinURI, setJoinURI] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedLayer, setSelectedLayer] = useState<LayerKey>("accounts");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const refreshAll = () => {
    setState({ kind: "loading" });
    setResources(null);
    setActionError(null);
    void loadOverview().then((nextState) => {
      setState(nextState);
      setLastCheckedAt(new Date());
      if (nextState.kind === "available") {
        void loadResources()
          .then(setResources)
          .catch(() => setActionError("加载资源失败"));
      }
    });
  };

  const refresh = refreshAll;

  useEffect(() => {
    void loadOverview().then((nextState) => {
      setState(nextState);
      setLastCheckedAt(new Date());
      if (nextState.kind === "available") {
        void loadResources()
          .then(setResources)
          .catch(() => setActionError("加载资源失败"));
      }
    });
  }, []);

  const connected = state.kind === "available";
  const loading = state.kind === "loading";
  const overview = state.kind === "available" ? state.overview : null;
  const errorBody =
    state.kind === "forbidden"
      ? copy.forbiddenBody
      : state.kind === "unavailable"
        ? copy.unavailableBody
        : copy.errorBody;

  const formattedCheckedAt = useMemo(() => {
    if (!lastCheckedAt) return "—";
    return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(lastCheckedAt);
  }, [language, lastCheckedAt]);

  const copyToClipboard = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setCopiedKey(null);
    }
  };

  const tabItems: Array<{ key: TabKey; label: string }> = [
    { key: "overview", label: copy.tabs.overview },
    { key: "nodes", label: copy.tabs.nodes },
    { key: "ip", label: copy.tabs.ip },
    { key: "policies", label: copy.tabs.policies },
    { key: "certificates", label: copy.tabs.certificates },
  ];

  const topology: Array<{
    key: LayerKey;
    icon: LucideIcon;
    count?: number;
    tone: Tone;
    status: string;
  }> = [
    { key: "portal", icon: Globe2, tone: "success", status: copy.healthy },
    {
      key: "accounts",
      icon: SlidersHorizontal,
      tone: loading ? "info" : connected ? "success" : "danger",
      status: loading
        ? copy.checking
        : connected
          ? copy.connected
          : copy.connectionError,
    },
    {
      key: "gateways",
      icon: Server,
      count: overview?.gatewayCount,
      tone: connected ? "success" : "warning",
      status: connected ? copy.connected : copy.waiting,
    },
    {
      key: "networks",
      icon: Network,
      count: overview?.networkCount,
      tone: connected ? "success" : "muted",
      status: connected ? copy.connected : copy.unknown,
    },
    {
      key: "devices",
      icon: MonitorSmartphone,
      count: overview?.deviceCount,
      tone: connected ? "success" : "muted",
      status: connected ? copy.connected : copy.unknown,
    },
  ];

  const selectedTopology = topology.find((item) => item.key === selectedLayer)!;
  const selectedCopy = copy.layers[selectedLayer];

  const revokeDevice = async (deviceID: string) => {
    setActionError(null);
    const response = await fetch(
      `/api/xconnect-zero/devices/${encodeURIComponent(deviceID)}/revoke`,
      { method: "POST" },
    );
    if (!response.ok) {
      setActionError("撤销设备失败");
      return;
    }
    const next = await loadResources();
    setResources(next);
  };

  const bootstrap = async () => {
    setActionError(null);
    setJoinURI(null);
    let payload: unknown;
    try {
      payload = JSON.parse(bootstrapPayload);
    } catch {
      setActionError("Bootstrap JSON 格式无效");
      return;
    }
    const response = await fetch("/api/xconnect-zero/networks/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setActionError("创建网络或邀请失败");
      return;
    }
    setJoinURI(result.join_uri ?? null);
    setResources(await loadResources());
  };

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/panel" },
          { label: copy.breadcrumb, href: "/panel/xconnect-zero" },
        ]}
      />

      <header className="flex flex-col gap-3 border-b border-[color:var(--color-divider)] pb-0 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[var(--color-heading)]">
              {copy.title}
            </h1>
            <StatusBadge
              icon={loading ? Loader2 : connected ? ShieldCheck : ShieldAlert}
              label={
                loading
                  ? copy.checking
                  : connected
                    ? copy.connected
                    : copy.connectionError
              }
              tone={loading ? "info" : connected ? "success" : "danger"}
            />
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-subtle)]">
            {copy.subtitle}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {copy.checkedAt}: {formattedCheckedAt}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="tactile-button tactile-button-primary px-4 text-sm"
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {copy.retry}
        </button>
        <nav
          className="order-last -mb-px flex w-full gap-6 overflow-x-auto sm:basis-full"
          aria-label="XConnect Zero"
        >
          {tabItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              aria-current={activeTab === item.key ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 pt-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${activeTab === item.key ? "border-[color:var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-heading)]"}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === "overview" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)]/35 px-4 py-3 text-sm text-[var(--color-text)]">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]"
                  aria-hidden="true"
                />
                <p>{copy.sourceNote}</p>
              </div>
              <div className="grid gap-2.5 md:grid-cols-3 xl:grid-cols-5">
                {topology.map((item, index) => (
                  <div key={item.key} className="relative">
                    <TopologyNode
                      icon={item.icon}
                      title={copy.layers[item.key][0]}
                      description={copy.layers[item.key][1]}
                      count={item.count}
                      status={item.status}
                      tone={item.tone}
                      selected={selectedLayer === item.key}
                      selectedLabel={copy.selected}
                      viewDetailsLabel={copy.viewDetails}
                      onSelect={() => setSelectedLayer(item.key)}
                    />
                    {index < topology.length - 1 ? (
                      <span
                        className="pointer-events-none absolute -right-2 top-24 z-10 hidden h-px w-4 bg-[var(--color-surface-border-strong)] xl:block"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
                <StatusBadge
                  icon={CheckCircle2}
                  label={copy.healthy}
                  tone="success"
                />
                <StatusBadge
                  icon={AlertCircle}
                  label={copy.connectionError}
                  tone="danger"
                />
                <StatusBadge
                  icon={CircleDashed}
                  label={copy.waiting}
                  tone="warning"
                />
                <StatusBadge icon={Unplug} label={copy.unknown} tone="muted" />
              </div>
            </div>

            <aside className="rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
              <div className="flex items-start justify-between gap-3 border-b border-[color:var(--color-divider)] pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
                    {copy.inspector.title}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-[var(--color-heading)]">
                    {selectedCopy[0]}
                  </h2>
                </div>
                <StatusBadge
                  icon={selectedTopology.icon}
                  label={selectedTopology.status}
                  tone={selectedTopology.tone}
                />
              </div>
              <dl className="divide-y divide-[var(--color-divider)] text-sm">
                <div className="py-3">
                  <dt className="text-xs font-semibold text-[var(--color-text-muted)]">
                    {copy.inspector.summary}
                  </dt>
                  <dd className="mt-1.5 leading-5 text-[var(--color-text)]">
                    {selectedLayer === "accounts" && !connected
                      ? errorBody
                      : selectedCopy[1]}
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-xs font-semibold text-[var(--color-text-muted)]">
                    {copy.inspector.endpoint}
                  </dt>
                  <dd className="mt-2 flex items-center gap-2 rounded-[6px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-2.5 py-2 font-mono text-xs text-[var(--color-text-muted)]">
                    <span className="min-w-0 flex-1 break-all">
                      {CONTROL_PLANE_ENDPOINT}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(CONTROL_PLANE_ENDPOINT, "endpoint")
                      }
                      className="shrink-0 rounded p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      aria-label={copy.copy}
                    >
                      {copiedKey === "endpoint" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-xs font-semibold text-[var(--color-text-muted)]">
                    {copy.inspector.resources}
                  </dt>
                  <dd className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <span>{copy.panels.gateway}</span>
                    <strong className="text-right text-[var(--color-heading)]">
                      {overview?.gatewayCount ?? "—"}
                    </strong>
                    <span>{copy.panels.one}</span>
                    <strong className="text-right text-[var(--color-heading)]">
                      {overview?.deviceCount ?? "—"}
                    </strong>
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-xs font-semibold text-[var(--color-text-muted)]">
                    {copy.inspector.lastResponse}
                  </dt>
                  <dd className="mt-1.5 text-[var(--color-text)]">
                    {connected ? formattedCheckedAt : copy.inspector.noResponse}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("nodes")}
                  className="tactile-button tactile-button-soft w-full"
                >
                  {copy.inspector.viewNodes}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("certificates")}
                  className="tactile-button tactile-button-subtle w-full text-[var(--color-primary)]"
                >
                  {copy.inspector.integration}
                </button>
              </div>
            </aside>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionFrame title={copy.events.title}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-xs">
                  <thead className="bg-[var(--color-surface-muted)]/65 text-[var(--color-text-muted)]">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">
                        {copy.events.event}
                      </th>
                      <th className="px-4 py-2.5 font-semibold">
                        {copy.events.target}
                      </th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        {copy.events.status}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-divider)]">
                    <tr>
                      <td className="px-4 py-3 text-[var(--color-text)]">
                        {copy.events.portal}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {copy.events.portalTarget}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge label={copy.healthy} tone="success" />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-[var(--color-text)]">
                        {copy.events.accounts}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {copy.events.accountsTarget}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge
                          label={
                            loading
                              ? copy.checking
                              : connected
                                ? copy.connected
                                : copy.connectionError
                          }
                          tone={
                            loading ? "info" : connected ? "success" : "danger"
                          }
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-[var(--color-text)]">
                        {copy.events.sync}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {copy.events.syncTarget}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge
                          label={connected ? copy.connected : copy.waiting}
                          tone={connected ? "success" : "warning"}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={refresh}
                className="flex w-full items-center justify-center gap-1 border-t border-[color:var(--color-divider)] px-4 py-3 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-muted)]/25"
              >
                {copy.events.viewAll}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </SectionFrame>

            <SectionFrame title={copy.operations.title}>
              <div className="divide-y divide-[var(--color-divider)]">
                <OperationRow
                  icon={ShieldAlert}
                  title={copy.operations.gpg}
                  hint={copy.operations.gpgHint}
                  tone="danger"
                  action={copy.operations.reset}
                  onAction={() => setResetOpen(true)}
                />
                <OperationRow
                  icon={Route}
                  title={copy.operations.ip}
                  hint={copy.operations.ipHint}
                  tone="info"
                  action={copy.operations.manage}
                  onAction={() => setActiveTab("ip")}
                />
                <OperationRow
                  icon={KeyRound}
                  title={copy.operations.uuid}
                  hint={copy.operations.uuidHint}
                  tone="muted"
                  action={copy.operations.viewNodes}
                  onAction={() => setActiveTab("nodes")}
                />
                <OperationRow
                  icon={Clipboard}
                  title={copy.operations.policy}
                  hint={copy.operations.policyHint}
                  tone="info"
                  action={copy.operations.managePolicies}
                  onAction={() => setActiveTab("policies")}
                />
              </div>
            </SectionFrame>
          </div>
          {actionError ? <Card className="border-[color:var(--color-warning-muted)]"><p className="text-sm text-[var(--color-text-subtle)]">{actionError}</p></Card> : null}
          {joinURI ? (
            <Card className="border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)]/35">
              <p className="text-sm font-semibold text-[var(--color-heading)]">一次性邀请（仅在本次页面显示）</p>
              <code className="mt-2 block break-all text-xs text-[var(--color-text-subtle)]">{joinURI}</code>
            </Card>
          ) : null}
          <Card>
            <h2 className="font-semibold text-[var(--color-heading)]">创建网络与设备邀请</h2>
            <p className="mt-2 text-xs text-[var(--color-text-subtle)]">仅管理员可用。敏感字段只提交到 accounts，不写入 Portal。</p>
            <textarea value={bootstrapPayload} onChange={(event) => setBootstrapPayload(event.target.value)} className="mt-3 min-h-64 w-full rounded border bg-transparent p-3 font-mono text-xs" spellCheck={false} />
            <button type="button" onClick={() => void bootstrap()} className="tactile-button tactile-button-primary mt-3 px-3 text-sm">创建正式网络/邀请</button>
          </Card>
          {resources ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card><h2 className="font-semibold text-[var(--color-heading)]">网络</h2>{resources.networks.map((network) => <div key={network.id} className="mt-3 border-t pt-3 text-sm"><p className="font-medium">{network.display_name} <span className="text-xs text-[var(--color-text-subtle)]">{network.id}</span></p><p className="text-xs text-[var(--color-text-subtle)]">{network.cidr} · Gateway {network.gateway_id}</p></div>)}</Card>
              <Card><h2 className="font-semibold text-[var(--color-heading)]">设备</h2>{resources.devices.map((device) => <div key={device.id} className="mt-3 flex items-center justify-between border-t pt-3 text-sm"><div><p className="font-medium">{device.name || device.id}</p><p className="text-xs text-[var(--color-text-subtle)]">{device.role} · {device.platform} · {device.wireguard_address}</p></div>{device.status !== "revoked" ? <button type="button" aria-label={`撤销 ${device.id}`} onClick={() => void revokeDevice(device.id)} className="text-[var(--color-danger-foreground)]"><ShieldOff className="h-4 w-4" /></button> : null}</div>)}</Card>
              <Card><h2 className="font-semibold text-[var(--color-heading)]">邀请</h2>{resources.invites.map((invite) => <div key={invite.id} className="mt-3 border-t pt-3 text-sm"><p className="font-medium">{invite.role} · {invite.platform}</p><p className="text-xs text-[var(--color-text-subtle)]">{invite.network_id} · 剩余 {invite.remaining_uses} 次</p></div>)}</Card>
            </div>
          ) : null}
        </>
      ) : (
        <ManagementPanel
          activeTab={activeTab}
          connected={connected}
          overview={overview}
          copy={copy}
          onOpenReset={() => setResetOpen(true)}
          copiedKey={copiedKey}
          onCopy={(value, key) => void copyToClipboard(value, key)}
        />
      )}

      <AlertDialog.Root open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[var(--color-overlay)] backdrop-blur-[2px]" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)] focus:outline-none">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--color-danger-muted)] text-[var(--color-danger-foreground)]">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              </div>
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  aria-label={copy.resetDialog.cancel}
                >
                  <X className="h-4 w-4" />
                </button>
              </AlertDialog.Cancel>
            </div>
            <AlertDialog.Title className="mt-4 text-xl font-semibold text-[var(--color-heading)]">
              {copy.resetDialog.title}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
              {copy.resetDialog.body}
            </AlertDialog.Description>
            <div className="mt-4 flex items-start gap-2 rounded-[6px] border border-[color:var(--color-warning-muted)] bg-[var(--color-warning-muted)]/55 p-3 text-xs text-[var(--color-warning-foreground)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {copy.resetDialog.warning}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Cancel className="tactile-button tactile-button-soft">
                {copy.resetDialog.cancel}
              </AlertDialog.Cancel>
              <button
                type="button"
                disabled
                className="tactile-button cursor-not-allowed border border-[color:var(--color-danger-muted)] bg-[var(--color-danger-muted)] text-[var(--color-danger-foreground)] opacity-65"
              >
                {copy.resetDialog.blocked}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

function OperationRow({
  icon: Icon,
  title,
  hint,
  tone,
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  tone: Tone;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${TONE_STYLES[tone]}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--color-heading)]">
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--color-text-subtle)]">
          {hint}
        </p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className={`tactile-button shrink-0 px-3 text-xs ${tone === "danger" ? "border border-[color:var(--color-danger)] bg-transparent text-[var(--color-danger-foreground)]" : "tactile-button-soft text-[var(--color-primary)]"}`}
      >
        {action}
      </button>
    </div>
  );
}

function ManagementPanel({
  activeTab,
  connected,
  overview,
  copy,
  onOpenReset,
  copiedKey,
  onCopy,
}: {
  activeTab: Exclude<TabKey, "overview">;
  connected: boolean;
  overview: XConnectZeroAdminOverview | null;
  copy: (typeof COPY)["zh"] | (typeof COPY)["en"];
  onOpenReset: () => void;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => void;
}) {
  const config = {
    nodes: {
      icon: Server,
      title: copy.panels.nodesTitle,
      body: copy.panels.nodesBody,
    },
    ip: { icon: Route, title: copy.panels.ipTitle, body: copy.panels.ipBody },
    policies: {
      icon: Clipboard,
      title: copy.panels.policyTitle,
      body: copy.panels.policyBody,
    },
    certificates: {
      icon: FileKey2,
      title: copy.panels.certificateTitle,
      body: copy.panels.certificateBody,
    },
  }[activeTab];
  const Icon = config.icon;

  return (
    <section className="rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-divider)] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)]/45 text-[var(--color-primary)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-heading)]">
              {config.title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
              {config.body}
            </p>
          </div>
        </div>
        <StatusBadge
          icon={connected ? CheckCircle2 : Unplug}
          label={connected ? copy.connected : copy.unavailable}
          tone={connected ? "success" : "muted"}
        />
      </div>

      {activeTab === "nodes" ? (
        <div className="grid gap-4 p-5 md:grid-cols-3">
          <SummaryBlock
            icon={Server}
            label={copy.panels.gateway}
            value={overview?.gatewayCount}
            connected={connected}
            connectedLabel={copy.connected}
          />
          <SummaryBlock
            icon={MonitorSmartphone}
            label={copy.panels.one}
            value={overview?.deviceCount}
            connected={connected}
            connectedLabel={copy.connected}
          />
          <SummaryBlock
            icon={Network}
            label={copy.panels.network}
            value={overview?.networkCount}
            connected={connected}
            connectedLabel={copy.connected}
          />
        </div>
      ) : null}
      {activeTab === "ip" ? (
        <div className="divide-y divide-[var(--color-divider)] px-5">
          <DetailRow
            label="10.0.0.0/16"
            value={connected ? copy.connected : copy.unknown}
          />
          <DetailRow
            label={copy.operations.ipHint}
            value={copy.panels.statusUnavailable}
          />
        </div>
      ) : null}
      {activeTab === "policies" ? (
        <div className="divide-y divide-[var(--color-divider)] px-5">
          <DetailRow
            label={copy.operations.policy}
            value={connected ? copy.connected : copy.waiting}
          />
          <DetailRow
            label={copy.operations.policyHint}
            value={copy.panels.statusUnavailable}
          />
        </div>
      ) : null}
      {activeTab === "certificates" ? (
        <div className="divide-y divide-[var(--color-divider)]">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--color-heading)]">
                {copy.operations.gpg}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                {copy.operations.gpgHint}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenReset}
              className="tactile-button border border-[color:var(--color-danger)] bg-transparent px-4 text-[var(--color-danger-foreground)]"
            >
              {copy.operations.reset}
            </button>
          </div>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--color-heading)]">
                UUID
              </p>
              <p className="mt-1 font-mono text-xs text-[var(--color-text-subtle)]">
                node UUID: —
              </p>
            </div>
            <button
              type="button"
              disabled={!connected}
              onClick={() => onCopy("node UUID: unavailable", "node-uuid")}
              className="tactile-button tactile-button-soft px-4 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copiedKey === "node-uuid" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedKey === "node-uuid" ? copy.copied : copy.copy}
            </button>
          </div>
        </div>
      ) : null}
      {!connected ? (
        <div className="m-5 mt-0 flex items-start gap-2 rounded-[6px] border border-[color:var(--color-warning-muted)] bg-[var(--color-warning-muted)]/45 p-3 text-xs text-[var(--color-warning-foreground)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {copy.panels.statusUnavailable}
        </div>
      ) : null}
    </section>
  );
}

function SummaryBlock({
  icon: Icon,
  label,
  value,
  connected,
  connectedLabel,
}: {
  icon: LucideIcon;
  label: string;
  value?: number;
  connected: boolean;
  connectedLabel: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] p-4">
      <div className="flex items-center justify-between gap-3">
        <Icon
          className="h-5 w-5 text-[var(--color-primary)]"
          aria-hidden="true"
        />
        <StatusBadge
          label={connected ? connectedLabel : "—"}
          tone={connected ? "success" : "muted"}
        />
      </div>
      <p className="mt-4 text-sm text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[var(--color-heading)]">
        {value ?? "—"}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-sm font-semibold text-[var(--color-heading)]">
        {label}
      </span>
      <span className="text-sm text-[var(--color-text-muted)]">{value}</span>
    </div>
  );
}
