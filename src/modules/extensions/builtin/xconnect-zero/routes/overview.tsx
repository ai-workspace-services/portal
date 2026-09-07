"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Network, RefreshCw } from "lucide-react";

import Breadcrumbs from "@/app/panel/components/Breadcrumbs";
import Card from "@/app/panel/components/Card";
import { useLanguage } from "@i18n/LanguageProvider";
import {
  isXConnectZeroAdminOverview,
  type XConnectZeroAdapterErrorResponse,
  type XConnectZeroAdminOverview,
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

export default function XConnectZeroOverviewRoute() {
  const { language } = useLanguage();
  const copy = COPY[language];
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  const refresh = () => {
    setState({ kind: "loading" });
    void loadOverview().then(setState);
  };

  useEffect(() => {
    void loadOverview().then(setState);
  }, []);

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
        </>
      ) : null}
    </div>
  );
}
