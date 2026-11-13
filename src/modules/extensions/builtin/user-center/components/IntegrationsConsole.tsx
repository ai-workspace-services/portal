"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Cloud,
  Database,
  Code,
  HardDrive,
  KeyRound,
  LoaderCircle,
  Mail,
  PlugZap,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

type AuthKind = "oidc" | "api-token" | "ak-sk" | "webhook-mcp";
type FilterKind = "all" | "oidc" | "api-token" | "webhook-mcp";
type ConnectorStatus = "connected" | "attention" | "available";
type ConnectorIcon =
  | "github"
  | "cloud"
  | "mail"
  | "drive"
  | "vault"
  | "workspace"
  | "xworkmate"
  | "aws";

type ConnectorDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: ConnectorIcon;
  authKinds: AuthKind[];
  preferredAuth: AuthKind;
  builtIn?: boolean;
};

type ConnectorRuntime = {
  status: ConnectorStatus;
  account?: string;
  lastChecked?: string;
  credentialConfigured?: boolean;
};

type Connector = ConnectorDefinition & ConnectorRuntime;

const CONNECTOR_CATALOG: ConnectorDefinition[] = [
  {
    id: "github",
    name: "GitHub",
    description: "连接代码仓库、Issue 与开发工作流。",
    category: "开发工具",
    icon: "github",
    authKinds: ["oidc", "api-token"],
    preferredAuth: "oidc",
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    description: "访问 DNS、边缘网络与 Cloudflare 资源。",
    category: "云与基础设施",
    icon: "cloud",
    authKinds: ["api-token"],
    preferredAuth: "api-token",
  },
  {
    id: "aws",
    name: "AWS",
    description: "通过工作负载身份或访问密钥连接云资源。",
    category: "云与基础设施",
    icon: "aws",
    authKinds: ["oidc", "ak-sk"],
    preferredAuth: "oidc",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "安全连接邮箱与邮件工作流。",
    category: "沟通协作",
    icon: "mail",
    authKinds: ["oidc"],
    preferredAuth: "oidc",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "搜索、读取并协作处理云端文件。",
    category: "文件与知识",
    icon: "drive",
    authKinds: ["oidc"],
    preferredAuth: "oidc",
  },
  {
    id: "vault",
    name: "Vault",
    description: "通过受控身份访问已授权的密钥服务。",
    category: "安全与密钥",
    icon: "vault",
    authKinds: ["oidc", "api-token"],
    preferredAuth: "oidc",
  },
  {
    id: "self-hosted-ai-workspace",
    name: "自建 AI Workspace",
    description: "连接你部署的 AI Workspace 实例。",
    category: "AI 工作空间",
    icon: "workspace",
    authKinds: ["oidc", "api-token"],
    preferredAuth: "oidc",
  },
  {
    id: "xworkmate",
    name: "XWorkmate",
    description: "连接当前工作空间中的 XWorkmate 服务。",
    category: "AI 工作空间",
    icon: "xworkmate",
    authKinds: ["oidc"],
    preferredAuth: "oidc",
    builtIn: true,
  },
  {
    id: "custom-mcp-webhook",
    name: "自定义 MCP / Webhook",
    description: "接入兼容 MCP 或 Webhook 的自建服务。",
    category: "自定义服务",
    icon: "workspace",
    authKinds: ["webhook-mcp", "api-token"],
    preferredAuth: "webhook-mcp",
  },
];

const AUTH_LABELS: Record<AuthKind, string> = {
  oidc: "OIDC / OAuth",
  "api-token": "API Token",
  "ak-sk": "AK / SK",
  "webhook-mcp": "Webhook & MCP",
};

const STATUS_LABELS: Record<ConnectorStatus, string> = {
  connected: "已连接",
  attention: "需要检查",
  available: "未连接",
};

const FILTERS: Array<{ id: FilterKind; label: string }> = [
  { id: "all", label: "全部" },
  { id: "oidc", label: "OIDC / OAuth" },
  { id: "api-token", label: "API Token · AK / SK" },
  { id: "webhook-mcp", label: "Webhook & MCP" },
];

const DEFAULT_RUNTIME: ConnectorRuntime = { status: "available" };

function iconFor(icon: ConnectorIcon) {
  switch (icon) {
    case "github":
      return Code;
    case "cloud":
      return Cloud;
    case "mail":
      return Mail;
    case "drive":
      return HardDrive;
    case "vault":
      return KeyRound;
    case "workspace":
      return Database;
    case "xworkmate":
      return PlugZap;
    case "aws":
      return Cloud;
  }
}

function authLabel(auth: AuthKind): string {
  return AUTH_LABELS[auth];
}

function statusStyle(status: ConnectorStatus): string {
  if (status === "connected") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "attention") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)]";
}

function describeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "暂时无法完成请求，请稍后重试。";
}

export function IntegrationsConsole() {
  const [runtimeById, setRuntimeById] = useState<
    Record<string, ConnectorRuntime>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");
  const [authChoice, setAuthChoice] = useState<AuthKind>("oidc");
  const [instanceUrl, setInstanceUrl] = useState("");
  const [token, setToken] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [busyAction, setBusyAction] = useState<
    "save" | "authorize" | "check" | null
  >(null);
  const [actionMessage, setActionMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/connectors", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as Record<
          string,
          ConnectorRuntime
        >;
        if (!cancelled && payload && typeof payload === "object") {
          setRuntimeById(payload);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const connectors = useMemo<Connector[]>(
    () =>
      CONNECTOR_CATALOG.map((item) => ({
        ...item,
        ...(runtimeById[item.id] ?? DEFAULT_RUNTIME),
      })),
    [runtimeById],
  );
  const selectedConnector =
    connectors.find((item) => item.id === selectedId) ?? null;
  const visibleConnectors = connectors.filter((connector) => {
    const queryMatch =
      `${connector.name} ${connector.description} ${connector.category}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase());
    const filterMatch =
      filter === "all" ||
      connector.authKinds.includes(
        filter === "webhook-mcp" ? "webhook-mcp" : filter,
      );
    return queryMatch && filterMatch;
  });
  const connectedCount = connectors.filter(
    (item) => item.status === "connected",
  ).length;
  const attentionCount = connectors.filter(
    (item) => item.status === "attention",
  ).length;

  function openConnector(connector: Connector) {
    setSelectedId(connector.id);
    setAuthChoice(connector.preferredAuth);
    setInstanceUrl("");
    setToken("");
    setAccessKey("");
    setSecretKey("");
    setActionMessage(null);
  }

  async function runAction(action: "save" | "authorize" | "check") {
    if (!selectedConnector) return;
    setBusyAction(action);
    setActionMessage(null);

    try {
      const response = await fetch(
        `/api/connectors/${encodeURIComponent(selectedConnector.id)}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authType: authChoice,
            ...(instanceUrl.trim() ? { endpoint: instanceUrl.trim() } : {}),
            ...(token ? { token } : {}),
            ...(accessKey ? { accessKey } : {}),
            ...(secretKey ? { secretKey } : {}),
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        authorizationUrl?: string;
        message?: string;
        status?: ConnectorStatus;
        account?: string;
        credentialConfigured?: boolean;
      };
      if (!response.ok)
        throw new Error(payload.message || "连接器服务暂不可用。请稍后重试。");

      if (action === "authorize" && payload.authorizationUrl) {
        window.location.assign(payload.authorizationUrl);
        return;
      }
      if (action === "save" || action === "check") {
        setRuntimeById((current) => ({
          ...current,
          [selectedConnector.id]: {
            ...(current[selectedConnector.id] ?? DEFAULT_RUNTIME),
            status:
              payload.status ??
              (action === "check" ? "attention" : "connected"),
            account: payload.account ?? current[selectedConnector.id]?.account,
            credentialConfigured: payload.credentialConfigured ?? true,
            ...(action === "check"
              ? { lastChecked: new Date().toISOString() }
              : {}),
          },
        }));
        if (action === "save") setToken("");
      }
      setActionMessage({
        kind: "success",
        text:
          payload.message ||
          (action === "check" ? "连通性检测已完成。" : "连接器设置已更新。"),
      });
    } catch (error) {
      setActionMessage({ kind: "error", text: describeError(error) });
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    if (!selectedId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-3xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)]">
        <div className="relative px-6 py-7 sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />
          <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--color-text-subtle)]">
                <PlugZap className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                Workspace connectors
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-4xl">
                连接器
              </h1>
              <p className="max-w-xl text-sm leading-6 text-[var(--color-text-subtle)] sm:text-base">
                把常用工具和自建 AI Workspace 安全接入工作流。优先使用 OIDC /
                OAuth，也可按连接器能力选择 API Token 或 AK / SK。
              </p>
            </div>
            <div className="grid min-w-full grid-cols-3 gap-3 sm:min-w-[420px] xl:min-w-[440px]">
              <OverviewMetric
                icon={CheckCircle2}
                label="已连接"
                value={connectedCount}
                tone="green"
              />
              <OverviewMetric
                icon={Activity}
                label="需检查"
                value={attentionCount}
                tone="amber"
              />
              <OverviewMetric
                icon={PlugZap}
                label="连接器"
                value={connectors.length}
                tone="violet"
              />
            </div>
          </div>
        </div>
        <div className="border-t border-[color:var(--color-surface-border)] px-6 py-4 sm:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <label className="relative block w-full xl:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-subtle)]" />
              <input
                aria-label="搜索连接器"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索连接器"
                className="w-full rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary-muted)]"
              />
            </label>
            <div
              aria-label="认证类型筛选"
              className="flex flex-wrap gap-2"
              role="group"
            >
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${filter === item.id ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm" : "border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="连接器目录" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-heading)]">
              可用连接器
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
              选择一个服务，查看可用认证方式并管理连接。
            </p>
          </div>
          <span className="hidden text-sm text-[var(--color-text-subtle)] sm:block">
            {visibleConnectors.length} 个连接器
          </span>
        </div>

        {visibleConnectors.length ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visibleConnectors.map((connector) => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                onClick={() => openConnector(connector)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[color:var(--color-surface-border)] px-6 py-14 text-center">
            <Search className="mx-auto h-6 w-6 text-[var(--color-text-subtle)]" />
            <p className="mt-3 text-sm font-medium text-[var(--color-text)]">
              没有匹配的连接器
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
              试试其他名称或认证类型。
            </p>
          </div>
        )}
      </section>

      {selectedConnector ? (
        <>
          <button
            aria-label="关闭连接器详情"
            className="fixed inset-0 z-40 cursor-default bg-slate-950/40 backdrop-blur-[2px]"
            onClick={() => setSelectedId(null)}
          />
          <aside
            aria-labelledby="connector-drawer-title"
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-[color:var(--color-surface-border)] bg-[var(--color-surface)] shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-5 border-b border-[color:var(--color-surface-border)] px-6 py-5 sm:px-8">
              <div className="flex min-w-0 items-center gap-4">
                <ConnectorIconTile icon={selectedConnector.icon} size="large" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className="text-xl font-semibold text-[var(--color-heading)]"
                      id="connector-drawer-title"
                    >
                      {selectedConnector.name}
                    </h2>
                    {selectedConnector.builtIn ? (
                      <span className="rounded-full bg-[var(--color-primary-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary)]">
                        内置
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
                    {selectedConnector.category}
                  </p>
                </div>
              </div>
              <button
                aria-label="关闭"
                className="rounded-xl p-2 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                onClick={() => setSelectedId(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
              <div
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${statusStyle(selectedConnector.status)}`}
              >
                <div className="flex items-center gap-2.5">
                  {selectedConnector.status === "connected" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <CircleHelp className="h-4 w-4" />
                  )}
                  <span className="text-sm font-semibold">
                    {STATUS_LABELS[selectedConnector.status]}
                  </span>
                </div>
                {selectedConnector.account ? (
                  <span className="max-w-[50%] truncate text-xs">
                    {selectedConnector.account}
                  </span>
                ) : null}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                  认证方式
                </h3>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-subtle)]">
                  优先选择 OIDC / OAuth；也可使用此连接器支持的凭证类型。
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedConnector.authKinds.map((kind) => (
                    <button
                      key={kind}
                      aria-pressed={authChoice === kind}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${authChoice === kind ? "border-[color:var(--color-primary)] bg-[var(--color-primary-muted)] text-[var(--color-primary)]" : "border-[color:var(--color-surface-border)] text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)]"}`}
                      onClick={() => {
                        setAuthChoice(kind);
                        setActionMessage(null);
                      }}
                      type="button"
                    >
                      {authLabel(kind)}
                      {kind === selectedConnector.preferredAuth ? (
                        <span className="ml-1.5 opacity-70">推荐</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              {selectedConnector.id === "self-hosted-ai-workspace" ||
              selectedConnector.id === "custom-mcp-webhook" ? (
                <FormField
                  label={
                    selectedConnector.id === "custom-mcp-webhook"
                      ? "服务地址"
                      : "实例地址"
                  }
                  hint={
                    selectedConnector.id === "custom-mcp-webhook"
                      ? "输入 MCP 服务或 Webhook 的访问地址。"
                      : "输入自建 AI Workspace 的访问地址。"
                  }
                >
                  <input
                    autoComplete="url"
                    className={inputClassName}
                    onChange={(event) => setInstanceUrl(event.target.value)}
                    placeholder="https://workspace.example.com"
                    type="url"
                    value={instanceUrl}
                  />
                </FormField>
              ) : null}

              {authChoice === "oidc" ? (
                <div className="rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/60 p-4">
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text)]">
                        使用安全授权
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--color-text-subtle)]">
                        授权将由服务端发起，并在完成后返回连接器中心。
                      </p>
                    </div>
                  </div>
                  <button
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={busyAction !== null}
                    onClick={() => void runAction("authorize")}
                    type="button"
                  >
                    {busyAction === "authorize" ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                    继续授权
                  </button>
                </div>
              ) : null}

              {authChoice === "api-token" ? (
                <FormField
                  label="API Token"
                  hint={
                    selectedConnector.credentialConfigured
                      ? "已保存的凭证不会显示。输入新 Token 可轮换凭证。"
                      : "凭证会通过安全接口提交，保存后不会再次显示。"
                  }
                >
                  <input
                    autoComplete="new-password"
                    className={inputClassName}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder={
                      selectedConnector.credentialConfigured
                        ? "输入新 Token 以轮换"
                        : "粘贴 API Token"
                    }
                    type="password"
                    value={token}
                  />
                </FormField>
              ) : null}

              {authChoice === "ak-sk" ? (
                <div className="space-y-4">
                  <FormField label="Access Key ID">
                    <input
                      autoComplete="off"
                      className={inputClassName}
                      onChange={(event) => setAccessKey(event.target.value)}
                      placeholder="Access Key ID"
                      value={accessKey}
                    />
                  </FormField>
                  <FormField
                    label="Secret Access Key"
                    hint="Secret 保存后不会再次显示。"
                  >
                    <input
                      autoComplete="new-password"
                      className={inputClassName}
                      onChange={(event) => setSecretKey(event.target.value)}
                      placeholder="Secret Access Key"
                      type="password"
                      value={secretKey}
                    />
                  </FormField>
                </div>
              ) : null}

              {authChoice === "webhook-mcp" ? (
                <div className="space-y-4">
                  <FormField label="服务地址">
                    <input
                      autoComplete="url"
                      className={inputClassName}
                      onChange={(event) => setInstanceUrl(event.target.value)}
                      placeholder="https://service.example.com/mcp"
                      type="url"
                      value={instanceUrl}
                    />
                  </FormField>
                  <FormField
                    label="访问令牌"
                    hint="可选；保存后将以掩码状态展示。"
                  >
                    <input
                      autoComplete="new-password"
                      className={inputClassName}
                      onChange={(event) => setToken(event.target.value)}
                      placeholder="Bearer token"
                      type="password"
                      value={token}
                    />
                  </FormField>
                </div>
              ) : null}

              {actionMessage ? (
                <div
                  aria-live="polite"
                  className={`rounded-xl border px-4 py-3 text-sm ${actionMessage.kind === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-[color:var(--color-danger-border)] bg-[var(--color-danger-muted)]/40 text-[var(--color-danger-foreground)]"}`}
                >
                  {actionMessage.text}
                </div>
              ) : null}
              {selectedConnector.lastChecked ? (
                <p className="text-xs text-[var(--color-text-subtle)]">
                  最近检测：
                  {new Date(selectedConnector.lastChecked).toLocaleString()}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[color:var(--color-surface-border)] px-6 py-4 sm:flex-row sm:justify-between sm:px-8">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--color-surface-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
                disabled={busyAction !== null}
                onClick={() => void runAction("check")}
                type="button"
              >
                {busyAction === "check" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
                检测连通性
              </button>
              {authChoice !== "oidc" ? (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:opacity-90 disabled:opacity-50"
                  disabled={
                    busyAction !== null ||
                    (authChoice === "api-token" && !token) ||
                    (authChoice === "ak-sk" && (!accessKey || !secretKey)) ||
                    ((authChoice === "webhook-mcp" ||
                      selectedConnector.id === "self-hosted-ai-workspace" ||
                      selectedConnector.id === "custom-mcp-webhook") &&
                      !instanceUrl)
                  }
                  onClick={() => void runAction("save")}
                  type="button"
                >
                  {busyAction === "save" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {selectedConnector.credentialConfigured
                    ? "保存并轮换"
                    : "保存并连接"}
                </button>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

const inputClassName =
  "w-full rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3.5 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary-muted)]";

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-semibold text-[var(--color-text)]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block text-xs leading-5 text-[var(--color-text-subtle)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function OverviewMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  tone: "green" | "amber" | "violet";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-300"
        : "text-[var(--color-primary)]";
  return (
    <div className="rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)]/80 p-3.5 sm:p-4">
      <div
        className={`flex items-center gap-2 text-xs font-medium ${toneClass}`}
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-heading)]">
        {value}
      </p>
    </div>
  );
}

function ConnectorCard({
  connector,
  onClick,
}: {
  connector: Connector;
  onClick: () => void;
}) {
  return (
    <button
      className="group flex min-h-[194px] w-full flex-col rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--color-primary)]/40 hover:shadow-lg hover:shadow-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
      onClick={onClick}
      type="button"
    >
      <div className="flex w-full items-start justify-between gap-4">
        <ConnectorIconTile icon={connector.icon} />
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(connector.status)}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${connector.status === "connected" ? "bg-emerald-500" : connector.status === "attention" ? "bg-amber-500" : "bg-slate-400"}`}
          />
          {STATUS_LABELS[connector.status]}
        </span>
      </div>
      <div className="mt-4 flex w-full items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-[var(--color-heading)]">
              {connector.name}
            </h3>
            {connector.builtIn ? (
              <span className="rounded-full bg-[var(--color-primary-muted)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--color-primary)]">
                内置
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-[var(--color-text-subtle)]">
            {connector.description}
          </p>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-subtle)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]" />
      </div>
      <div className="mt-auto flex w-full items-center justify-between gap-3 pt-4">
        <span className="truncate text-xs text-[var(--color-text-subtle)]">
          {connector.account ?? connector.category}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-[var(--color-text-subtle)]">
          {authLabel(connector.preferredAuth)}
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
        </span>
      </div>
    </button>
  );
}

function ConnectorIconTile({
  icon,
  size = "normal",
}: {
  icon: ConnectorIcon;
  size?: "normal" | "large";
}) {
  const Icon = iconFor(icon);
  const tileSize =
    size === "large" ? "h-14 w-14 rounded-2xl" : "h-11 w-11 rounded-xl";
  const iconSize = size === "large" ? "h-7 w-7" : "h-5 w-5";
  return (
    <span
      className={`flex shrink-0 items-center justify-center border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] text-[var(--color-text)] ${tileSize}`}
    >
      <Icon className={iconSize} strokeWidth={1.8} />
    </span>
  );
}
