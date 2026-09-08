"use client";
import { useEffect, useState, type ReactNode } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
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
  type XConnectZeroAdminOverview,
  type XConnectZeroAdapterErrorResponse,
  type XConnectZeroDevice,
  type XConnectZeroInvite,
  type XConnectZeroNetwork,
} from "@lib/xconnectZero";
type State =
  | { kind: "loading" }
  | { kind: "available"; overview: XConnectZeroAdminOverview }
  | { kind: "unavailable" }
  | { kind: "error"; code?: string };
type Page = "overview" | "join" | "configuration";
type ConnectionModeId = "wg_udp_l3" | "wg_vless_l3" | "wg_vless_l2";
type Resources = {
  networks: XConnectZeroNetwork[];
  devices: XConnectZeroDevice[];
  invites: XConnectZeroInvite[];
};
const CONNECTION_MODES: Array<{
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
const payload = `{\n  "controller_url": "https://accounts-uat.onwalk.net",\n  "network": {"id":"net_uat","display_name":"UAT private","cidr":"10.77.0.0/24","gateway_id":"gw_uat","gateway_wireguard_public_key":"REPLACE","gateway_wireguard_address":"10.77.0.1/24","gateway_endpoint_host":"REPLACE","gateway_endpoint_port":443,"transport_server_name":"REPLACE","transport_port":443,"transport_auth_id":"REPLACE"},\n  "invite": {"platform":"darwin","role":"one","expires_at":"2030-01-01T00:00:00Z"}\n}`;
const deviceInvitePayload = `{\n  "controller_url": "https://accounts-uat.onwalk.net",\n  "network_id": "",\n  "device_id": "macos-one",\n  "platform": "darwin",\n  "role": "one",\n  "expires_at": ""\n}`;

function controlPlaneErrorCode(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || !("error" in value)) return undefined;
  const error = (value as { error?: unknown }).error;
  // The UI deliberately exposes only a compact machine-readable category. It
  // must never surface upstream details, credentials, or signed configuration.
  return typeof error === "string" && /^[a-z0-9_-]{1,64}$/.test(error)
    ? error
    : undefined;
}

async function overview(): Promise<State> {
  try {
    const r = await fetch("/api/xconnect-zero/overview", { cache: "no-store" }),
      p = (await r.json().catch(() => null)) as
        | XConnectZeroAdminOverview
        | XConnectZeroAdapterErrorResponse
        | null;
    if (
      r.status === 503 ||
      (p && "error" in p && p.error === "control_plane_unavailable")
    )
      return { kind: "unavailable" };
    return r.ok && isXConnectZeroAdminOverview(p)
      ? { kind: "available", overview: p }
      : { kind: "error", code: controlPlaneErrorCode(p) };
  } catch {
    return { kind: "error" };
  }
}
async function resources(): Promise<Resources> {
  const x = await Promise.all(
    ["networks", "devices", "invites"].map(async (n) => {
      const r = await fetch(`/api/xconnect-zero/${n}`, { cache: "no-store" });
      if (!r.ok) throw Error();
      return r.json();
    }),
  );
  return {
    networks: x[0].networks ?? [],
    devices: x[1].devices ?? [],
    invites: x[2].invites ?? [],
  };
}
const Btn = ({
  children,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`tactile-button ${primary ? "tactile-button-primary" : "tactile-button-soft"} px-3 text-sm disabled:opacity-50`}
  >
    {children}
  </button>
);
function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <h2 className="border-b border-[color:var(--color-divider)] px-5 py-4 text-base font-semibold text-[var(--color-heading)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TelemetryPanel({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
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
function Row({
  icon: Icon,
  title,
  detail,
  value,
  onClick,
}: {
  icon: any;
  title: string;
  detail: string;
  value: string | number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-[color:var(--color-divider)] px-5 py-4 text-left last:border-0 hover:bg-[var(--color-surface-hover)]"
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
export default function XConnectZeroOverviewRoute() {
  const { language } = useLanguage();
  const zh = language === "zh";
  const [state, setState] = useState<State>({ kind: "loading" }),
    [rs, setRs] = useState<Resources | null>(null),
    [page, setPage] = useState<Page>("overview"),
    [json, setJson] = useState(payload),
    [inviteJson, setInviteJson] = useState(deviceInvitePayload),
    [err, setErr] = useState<string | null>(null),
    [uri, setUri] = useState<string | null>(null),
    [reset, setReset] = useState(false),
    [connectionMode, setConnectionMode] =
      useState<ConnectionModeId>("wg_vless_l3"),
    [checked, setChecked] = useState<Date | null>(null);
  const connected = state.kind === "available",
    o = connected ? state.overview : null;
  const refresh = () => {
    setState({ kind: "loading" });
    void overview().then((s) => {
      setState(s);
      setChecked(new Date());
      if (s.kind === "available")
        void resources()
          .then(setRs)
          .catch(() => setErr("加载资源失败"));
    });
  };
  useEffect(refresh, []);
  const status =
    state.kind === "loading"
      ? zh
        ? "检测中"
        : "Checking"
      : connected
        ? zh
          ? "已连接"
          : "Connected"
        : zh
          ? "连接异常"
          : "Connection issue";
  const controlPlaneDetail =
    state.kind === "error" && state.code
      ? `accounts /api/overlay/v1/admin/overview · ${state.code}`
      : "accounts /api/overlay/v1/admin/overview";
  const boot = async () => {
    try {
      const r = await fetch("/api/xconnect-zero/networks/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
      });
      const x = await r.json().catch(() => null);
      if (!r.ok) throw Error();
      setUri(x.join_uri ?? null);
      setRs(await resources());
    } catch {
      setErr("创建网络或邀请失败");
    }
  };
  const issueInvite = async () => {
    try {
      const request = JSON.parse(inviteJson) as Record<string, unknown>;
      if (!request.network_id && rs?.networks[0]?.id) {
        request.network_id = rs.networks[0].id;
      }
      if (!request.expires_at) {
        request.expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      const r = await fetch("/api/xconnect-zero/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const x = await r.json().catch(() => null);
      if (!r.ok || !x?.join_uri) throw Error();
      setUri(x.join_uri);
      setRs(await resources());
    } catch {
      setErr("签发设备邀请失败");
    }
  };
  const revoke = async (id: string) => {
    const r = await fetch(
      `/api/xconnect-zero/devices/${encodeURIComponent(id)}/revoke`,
      { method: "POST" },
    );
    if (r.ok) setRs(await resources());
    else setErr("撤销节点失败");
  };
  const pages: [[Page, string], [Page, string], [Page, string]] = [
    ["overview", zh ? "Zero 概览" : "Zero overview"],
    ["join", zh ? "节点加入" : "Join nodes"],
    ["configuration", zh ? "配置管理" : "Configuration"],
  ];
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
                className={`rounded-full px-2 py-1 text-xs font-semibold ${connected ? "bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]" : "bg-[var(--color-danger-muted)] text-[var(--color-danger-foreground)]"}`}
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
              {checked?.toLocaleString() ?? "—"}
            </small>
          </div>
          <Btn primary onClick={refresh} disabled={state.kind === "loading"}>
            <RefreshCw
              className={`h-4 w-4 ${state.kind === "loading" ? "animate-spin" : ""}`}
            />
            {zh ? "重新检测" : "Check again"}
          </Btn>
        </div>
        <nav className="-mb-px flex gap-7">
          {pages.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setPage(k)}
              className={`border-b-2 px-1 pb-3 text-sm font-semibold ${page === k ? "border-[color:var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[var(--color-text-muted)]"}`}
            >
              {l}
            </button>
          ))}
        </nav>
      </header>
      {page === "overview" && (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <Frame title={zh ? "账户运行状况" : "Account health"}>
              <Row
                icon={SlidersHorizontal}
                title={zh ? "控制面连接" : "Control-plane connection"}
                detail={controlPlaneDetail}
                value={status}
                onClick={() => setPage("configuration")}
              />
              <Row
                icon={Server}
                title={zh ? "Gateway 节点" : "Gateway nodes"}
                detail={
                  zh
                    ? "受控中继与安全连接"
                    : "Governed relay and secure connection"
                }
                value={o?.gatewayCount ?? "—"}
                onClick={() => setPage("join")}
              />
              <Row
                icon={MonitorSmartphone}
                title={zh ? "One 节点" : "One nodes"}
                detail={zh ? "受策略保护的设备" : "Policy-protected devices"}
                value={o?.deviceCount ?? "—"}
                onClick={() => setPage("join")}
              />
              <Row
                icon={ClipboardCheck}
                title={zh ? "配置同步" : "Configuration sync"}
                detail={
                  zh ? "Gateway、One 与网络" : "Gateway, One and networks"
                }
                value={
                  connected
                    ? zh
                      ? "已连接"
                      : "Connected"
                    : zh
                      ? "等待同步"
                      : "Waiting for sync"
                }
                onClick={() => setPage("configuration")}
              />
            </Frame>
            <Frame title={zh ? "可执行操作" : "Actions"}>
              <Row
                icon={RefreshCw}
                title={zh ? "重新检测" : "Check again"}
                detail={
                  zh ? "检查控制面与同步状态" : "Check control plane and sync"
                }
                value=""
                onClick={refresh}
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
            <TelemetryPanel
              title="SASE 流量分析"
              description="按 Internet 与专用网络细分的数据传输"
            />
            <TelemetryPanel
              title="已连接用户"
              description="通过应用程序或设备客户端连接的用户"
            />
            <TelemetryPanel
              title="热门专用应用程序"
              description="按用户统计的热门专用应用程序"
              compact
            />
            <TelemetryPanel
              title="热门用户"
              description="按数据传输量统计"
              compact
            />
          </div>
        </div>
      )}
      {page === "join" && (
        <div className="space-y-5">
          <Frame title={zh ? "安全加入节点" : "Join nodes securely"}>
            <div className="grid md:grid-cols-2">
              <Row
                icon={Server}
                title={zh ? "加入 Gateway" : "Join a Gateway"}
                detail={
                  zh ? "建立受控中继与安全连接" : "Create a governed relay"
                }
                value=""
              />
              <Row
                icon={MonitorSmartphone}
                title={zh ? "加入 One 节点" : "Join a One node"}
                detail={
                  zh ? "签发一次性加入凭据" : "Issue a one-time credential"
                }
                value=""
              />
            </div>
          </Frame>
          <Frame
            title={zh ? "创建网络与设备邀请" : "Create network and invitation"}
          >
            <div className="p-5">
              <p className="text-sm text-[var(--color-text-muted)]">
                {zh
                  ? "敏感字段只提交至 accounts，不写入 Portal。"
                  : "Sensitive fields are submitted only to accounts."}
              </p>
              <textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                className="mt-4 min-h-56 w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 p-3 font-mono text-xs"
              />
              <Btn primary onClick={boot}>
                <Plus className="h-4 w-4" />
                {zh ? "创建网络/邀请" : "Create network / invitation"}
              </Btn>
              {rs?.networks.length ? (
                <div className="mt-5 border-t border-[color:var(--color-divider)] pt-5">
                  <p className="text-sm font-medium text-[var(--color-heading)]">
                    {zh ? "为已有网络签发设备邀请" : "Issue an invitation for an existing network"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {zh
                      ? "默认使用第一个已授权网络；填写独立设备标识。邀请仅在本页显示一次。"
                      : "Uses the first authorized network by default. Supply a distinct device identifier; the invitation is displayed once."}
                  </p>
                  <textarea
                    value={inviteJson}
                    onChange={(e) => setInviteJson(e.target.value)}
                    className="mt-3 min-h-40 w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 p-3 font-mono text-xs"
                  />
                  <div className="mt-3">
                    <Btn primary onClick={issueInvite}>
                      <Plus className="h-4 w-4" />
                      {zh ? "签发设备邀请" : "Issue device invitation"}
                    </Btn>
                  </div>
                </div>
              ) : null}
            </div>
          </Frame>
          {uri && (
            <Frame
              title={
                zh ? "一次性邀请（仅本次页面显示）" : "One-time invitation"
              }
            >
              <code className="block break-all p-5 text-xs">{uri}</code>
            </Frame>
          )}
          <Frame title={zh ? "已加入节点" : "Joined nodes"}>
            {rs?.devices.length ? (
              rs.devices.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 border-b border-[color:var(--color-divider)] px-5 py-4"
                >
                  <MonitorSmartphone className="h-4 w-4 text-[var(--color-primary)]" />
                  <span className="min-w-0 flex-1">
                    <b className="block text-sm">{d.name || d.id}</b>
                    <small>
                      {d.role} · {d.platform} · {d.wireguard_address}
                    </small>
                  </span>
                  {d.status !== "revoked" && (
                    <Btn onClick={() => revoke(d.id)}>
                      {zh ? "撤销" : "Revoke"}
                    </Btn>
                  )}
                </div>
              ))
            ) : (
              <p className="p-5 text-sm text-[var(--color-text-muted)]">
                {zh
                  ? "连接控制面后加载实时节点与邀请。"
                  : "Connect control plane to load nodes and invitations."}
              </p>
            )}
          </Frame>
        </div>
      )}
      {page === "configuration" && (
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
                    ? "选择 Gateway 与 One 节点之间的数据传输方式。抗干扰连接是默认模式。"
                    : "Choose how data travels between Gateway and One nodes. Resilient connection is the default."}
                </p>
                <fieldset className="mt-4 grid gap-3 lg:grid-cols-3">
                  <legend className="sr-only">
                    {zh ? "选择互联网络模式" : "Select a connection mode"}
                  </legend>
                  {CONNECTION_MODES.map((mode) => {
                    const Icon = mode.icon;
                    const selected = connectionMode === mode.id;
                    return (
                      <label
                        key={mode.id}
                        className={`relative flex cursor-pointer flex-col rounded-[var(--radius-lg)] border p-4 transition-colors ${selected ? "border-[color:var(--color-primary)] bg-[var(--color-primary-muted)]/35 ring-1 ring-[color:var(--color-primary)]" : "border-[color:var(--color-surface-border)] hover:bg-[var(--color-surface-hover)]"}`}
                      >
                        <input
                          type="radio"
                          name="xconnect-connection-mode"
                          value={mode.id}
                          checked={selected}
                          onChange={() => setConnectionMode(mode.id)}
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
                  <span>{zh ? "当前选择" : "Selected"}:</span>
                  <strong className="text-[var(--color-heading)]">
                    {zh
                      ? CONNECTION_MODES.find(
                          (mode) => mode.id === connectionMode,
                        )?.name.zh
                      : CONNECTION_MODES.find(
                          (mode) => mode.id === connectionMode,
                        )?.name.en}
                  </strong>
                  <code className="text-xs">{connectionMode}</code>
                  <span className="ml-auto text-xs text-[var(--color-text-muted)]">
                    {zh
                      ? "控制面配置同步接口接入后下发至节点"
                      : "Applied to nodes after control-plane configuration sync is connected"}
                  </span>
                </div>
              </div>
            </Frame>
          </div>
          <Frame title={zh ? "VPC 与私有网络" : "VPC and private networks"}>
            <Row
              icon={Network}
              title={zh ? "网络与 CIDR" : "Network and CIDR"}
              detail={rs?.networks[0]?.display_name ?? "—"}
              value={rs?.networks[0]?.cidr ?? "—"}
            />
            <Row
              icon={Server}
              title={zh ? "Gateway 节点" : "Gateway nodes"}
              detail={zh ? "网络绑定" : "Network binding"}
              value={o?.gatewayCount ?? "—"}
            />
          </Frame>
          <Frame title={zh ? "IP 分配" : "IP allocation"}>
            <Row
              icon={SlidersHorizontal}
              title={zh ? "地址池" : "Address pool"}
              detail={zh ? "地址池与节点分配" : "Address pool and assignments"}
              value={rs?.networks[0]?.cidr ?? "10.0.0.0/16"}
            />
          </Frame>
          <Frame title={zh ? "WG 与签名证书" : "WG and signing certificates"}>
            <Row
              icon={FileKey2}
              title={zh ? "GPG 证书重置" : "Reset GPG certificate"}
              detail={
                zh
                  ? "需要二次确认；WG 资料不会明文展示。"
                  : "Second confirmation required; WG material is not displayed."
              }
              value=""
              onClick={() => setReset(true)}
            />
          </Frame>
          <Frame title={zh ? "节点 UUID" : "Node UUID"}>
            <Row
              icon={KeyRound}
              title="UUID"
              detail={
                zh
                  ? "选择一个节点后可查看标识"
                  : "Select a joined node to view its identifier"
              }
              value={rs?.devices[0]?.id ?? "—"}
            />
            <div className="p-4 text-right">
              <Btn
                onClick={() =>
                  void navigator.clipboard.writeText(rs?.devices[0]?.id ?? "")
                }
              >
                <Copy className="h-4 w-4" />
                {zh ? "复制" : "Copy"}
              </Btn>
            </div>
          </Frame>
          {!connected && (
            <div className="lg:col-span-2 flex gap-2 rounded border border-[color:var(--color-warning-muted)] bg-[var(--color-warning-muted)]/40 p-4 text-sm">
              <AlertCircle className="h-4 w-4" />
              {zh
                ? "连接中心控面后加载实时数据并启用写操作。"
                : "Connect control plane to load live data and enable writes."}
            </div>
          )}
        </div>
      )}
      {err && (
        <p className="rounded border border-[color:var(--color-warning-muted)] p-3 text-sm">
          {err}
        </p>
      )}
      <AlertDialog.Root open={reset} onOpenChange={setReset}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)]">
            <AlertDialog.Cancel asChild>
              <button className="float-right">
                <X className="h-4 w-4" />
              </button>
            </AlertDialog.Cancel>
            <ShieldAlert className="h-6 w-6 text-[var(--color-danger-foreground)]" />
            <AlertDialog.Title className="mt-3 text-xl font-semibold">
              {zh ? "重置 GPG 证书？" : "Reset the GPG certificate?"}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-[var(--color-text-muted)]">
              {zh
                ? "此操作会使当前签名证书失效。当前 Portal 适配层尚未开放 accounts 写入 API。"
                : "This invalidates the signing certificate. The accounts write API is not available."}
            </AlertDialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Cancel className="tactile-button tactile-button-soft">
                {zh ? "取消" : "Cancel"}
              </AlertDialog.Cancel>
              <button disabled className="tactile-button opacity-50">
                {zh ? "写入接口未接入" : "Write API not connected"}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
