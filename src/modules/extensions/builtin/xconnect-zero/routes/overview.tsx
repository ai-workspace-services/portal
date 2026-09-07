"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Network, RefreshCw, ShieldOff } from "lucide-react";

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
  | { kind: "unavailable"; error: string }
  | { kind: "forbidden" }
  | { kind: "error" };

const COPY = {
  en: {
    breadcrumb: "XConnect Zero",
    title: "XConnect Zero",
    subtitle: "The control plane for managed Zero Trust private networks.",
    boundary:
      "Portal owns this WebUI. Accounts is the single control plane for Gateway and One resources; XConnect-One CLI remains an independent controlled endpoint.",
    sourceOfTruthTitle: "Single control plane",
    sourceOfTruthBody:
      "Administrators manage Gateways, One devices, private networks, policies and signing configuration in XConnect Zero. Both the self-hosted Gateway runtime and XConnect-One CLI obtain their runtime configuration from the accounts API.",
    sourceOfTruthNote:
      "Portal does not maintain a second local or experimental controller configuration source.",
    loading: "Checking the control plane…",
    unavailableTitle: "Control plane is not available yet",
    unavailableBody:
      "Accounts has not exposed the XConnect Zero admin API in this environment. The panel is ready behind its feature gate and will not display placeholder networks or devices.",
    unavailableHint:
      "Expected endpoint: accounts /api/overlay/v1/admin/overview",
    forbidden:
      "Your account is not authorized to view XConnect Zero administration.",
    error: "The control plane could not be reached. Try again later.",
    retry: "Retry",
    available: "Control plane connected",
    networks: "Networks",
    devices: "Devices",
    gateways: "Gateways",
  },
  zh: {
    breadcrumb: "XConnect Zero",
    title: "XConnect Zero",
    subtitle: "管理 Zero Trust 私有网络的中心控面。",
    boundary:
      "Portal 只负责 Zero WebUI；accounts 是 Gateway 与 One 资源的唯一集中控面，XConnect-One CLI 仍是独立的受控端产品。",
    sourceOfTruthTitle: "唯一集中控面",
    sourceOfTruthBody:
      "管理员在 XConnect Zero 中统一配置 Gateway、One 设备、私有网络、策略和签名配置。自建 Gateway 运行时与 XConnect-One CLI 都从 accounts API 获取运行配置。",
    sourceOfTruthNote: "Portal 不维护第二套本地或实验 controller 配置来源。",
    loading: "正在检查控面状态…",
    unavailableTitle: "中心控面尚未可用",
    unavailableBody:
      "当前环境的 accounts 尚未提供 XConnect Zero 管理 API。页面已保留在功能开关之后，不会展示虚构的网络或设备数据。",
    unavailableHint: "预期端点：accounts /api/overlay/v1/admin/overview",
    forbidden: "当前账号没有查看 XConnect Zero 管理面的权限。",
    error: "暂时无法连接中心控面，请稍后重试。",
    retry: "重试",
    available: "中心控面已连接",
    networks: "网络",
    devices: "设备",
    gateways: "Gateway",
  },
} as const;

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
      return {
        kind: "unavailable",
        error: "control_plane_unavailable",
      };
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

  const refreshAll = () => {
    setState({ kind: "loading" });
    setResources(null);
    void loadOverview().then((next) => {
      setState(next);
      if (next.kind === "available") void loadResources().then(setResources).catch(() => setActionError("加载资源失败"));
    });
  };

  const refresh = refreshAll;

  useEffect(() => {
    refreshAll();
  }, []);

  const revokeDevice = async (deviceID: string) => {
    setActionError(null);
    const response = await fetch(`/api/xconnect-zero/devices/${encodeURIComponent(deviceID)}/revoke`, { method: "POST" });
    if (!response.ok) { setActionError("撤销设备失败"); return; }
    const next = await loadResources();
    setResources(next);
  };

  const bootstrap = async () => {
    setActionError(null);
    setJoinURI(null);
    let payload: unknown;
    try { payload = JSON.parse(bootstrapPayload); } catch { setActionError("Bootstrap JSON 格式无效"); return; }
    const response = await fetch("/api/xconnect-zero/networks/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) { setActionError("创建网络或邀请失败"); return; }
    setJoinURI(result.join_uri ?? null);
    setResources(await loadResources());
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/panel" },
          { label: copy.breadcrumb, href: "/panel/xconnect-zero" },
        ]}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
            <Network className="h-3.5 w-3.5" />
            XConnect Zero
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-heading)]">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-subtle)]">
            {copy.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="tactile-button tactile-button-soft inline-flex items-center gap-2 px-3 text-sm"
          disabled={state.kind === "loading"}
        >
          <RefreshCw
            className={`h-4 w-4 ${state.kind === "loading" ? "animate-spin" : ""}`}
          />
          {copy.retry}
        </button>
      </div>

      <Card className="border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)]/35">
        <p className="text-sm text-[var(--color-text)]">{copy.boundary}</p>
      </Card>

      <Card>
        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
          <div>
            <h2 className="font-semibold text-[var(--color-heading)]">
              {copy.sourceOfTruthTitle}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-subtle)]">
              {copy.sourceOfTruthBody}
            </p>
            <p className="mt-3 text-xs text-[var(--color-text-subtle)]">
              {copy.sourceOfTruthNote}
            </p>
          </div>
        </div>
      </Card>

      {state.kind === "loading" ? (
        <Card>
          <p className="text-sm text-[var(--color-text-subtle)]">
            {copy.loading}
          </p>
        </Card>
      ) : null}

      {state.kind === "unavailable" ? (
        <Card className="border-[color:var(--color-warning-muted)]">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning-foreground)]" />
            <div>
              <h2 className="font-semibold text-[var(--color-heading)]">
                {copy.unavailableTitle}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-subtle)]">
                {copy.unavailableBody}
              </p>
              <p className="mt-3 font-mono text-xs text-[var(--color-text-subtle)]">
                {copy.unavailableHint}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {state.kind === "forbidden" ? (
        <Card>
          <p className="text-sm text-[var(--color-text-subtle)]">
            {copy.forbidden}
          </p>
        </Card>
      ) : null}

      {state.kind === "error" ? (
        <Card>
          <p className="text-sm text-[var(--color-text-subtle)]">
            {copy.error}
          </p>
        </Card>
      ) : null}

      {state.kind === "available" ? (
        <>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-success-foreground)]">
            <CheckCircle2 className="h-4 w-4" />
            {copy.available}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                [copy.networks, state.overview.networkCount],
                [copy.devices, state.overview.deviceCount],
                [copy.gateways, state.overview.gatewayCount],
              ] as const
            ).map(([label, value]) => (
              <Card key={label} className="p-5">
                <p className="text-sm text-[var(--color-text-subtle)]">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-bold text-[var(--color-heading)]">
                  {value}
                </p>
              </Card>
            ))}
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
      ) : null}
    </div>
  );
}
