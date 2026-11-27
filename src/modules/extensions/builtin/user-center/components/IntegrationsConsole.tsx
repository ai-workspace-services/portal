"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cloud,
  Code,
  Coffee,
  Copy,
  ExternalLink,
  FileText,
  FolderSync,
  GitBranch,
  HardDrive,
  KeyRound,
  LayoutGrid,
  LoaderCircle,
  Mail,
  PlugZap,
  Plus,
  Search,
  Server,
  ShieldCheck,
  Triangle,
  Unplug,
  X,
} from "lucide-react";

import { useUserStore } from "@lib/userStore";
import {
  authorizeConnectorWithPopup,
  openOAuthPopupWindow,
} from "../lib/oauthPopup";

type CategoryId =
  | "all"
  | "code"
  | "cloud"
  | "email"
  | "workspace"
  | "secrets"
  | "mcp";

type AuthKind =
  | "oidc"
  | "api-token"
  | "ak-sk"
  | "webhook-mcp"
  | "service-account";

type ConnectorStatus = "connected" | "attention" | "available";

type ConnectorDefinition = {
  id: string;
  name: string;
  description: string;
  category: Exclude<CategoryId, "all">;
  categoryLabel: string;
  authKinds: AuthKind[];
  preferredAuth: AuthKind;
  isCustom?: boolean;
};

export type ConnectorRuntime = {
  id?: string;
  status: ConnectorStatus;
  account?: string;
  authMode?: string;
  lastChecked?: string;
  lastSyncedAt?: string;
  credentialConfigured?: boolean;
  writable?: boolean;
  oauthConfigured?: boolean;
  endpoint?: string;
  spreadsheetUrl?: string;
  spreadsheetId?: string;
  gid?: string;
  sheetTitle?: string;
  statusDetail?: string;
  isCustom?: boolean;
  customMeta?: {
    name: string;
    description: string;
    category: Exclude<CategoryId, "all">;
    categoryLabel: string;
    authKinds: AuthKind[];
    preferredAuth: AuthKind;
  };
};

type Connector = ConnectorDefinition & ConnectorRuntime;

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1V4u9b6MFIJgVuVAb056jidZLSFMiyhJJj9eDSGud1_I/edit?gid=1136257492#gid=1136257492";

const BUILTIN_CATALOG: ConnectorDefinition[] = [
  {
    id: "github",
    name: "GitHub",
    description: "支持 GitHub OIDC 与仓库工作流接入。",
    category: "code",
    categoryLabel: "代码托管",
    authKinds: ["oidc", "api-token"],
    preferredAuth: "oidc",
  },
  {
    id: "gitea",
    name: "Gitea",
    description: "自托管或 Gitea.com 仓库与组织连接。",
    category: "code",
    categoryLabel: "代码托管",
    authKinds: ["api-token", "oidc"],
    preferredAuth: "api-token",
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "GitLab SaaS 或私有部署实例流水线集成。",
    category: "code",
    categoryLabel: "代码托管",
    authKinds: ["oidc", "api-token"],
    preferredAuth: "oidc",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "通过 Google OAuth 连接邮箱与服务通知工作流。",
    category: "email",
    categoryLabel: "邮件通信",
    authKinds: ["oidc"],
    preferredAuth: "oidc",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Google OAuth2 授权读写云端表格，驱动管理台订阅双向同步。",
    category: "workspace",
    categoryLabel: "办公协作",
    authKinds: ["oidc", "service-account"],
    preferredAuth: "oidc",
  },
  {
    id: "google-workspaces",
    name: "Google Workspaces",
    description: "集成 Google Drive、Sheets 与 Docs 办公协作套件。",
    category: "workspace",
    categoryLabel: "办公协作",
    authKinds: ["oidc"],
    preferredAuth: "oidc",
  },
  {
    id: "vault",
    name: "Vault Server",
    description: "HashiCorp Vault 密钥与凭据安全读取。",
    category: "secrets",
    categoryLabel: "密钥安全",
    authKinds: ["api-token", "oidc"],
    preferredAuth: "api-token",
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    description: "Cloudflare Workers、DNS 与边缘网络规则。",
    category: "cloud",
    categoryLabel: "云基础设施",
    authKinds: ["api-token"],
    preferredAuth: "api-token",
  },
  {
    id: "aws-lightsail",
    name: "AWS Lightsail",
    description: "AWS Lightsail 实例、静态 IP 与节点健康。",
    category: "cloud",
    categoryLabel: "云基础设施",
    authKinds: ["ak-sk", "oidc"],
    preferredAuth: "ak-sk",
  },
  {
    id: "gcp",
    name: "GCP",
    description: "Google Cloud 项目、Cloud Run 与 IAM 身份治理。",
    category: "cloud",
    categoryLabel: "云基础设施",
    authKinds: ["oidc", "service-account"],
    preferredAuth: "oidc",
  },
  {
    id: "linode-vps",
    name: "Linode VPS",
    description: "Akamai / Linode VPS 边缘节点资源与算力管理。",
    category: "cloud",
    categoryLabel: "云基础设施",
    authKinds: ["api-token"],
    preferredAuth: "api-token",
  },
];

const CATEGORIES: Array<{ id: CategoryId; label: string }> = [
  { id: "all", label: "全部" },
  { id: "code", label: "代码托管" },
  { id: "cloud", label: "云基础设施" },
  { id: "email", label: "邮件通信" },
  { id: "workspace", label: "办公协作" },
  { id: "secrets", label: "密钥安全" },
  { id: "mcp", label: "自定义 MCP" },
];

const AUTH_LABELS: Record<AuthKind, string> = {
  oidc: "Google / OAuth2",
  "api-token": "API Token",
  "ak-sk": "AK / SK",
  "webhook-mcp": "Webhook & MCP",
  "service-account": "Service Account JSON",
};

const STATUS_BUTTON_LABELS: Record<ConnectorStatus, string> = {
  connected: "已连接",
  attention: "需检查",
  available: "连接",
};

const DEFAULT_RUNTIME: ConnectorRuntime = { status: "available" };

function tileAppearance(id: string): {
  bg: string;
  Icon: typeof Code;
  label?: string;
} {
  switch (id) {
    case "github":
      return { bg: "bg-zinc-900 text-white", Icon: Code };
    case "gitea":
      return { bg: "bg-[#609926] text-white", Icon: Coffee };
    case "gitlab":
      return { bg: "bg-[#fc6d26] text-white", Icon: GitBranch };
    case "gmail":
      return {
        bg: "border border-[color:var(--color-surface-border)] bg-white text-[#ea4335]",
        Icon: Mail,
      };
    case "google-drive":
      return { bg: "bg-[#0f9d58] text-white", Icon: HardDrive };
    case "google-workspaces":
      return { bg: "bg-[#1a73e8] text-white", Icon: LayoutGrid };
    case "vault":
      return { bg: "bg-zinc-900 text-[#ffd814]", Icon: Triangle };
    case "cloudflare":
      return { bg: "bg-[#f38020] text-white", Icon: Cloud };
    case "aws-lightsail":
      return { bg: "bg-[#1e293b] text-[#f59e0b]", Icon: Box };
    case "gcp":
      return { bg: "bg-[#4285f4] text-white", Icon: Cloud };
    case "linode-vps":
      return { bg: "bg-[#00b050] text-white", Icon: Server };
    default:
      return { bg: "bg-indigo-600 text-white", Icon: PlugZap };
  }
}

function authButtonText(connector: Connector, kind: AuthKind): string {
  if (kind === "oidc") {
    return connector.id === "github" ||
      connector.id === "gitlab" ||
      connector.id === "gitea"
      ? "OIDC / OAuth"
      : "Google OAuth2";
  }
  return AUTH_LABELS[kind];
}

function describeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "暂时无法完成请求，请稍后重试。";
}

export function IntegrationsConsole() {
  const currentUser = useUserStore((state) => state.user);
  const [runtimeById, setRuntimeById] = useState<
    Record<string, ConnectorRuntime>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryId>("all");
  const [onlyConnected, setOnlyConnected] = useState(false);

  const [authChoice, setAuthChoice] = useState<AuthKind>("oidc");
  const [instanceUrl, setInstanceUrl] = useState("");
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(DEFAULT_SHEET_URL);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showOAuthOverrides, setShowOAuthOverrides] = useState(false);
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [token, setToken] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  const [busyAction, setBusyAction] = useState<
    "save" | "authorize" | "check" | "disconnect" | null
  >(null);
  const [actionMessage, setActionMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [pageBanner, setPageBanner] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configJson, setConfigJson] = useState("");
  const [configCopied, setConfigCopied] = useState(false);

  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [customToken, setCustomToken] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customSaving, setCustomSaving] = useState(false);

  async function refreshConnectors() {
    try {
      const response = await fetch("/api/connectors", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as Record<
        string,
        ConnectorRuntime
      >;
      if (payload && typeof payload === "object") {
        setRuntimeById(payload);
      }
    } catch {
      // ignore background refresh error
    }
  }

  useEffect(() => {
    void refreshConnectors();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const connected = params.get("connected");
      const err = params.get("connectorError");
      if (connected === "google-drive") {
        setPageBanner({
          kind: "success",
          text: "Google Drive OAuth2 授权成功，已启用 Google Sheets 双向同步。",
        });
      } else if (err) {
        setPageBanner({ kind: "error", text: err });
      }
    }
  }, []);

  const connectors = useMemo<Connector[]>(() => {
    const builtinIds = new Set(BUILTIN_CATALOG.map((item) => item.id));
    const list: Connector[] = BUILTIN_CATALOG.map((item) => ({
      ...item,
      ...(runtimeById[item.id] ?? DEFAULT_RUNTIME),
    }));
    for (const [id, runtime] of Object.entries(runtimeById)) {
      if (!builtinIds.has(id) && runtime.customMeta) {
        list.push({
          id,
          name: runtime.customMeta.name,
          description: runtime.customMeta.description,
          category: runtime.customMeta.category,
          categoryLabel: runtime.customMeta.categoryLabel,
          authKinds: runtime.customMeta.authKinds,
          preferredAuth: runtime.customMeta.preferredAuth,
          ...runtime,
        });
      }
    }
    return list;
  }, [runtimeById]);

  const selectedConnector =
    connectors.find((item) => item.id === selectedId) ?? null;

  const connectedConnectors = connectors.filter(
    (item) => item.status === "connected",
  );

  const visibleConnectors = connectors.filter((connector) => {
    if (onlyConnected && connector.status !== "connected") return false;
    if (categoryFilter !== "all" && connector.category !== categoryFilter) {
      return false;
    }
    const q = query.trim().toLocaleLowerCase();
    if (!q) return true;
    return `${connector.name} ${connector.description} ${connector.categoryLabel} ${connector.id}`
      .toLocaleLowerCase()
      .includes(q);
  });

  function openConnector(connector: Connector) {
    setSelectedId(connector.id);
    setAuthChoice(connector.preferredAuth);
    setInstanceUrl(connector.endpoint ?? "");
    setSpreadsheetUrl(connector.spreadsheetUrl ?? DEFAULT_SHEET_URL);
    setClientId("");
    setClientSecret("");
    setShowOAuthOverrides(false);
    setServiceAccountJson("");
    setToken("");
    setAccessKey("");
    setSecretKey("");
    setActionMessage(null);
  }

  async function runAction(
    action: "save" | "authorize" | "check" | "disconnect",
  ) {
    if (!selectedConnector) return;
    setBusyAction(action);
    setActionMessage(null);

    try {
      if (action === "authorize") {
        const popup = openOAuthPopupWindow(`连接 ${selectedConnector.name}`);
        const outcome = await authorizeConnectorWithPopup({
          connectorId: selectedConnector.id,
          popup,
          body: {
            authType: authChoice,
            ...(selectedConnector.id === "google-drive" && spreadsheetUrl.trim()
              ? { spreadsheetUrl: spreadsheetUrl.trim(), returnTo: "/panel/connector" }
              : { returnTo: "/panel/connector" }),
            ...(clientId.trim() ? { clientId: clientId.trim() } : {}),
            ...(clientSecret.trim() ? { clientSecret: clientSecret.trim() } : {}),
          },
        });
        if (!outcome.ok) {
          throw new Error(
            outcome.error ||
              (outcome.cancelled
                ? "已关闭授权窗口，未完成连接。"
                : "OAuth2 授权失败。"),
          );
        }
        if (outcome.redirected) {
          return;
        }
        await refreshConnectors();
        setActionMessage({
          kind: "success",
          text: outcome.account
            ? `Google OAuth2 授权成功，已绑定当前账号连接器（${outcome.account}）。`
            : "Google OAuth2 授权成功，已自动同步连接状态。",
        });
        return;
      }

      const response = await fetch(
        `/api/connectors/${encodeURIComponent(selectedConnector.id)}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authType: authChoice,
            ...(instanceUrl.trim() ? { endpoint: instanceUrl.trim() } : {}),
            ...(selectedConnector.id === "google-drive" && spreadsheetUrl.trim()
              ? { spreadsheetUrl: spreadsheetUrl.trim(), returnTo: "/panel/connector" }
              : {}),
            ...(clientId.trim() ? { clientId: clientId.trim() } : {}),
            ...(clientSecret.trim()
              ? { clientSecret: clientSecret.trim() }
              : {}),
            ...(serviceAccountJson.trim()
              ? { serviceAccountJson: serviceAccountJson.trim() }
              : {}),
            ...(token ? { token } : {}),
            ...(accessKey ? { accessKey } : {}),
            ...(secretKey ? { secretKey } : {}),
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as ConnectorRuntime & {
        authorizationUrl?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.message || "连接器服务暂不可用，请检查配置后重试。",
        );
      }

      const { authorizationUrl: _url, message, ...runtimePatch } = payload;
      setRuntimeById((current) => ({
        ...current,
        [selectedConnector.id]: {
          ...(current[selectedConnector.id] ?? DEFAULT_RUNTIME),
          ...runtimePatch,
        },
      }));
      if (action === "save") {
        setToken("");
        setClientSecret("");
        setServiceAccountJson("");
      }
      setActionMessage({
        kind: "success",
        text:
          message ||
          (action === "check"
            ? "连通性检测已完成。"
            : action === "disconnect"
              ? "已断开连接。"
              : "连接器设置已更新。"),
      });
    } catch (error) {
      setActionMessage({ kind: "error", text: describeError(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function openConfigDrawer() {
    setConfigModalOpen(true);
    setConfigLoading(true);
    setConfigCopied(false);
    try {
      const response = await fetch("/api/connectors/config", {
        cache: "no-store",
      });
      const payload = await response.json();
      setConfigJson(JSON.stringify(payload, null, 2));
    } catch {
      setConfigJson(JSON.stringify({ error: "无法读取配置文件" }, null, 2));
    } finally {
      setConfigLoading(false);
    }
  }

  async function handleCreateCustomMcp(event: React.FormEvent) {
    event.preventDefault();
    if (!customName.trim() || !customEndpoint.trim()) return;
    setCustomSaving(true);
    try {
      const response = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customName.trim(),
          endpoint: customEndpoint.trim(),
          token: customToken.trim() || undefined,
          description: customDescription.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        connector?: ConnectorRuntime;
        message?: string;
      };
      if (!response.ok || !payload.connector?.id) {
        throw new Error(payload.message || "添加自定义 MCP 失败");
      }
      setRuntimeById((current) => ({
        ...current,
        [payload.connector!.id!]: payload.connector!,
      }));
      setCustomModalOpen(false);
      setCustomName("");
      setCustomEndpoint("");
      setCustomToken("");
      setCustomDescription("");
      setCategoryFilter("mcp");
      setPageBanner({
        kind: "success",
        text: payload.message || "已添加自定义 MCP 连接器。",
      });
    } catch (error) {
      setPageBanner({ kind: "error", text: describeError(error) });
    } finally {
      setCustomSaving(false);
    }
  }

  useEffect(() => {
    if (!selectedId && !configModalOpen && !customModalOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedId(null);
        setConfigModalOpen(false);
        setCustomModalOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, configModalOpen, customModalOpen]);

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-heading)]">
            连接器
          </h1>
          <span className="hidden rounded-full border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)] sm:inline-flex">
            {currentUser?.email
              ? `当前账号专属 · ${currentUser.email}`
              : "当前账号专属配置"}
          </span>
          <Link
            href="/panel/management"
            className="hidden items-center gap-1 rounded-full border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] transition hover:border-[color:var(--color-primary)]/40 hover:text-[var(--color-heading)] sm:inline-flex"
          >
            <FolderSync className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            订阅双向同步管理台
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOnlyConnected((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              onlyConnected
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-[color:var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
            }`}
          >
            {connectedConnectors.length > 0 ? (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                <Check className="h-3 w-3" />
              </span>
            ) : (
              <PlugZap className="h-3.5 w-3.5 text-[var(--color-text-subtle)]" />
            )}
            <span>已连接 {connectedConnectors.length} 个</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          </button>

          <button
            type="button"
            onClick={() => void openConfigDrawer()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface-muted)] sm:text-sm"
          >
            <FileText className="h-3.5 w-3.5 text-[var(--color-text-subtle)]" />
            打开配置文件
          </button>
        </div>
      </div>

      {pageBanner ? (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
            pageBanner.kind === "success"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-[color:var(--color-danger-border)] bg-[var(--color-danger-muted)]/40 text-[var(--color-danger-foreground)]"
          }`}
        >
          <span>{pageBanner.text}</span>
          <button
            type="button"
            aria-label="关闭提示"
            onClick={() => setPageBanner(null)}
            className="rounded-lg p-1 opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Search & Custom MCP row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-subtle)]" />
          <input
            aria-label="搜索连接器"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索连接器 (GitHub、GitLab、Vault、Cloudflare、GCP...)"
            className="w-full rounded-full border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] py-2.5 pl-11 pr-4 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary-muted)]"
          />
        </label>
        <button
          type="button"
          onClick={() => setCustomModalOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface-muted)]"
        >
          <Plus className="h-4 w-4" />
          自定义 MCP
        </button>
      </div>

      {/* Category Filter Pills */}
      <div
        aria-label="连接器分类筛选"
        className="flex flex-wrap items-center gap-2"
        role="group"
      >
        {CATEGORIES.map((item) => {
          const active = categoryFilter === item.id && !onlyConnected;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setOnlyConnected(false);
                setCategoryFilter(item.id);
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition sm:text-sm ${
                active
                  ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-heading)]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 2-Column Compact Connector Grid */}
      {visibleConnectors.length > 0 ? (
        <div
          aria-label="连接器目录"
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          {visibleConnectors.map((connector) => {
            const tile = tileAppearance(connector.id);
            const Icon = tile.Icon;
            return (
              <div
                key={connector.id}
                role="button"
                tabIndex={0}
                onClick={() => openConnector(connector)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openConnector(connector);
                  }
                }}
                className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3.5 transition hover:border-[color:var(--color-primary)]/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs ${tile.bg}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--color-heading)] sm:text-base">
                        {connector.name}
                      </span>
                      {connector.status === "connected" ? (
                        <span
                          aria-label="已连接状态指示"
                          className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                        />
                      ) : connector.status === "attention" ? (
                        <span
                          aria-label="需检查状态指示"
                          className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
                        />
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-subtle)] sm:text-sm">
                      {connector.account
                        ? `${connector.account} · ${connector.description}`
                        : connector.description}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-3.5 py-1 text-xs font-medium transition ${
                    connector.status === "connected"
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : connector.status === "attention"
                        ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "border-[color:var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text)] group-hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  {STATUS_BUTTON_LABELS[connector.status]}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[color:var(--color-surface-border)] px-6 py-14 text-center">
          <Search className="mx-auto h-6 w-6 text-[var(--color-text-subtle)]" />
          <p className="mt-3 text-sm font-medium text-[var(--color-text)]">
            没有匹配的连接器
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
            试试搜索其他关键词，或点击右上角「+ 自定义 MCP」。
          </p>
        </div>
      )}

      {/* Selected Connector Drawer */}
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
            <div className="flex items-start justify-between gap-4 border-b border-[color:var(--color-surface-border)] px-6 py-5">
              <div className="flex min-w-0 items-center gap-3.5">
                {(() => {
                  const tile = tileAppearance(selectedConnector.id);
                  const Icon = tile.Icon;
                  return (
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tile.bg}`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                  );
                })()}
                <div className="min-w-0">
                  <h2
                    id="connector-drawer-title"
                    className="text-lg font-semibold text-[var(--color-heading)]"
                  >
                    {selectedConnector.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
                    {selectedConnector.categoryLabel}
                    {selectedConnector.authMode &&
                    selectedConnector.authMode !== "none"
                      ? ` · ${selectedConnector.authMode}`
                      : ""}
                  </p>
                </div>
              </div>
              <button
                aria-label="关闭"
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-xl p-2 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div
                className={`flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm ${
                  selectedConnector.status === "connected"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : selectedConnector.status === "attention"
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)]"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{STATUS_BUTTON_LABELS[selectedConnector.status]}</span>
                </div>
                {selectedConnector.account ? (
                  <span className="max-w-[58%] truncate text-xs">
                    {selectedConnector.account}
                  </span>
                ) : null}
              </div>

              {selectedConnector.statusDetail ? (
                <p className="text-xs leading-5 text-[var(--color-text-muted)]">
                  {selectedConnector.statusDetail}
                </p>
              ) : null}

              {/* Google Drive Spreadsheet Binding */}
              {selectedConnector.id === "google-drive" ? (
                <div className="space-y-3 rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--color-heading)]">
                      订阅同步目标表格 (Google Sheets)
                    </span>
                    <a
                      href={spreadsheetUrl || DEFAULT_SHEET_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
                    >
                      打开表格 <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <input
                    aria-label="Google Sheets URL"
                    type="url"
                    value={spreadsheetUrl}
                    onChange={(event) => setSpreadsheetUrl(event.target.value)}
                    placeholder={DEFAULT_SHEET_URL}
                    className={inputClassName}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-subtle)]">
                    <span>
                      {selectedConnector.sheetTitle
                        ? `工作表：${selectedConnector.sheetTitle} (gid=${selectedConnector.gid ?? "0"})`
                        : "支持粘贴完整编辑链接或 gid 链接"}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => void runAction("save")}
                        className="rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                      >
                        保存表格链接
                      </button>
                      <Link
                        href="/panel/management"
                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
                      >
                        前往管理台同步
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Auth Mode Selector */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                  认证方式
                </h3>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {selectedConnector.authKinds.map((kind) => (
                    <button
                      key={kind}
                      aria-pressed={authChoice === kind}
                      type="button"
                      onClick={() => {
                        setAuthChoice(kind);
                        setActionMessage(null);
                      }}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        authChoice === kind
                          ? "border-[color:var(--color-primary)] bg-[var(--color-primary-muted)] text-[var(--color-primary)]"
                          : "border-[color:var(--color-surface-border)] text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)]"
                      }`}
                    >
                      {authButtonText(selectedConnector, kind)}
                      {kind === selectedConnector.preferredAuth ? (
                        <span className="ml-1.5 opacity-75">推荐</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              {(selectedConnector.id === "vault" ||
                selectedConnector.id === "gitea" ||
                selectedConnector.id === "gitlab" ||
                selectedConnector.isCustom) && (
                <FormField label="服务地址" hint="留空则使用环境变量默认地址。">
                  <input
                    autoComplete="url"
                    className={inputClassName}
                    value={instanceUrl}
                    onChange={(event) => setInstanceUrl(event.target.value)}
                    placeholder="https://service.example.com"
                    type="url"
                  />
                </FormField>
              )}

              {authChoice === "oidc" ? (
                <div className="space-y-3 rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--color-heading)]">
                        {selectedConnector.id === "google-drive"
                          ? "Google OAuth2 安全授权（读写 Sheets）"
                          : "OAuth2 / OIDC 安全授权"}
                      </p>
                      <p className="text-xs leading-5 text-[var(--color-text-subtle)]">
                        {selectedConnector.id === "google-drive"
                          ? "将弹出 Google OAuth2 授权窗口，完成后自动关闭并返回本页，凭据仅保存于当前登录账号。"
                          : "由服务端弹出 OAuth2 授权窗口并在完成后返回连接器中心。"}
                      </p>
                      {selectedConnector.id === "google-drive" ? (
                        <span className="inline-block rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                          {selectedConnector.oauthConfigured
                            ? "✓ 已检测到 Google OAuth Client 配置"
                            : "尚未检测到环境变量 GOOGLE_CLIENT_ID / SECRET，可展开下方填写"}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {selectedConnector.id === "google-drive" ? (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowOAuthOverrides((v) => !v)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-heading)]"
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition ${showOAuthOverrides ? "rotate-180" : ""}`}
                        />
                        自定义 OAuth Client ID / Secret（可选）
                      </button>
                      {showOAuthOverrides ? (
                        <div className="mt-3 space-y-3">
                          <FormField label="Google OAuth Client ID">
                            <input
                              className={inputClassName}
                              value={clientId}
                              onChange={(event) =>
                                setClientId(event.target.value)
                              }
                              placeholder="xxx.apps.googleusercontent.com"
                            />
                          </FormField>
                          <FormField label="Google OAuth Client Secret">
                            <input
                              className={inputClassName}
                              type="password"
                              value={clientSecret}
                              onChange={(event) =>
                                setClientSecret(event.target.value)
                              }
                              placeholder="GOCSPX-..."
                            />
                          </FormField>
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={() => void runAction("save")}
                            className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                          >
                            保存 OAuth 凭据
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => void runAction("authorize")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:opacity-90 disabled:opacity-50"
                  >
                    {busyAction === "authorize" ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                    继续 Google OAuth2 授权
                  </button>
                </div>
              ) : null}

              {authChoice === "service-account" ? (
                <FormField
                  label="Service Account JSON（备选）"
                  hint="需先将目标 Google Sheet 共享给该 Service Account 邮箱（编辑者权限）。"
                >
                  <textarea
                    rows={5}
                    className={inputClassName}
                    value={serviceAccountJson}
                    onChange={(event) =>
                      setServiceAccountJson(event.target.value)
                    }
                    placeholder='{"type":"service_account","client_email":"...","private_key":"..."}'
                  />
                </FormField>
              ) : null}

              {authChoice === "api-token" ? (
                <FormField
                  label="API Token"
                  hint="已保存的凭据不会明文显示，重新输入可覆盖轮换。"
                >
                  <input
                    autoComplete="new-password"
                    className={inputClassName}
                    type="password"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder={
                      selectedConnector.credentialConfigured
                        ? "输入新 Token 以轮换"
                        : "粘贴 API Token"
                    }
                  />
                </FormField>
              ) : null}

              {authChoice === "ak-sk" ? (
                <div className="space-y-3">
                  <FormField label="Access Key ID">
                    <input
                      className={inputClassName}
                      value={accessKey}
                      onChange={(event) => setAccessKey(event.target.value)}
                      placeholder="Access Key ID"
                    />
                  </FormField>
                  <FormField label="Secret Access Key">
                    <input
                      className={inputClassName}
                      type="password"
                      value={secretKey}
                      onChange={(event) => setSecretKey(event.target.value)}
                      placeholder="Secret Access Key"
                    />
                  </FormField>
                </div>
              ) : null}

              {authChoice === "webhook-mcp" ? (
                <FormField label="访问令牌（可选）">
                  <input
                    className={inputClassName}
                    type="password"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="Bearer token"
                  />
                </FormField>
              ) : null}

              {actionMessage ? (
                <div
                  aria-live="polite"
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    actionMessage.kind === "success"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-[color:var(--color-danger-border)] bg-[var(--color-danger-muted)]/40 text-[var(--color-danger-foreground)]"
                  }`}
                >
                  {actionMessage.text}
                </div>
              ) : null}

              {selectedConnector.lastChecked ? (
                <p className="text-xs text-[var(--color-text-subtle)]">
                  最近检测：{new Date(selectedConnector.lastChecked).toLocaleString()}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--color-surface-border)] px-6 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void runAction("check")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--color-surface-border)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50 sm:text-sm"
                >
                  {busyAction === "check" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                  检测连通性
                </button>
                {selectedConnector.credentialConfigured ? (
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => void runAction("disconnect")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--color-surface-border)] px-3 py-2 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-muted)]/30 sm:text-sm"
                  >
                    <Unplug className="h-4 w-4" />
                    断开
                  </button>
                ) : null}
              </div>

              {authChoice !== "oidc" ? (
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void runAction("save")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-foreground)] hover:opacity-90 disabled:opacity-50 sm:text-sm"
                >
                  {busyAction === "save" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  保存并连接
                </button>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}

      {/* Config Inspector Modal */}
      {configModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="连接器配置文件"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
        >
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[color:var(--color-surface-border)] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--color-heading)]">
                  连接器配置文件（已脱敏）
                </h2>
                <p className="text-xs text-[var(--color-text-subtle)]">
                  OAuth Token、Secret Key 与 Service Account 私钥不会在配置视图中暴露。
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭配置"
                onClick={() => setConfigModalOpen(false)}
                className="rounded-lg p-1.5 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {configLoading ? (
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-subtle)]">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  读取配置中…
                </div>
              ) : (
                <pre className="overflow-x-auto rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] p-4 text-xs leading-5 text-[var(--color-text)]">
                  {configJson}
                </pre>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[color:var(--color-surface-border)] px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(configJson);
                  setConfigCopied(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--color-surface-border)] px-3.5 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                <Copy className="h-3.5 w-3.5" />
                {configCopied ? "已复制" : "复制 JSON"}
              </button>
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-foreground)]"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Custom MCP Modal */}
      {customModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="新增自定义 MCP 连接器"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
        >
          <form
            onSubmit={(e) => void handleCreateCustomMcp(e)}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[color:var(--color-surface-border)] px-5 py-4">
              <h2 className="text-base font-semibold text-[var(--color-heading)]">
                添加自定义 MCP
              </h2>
              <button
                type="button"
                aria-label="关闭新增"
                onClick={() => setCustomModalOpen(false)}
                className="rounded-lg p-1.5 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <FormField label="名称">
                <input
                  required
                  className={inputClassName}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="例如：Internal CMDB MCP"
                />
              </FormField>
              <FormField label="服务地址">
                <input
                  required
                  type="url"
                  className={inputClassName}
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="https://mcp.example.com/sse"
                />
              </FormField>
              <FormField label="Bearer Token（可选）">
                <input
                  type="password"
                  className={inputClassName}
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  placeholder="Bearer token"
                />
              </FormField>
              <FormField label="描述（可选）">
                <input
                  className={inputClassName}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="服务用途说明"
                />
              </FormField>
            </div>
            <div className="flex justify-end gap-2 border-t border-[color:var(--color-surface-border)] px-5 py-3">
              <button
                type="button"
                onClick={() => setCustomModalOpen(false)}
                className="rounded-xl border border-[color:var(--color-surface-border)] px-4 py-2 text-xs font-medium text-[var(--color-text)]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={customSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-foreground)] disabled:opacity-50"
              >
                {customSaving ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                保存并接入
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

const inputClassName =
  "w-full rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary-muted)]";

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
    <label className="block space-y-1.5">
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
