"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Link2,
  Loader2,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { resolveCredentialReady } from "@/lib/integrations/credentialStatus";
import type { IntegrationDefaults } from "@/lib/openclaw/types";
import { useOpenClawConsoleStore } from "@/state/openclawConsoleStore";

import Card from "./Card";

type ProbeTarget = "openclaw" | "vault" | "apisix";

type ProbeState = {
  ok: boolean;
  status?: number;
  tokenSource?: string;
  body?: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown> | null;
  deviceId?: string;
};

type IntegrationsConsoleProps = {
  defaults?: IntegrationDefaults;
  onOpenAssistant?: () => void;
};

function StatusBadge({ title, ok }: { title: string; ok?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
        ok
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)]"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-[var(--color-text-subtle)]/50"}`}
      />
      {title}
    </span>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <div className="space-y-1">
        <span className="font-medium text-[var(--color-text)]">{label}</span>
        {hint ? (
          <p className="text-xs text-[var(--color-text-subtle)]">{hint}</p>
        ) : null}
      </div>
      {children}
    </label>
  );
}

function inputClassName(type: "input" | "textarea" = "input"): string {
  return [
    "w-full rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition",
    "focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary-muted)]",
    type === "textarea" ? "min-h-[120px] resize-y" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

const EMPTY_DEFAULTS: IntegrationDefaults = {
  openclawUrl: "",
  openclawOrigin: "",
  openclawTokenConfigured: false,
  vaultUrl: "",
  vaultNamespace: "",
  vaultTokenConfigured: false,
  vaultSecretPath: "",
  vaultSecretKey: "",
  apisixUrl: "",
  apisixTokenConfigured: false,
};

export function IntegrationsConsole({
  defaults,
  onOpenAssistant,
}: IntegrationsConsoleProps) {
  const [loadingTarget, setLoadingTarget] = useState<ProbeTarget | null>(null);
  const [resolvedDefaults, setResolvedDefaults] = useState<IntegrationDefaults>(
    defaults ?? EMPTY_DEFAULTS,
  );
  const [probeResults, setProbeResults] = useState<
    Record<ProbeTarget, ProbeState>
  >({
    openclaw: { ok: false },
    vault: { ok: false },
    apisix: { ok: false },
  });

  const applyDefaults = useOpenClawConsoleStore((state) => state.applyDefaults);
  const openclawUrl = useOpenClawConsoleStore((state) => state.openclawUrl);
  const openclawOrigin = useOpenClawConsoleStore((state) => state.openclawOrigin);
  const openclawToken = useOpenClawConsoleStore((state) => state.openclawToken);
  const vaultUrl = useOpenClawConsoleStore((state) => state.vaultUrl);
  const vaultNamespace = useOpenClawConsoleStore(
    (state) => state.vaultNamespace,
  );
  const vaultToken = useOpenClawConsoleStore((state) => state.vaultToken);
  const vaultSecretPath = useOpenClawConsoleStore(
    (state) => state.vaultSecretPath,
  );
  const vaultSecretKey = useOpenClawConsoleStore(
    (state) => state.vaultSecretKey,
  );
  const apisixUrl = useOpenClawConsoleStore((state) => state.apisixUrl);
  const apisixToken = useOpenClawConsoleStore((state) => state.apisixToken);
  const setOpenclawUrl = useOpenClawConsoleStore(
    (state) => state.setOpenclawUrl,
  );
  const setOpenclawOrigin = useOpenClawConsoleStore(
    (state) => state.setOpenclawOrigin,
  );
  const setOpenclawToken = useOpenClawConsoleStore(
    (state) => state.setOpenclawToken,
  );
  const setVaultUrl = useOpenClawConsoleStore((state) => state.setVaultUrl);
  const setVaultNamespace = useOpenClawConsoleStore(
    (state) => state.setVaultNamespace,
  );
  const setVaultToken = useOpenClawConsoleStore((state) => state.setVaultToken);
  const setVaultSecretPath = useOpenClawConsoleStore(
    (state) => state.setVaultSecretPath,
  );
  const setVaultSecretKey = useOpenClawConsoleStore(
    (state) => state.setVaultSecretKey,
  );
  const setApisixUrl = useOpenClawConsoleStore((state) => state.setApisixUrl);
  const setApisixToken = useOpenClawConsoleStore(
    (state) => state.setApisixToken,
  );

  useEffect(() => {
    applyDefaults(resolvedDefaults);
  }, [applyDefaults, resolvedDefaults]);

  useEffect(() => {
    if (defaults) {
      setResolvedDefaults(defaults);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/integrations/defaults", {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as IntegrationDefaults;
        if (!cancelled) {
          setResolvedDefaults(payload);
        }
      } catch {
        // Ignore; the form still works with manual input only.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [defaults]);

  const summary = useMemo(
    () => [
      {
        key: "openclaw",
        label: "OpenClaw Gateway",
        configured: Boolean(openclawUrl.trim()),
        tokenConfigured: resolveCredentialReady({
          inlineToken: openclawToken,
          storedTokenConfigured: resolvedDefaults.openclawTokenConfigured,
          vaultUrl,
          vaultSecretPath,
          vaultAuthToken: vaultToken,
          storedVaultAuthConfigured: resolvedDefaults.vaultTokenConfigured,
        }),
      },
      {
        key: "vault",
        label: "Vault Server",
        configured: Boolean(vaultUrl.trim()),
        tokenConfigured:
          resolvedDefaults.vaultTokenConfigured || Boolean(vaultToken.trim()),
      },
      {
        key: "apisix",
        label: "APISIX AI Gateway",
        configured: Boolean(apisixUrl.trim()),
        tokenConfigured: resolveCredentialReady({
          inlineToken: apisixToken,
          storedTokenConfigured: resolvedDefaults.apisixTokenConfigured,
          vaultUrl,
          vaultSecretPath,
          vaultAuthToken: vaultToken,
          storedVaultAuthConfigured: resolvedDefaults.vaultTokenConfigured,
        }),
      },
    ],
    [
      apisixToken,
      apisixUrl,
      openclawToken,
      openclawUrl,
      resolvedDefaults.apisixTokenConfigured,
      resolvedDefaults.openclawTokenConfigured,
      resolvedDefaults.vaultTokenConfigured,
      vaultToken,
      vaultSecretPath,
      vaultUrl,
    ],
  );

  async function probe(target: ProbeTarget): Promise<void> {
    setLoadingTarget(target);

    try {
      const response = await fetch("/api/integrations/probe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target,
          gatewayUrl: openclawUrl,
          gatewayOrigin: openclawOrigin,
          gatewayToken: openclawToken,
          vaultUrl,
          vaultNamespace,
          vaultToken,
          vaultSecretPath,
          vaultSecretKey,
          apisixUrl,
          apisixToken,
        }),
      });

      const payload = (await response.json()) as ProbeState;
      setProbeResults((current) => ({
        ...current,
        [target]: {
          ok: Boolean(payload.ok),
          status: payload.status ?? response.status,
          tokenSource: payload.tokenSource,
          body: payload.body,
          error: payload.error,
          code: payload.code,
          details: payload.details ?? null,
          deviceId: payload.deviceId,
        },
      }));
    } catch (error) {
      setProbeResults((current) => ({
        ...current,
        [target]: {
          ok: false,
          error: error instanceof Error ? error.message : "Probe failed.",
          details: null,
        },
      }));
    } finally {
      setLoadingTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
              Assistant Integrations
            </p>
            <h1 className="text-2xl font-semibold text-[var(--color-heading)]">
              OpenClaw / Vault / APISIX
            </h1>
            <p className="max-w-3xl text-sm text-[var(--color-text-subtle)]">
              这里是 console.svc.plus 主页 AI
              助手的统一接入层。地址可以来自环境变量，token
              既可以走服务端环境，也可以只在当前浏览器会话里临时覆盖。
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenAssistant) {
                onOpenAssistant();
                return;
              }
              // 跨 boundary（console → workspace）只能整页跳转
              window.location.assign("/xworkmate");
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-foreground)]"
          >
            打开 XWorkmate
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {summary.map((item) => (
            <div
              key={item.key}
              className="rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                    {item.configured ? "address ready" : "missing address"} ·{" "}
                    {item.tokenConfigured
                      ? "credential path ready"
                      : "credential pending"}
                  </p>
                </div>
                <StatusBadge
                  title={item.configured ? "configured" : "draft"}
                  ok={item.configured}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-muted)] text-[var(--color-primary)]">
            <Link2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--color-heading)]">
              OpenClaw Gateway
            </h2>
            <p className="text-sm text-[var(--color-text-subtle)]">
              侧栏助手与 `/xworkmate` 页面都会走这里的配置。
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Field label="WebSocket URL" hint="例如 wss://openclaw.svc.plus:443">
            <input
              type="text"
              value={openclawUrl}
              onChange={(event) => setOpenclawUrl(event.target.value)}
              className={inputClassName()}
            />
          </Field>

          <Field
            label="Gateway Token"
            hint="优先使用当前会话值，留空时回退到服务端环境变量。"
          >
            <input
              type="password"
              value={openclawToken}
              onChange={(event) => setOpenclawToken(event.target.value)}
              className={inputClassName()}
              placeholder={
                resolvedDefaults.openclawTokenConfigured
                  ? "server env configured"
                  : "paste shared token"
              }
            />
          </Field>
        </div>

        <Field
          label="Origin Override"
          hint="可选。留空时自动使用当前页面 origin，例如 https://preview.svc.plus。"
        >
          <input
            type="text"
            value={openclawOrigin}
            onChange={(event) => setOpenclawOrigin(event.target.value)}
            className={inputClassName()}
            placeholder="https://preview.svc.plus"
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void probe("openclaw");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-surface-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[color:var(--color-primary-border)] hover:bg-[var(--color-surface-muted)]"
          >
            {loadingTarget === "openclaw" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            测试 OpenClaw
          </button>
          <StatusBadge
            title={
              probeResults.openclaw.ok ? "gateway reachable" : "not checked"
            }
            ok={probeResults.openclaw.ok}
          />
          <span className="text-xs text-[var(--color-text-subtle)]">
            token source:{" "}
            {probeResults.openclaw.tokenSource ||
              (openclawToken.trim()
                ? "request"
                : resolvedDefaults.openclawTokenConfigured
                  ? "env"
                  : vaultSecretPath.trim() &&
                      (vaultToken.trim() || resolvedDefaults.vaultTokenConfigured)
                    ? "vault"
                    : "none")}
          </span>
        </div>

        {probeResults.openclaw.error ? (
          <div className="space-y-2 rounded-[var(--radius-xl)] border border-[color:var(--color-danger-border)] bg-[var(--color-danger-muted)]/40 px-4 py-3 text-sm text-[var(--color-danger-foreground)]">
            <p>{probeResults.openclaw.error}</p>
            {probeResults.openclaw.code ? (
              <p className="text-xs opacity-80">code: {probeResults.openclaw.code}</p>
            ) : null}
            {probeResults.openclaw.deviceId ? (
              <p className="text-xs opacity-80">
                deviceId: {probeResults.openclaw.deviceId}
              </p>
            ) : null}
            {stringValue(probeResults.openclaw.details?.requestId) ? (
              <p className="text-xs opacity-80">
                requestId: {stringValue(probeResults.openclaw.details?.requestId)}
              </p>
            ) : null}
            {stringValue(probeResults.openclaw.details?.reason) ? (
              <p className="text-xs opacity-80">
                reason: {stringValue(probeResults.openclaw.details?.reason)}
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-muted)] text-[var(--color-primary)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--color-heading)]">
              Vault-backed token lookup
            </h2>
            <p className="text-sm text-[var(--color-text-subtle)]">
              统一从 Vault 读取 OpenClaw / APISIX 等 token。当前会话值仍然优先。
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Field
            label="Vault Secret Path"
            hint="例如 kv/openclaw。留空则不从 Vault secret 读取 token。"
          >
            <input
              type="text"
              value={vaultSecretPath}
              onChange={(event) => setVaultSecretPath(event.target.value)}
              className={inputClassName()}
              placeholder="kv/openclaw"
            />
          </Field>

          <Field
            label="Vault Secret Key"
            hint="可选。默认会优先尝试服务默认 key，再回退到 token。"
          >
            <input
              type="text"
              value={vaultSecretKey}
              onChange={(event) => setVaultSecretKey(event.target.value)}
              className={inputClassName()}
              placeholder="token"
            />
          </Field>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-muted)] text-[var(--color-primary)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-[var(--color-heading)]">
                Vault Server
              </h2>
              <p className="text-sm text-[var(--color-text-subtle)]">
                用于托管敏感凭证与运行时密钥。
              </p>
            </div>
          </div>

          <Field label="Vault URL" hint="支持 public 或 local-first 域名。">
            <input
              type="text"
              value={vaultUrl}
              onChange={(event) => setVaultUrl(event.target.value)}
              className={inputClassName()}
            />
          </Field>

          <Field label="Namespace" hint="可选，用于多租户或分区管理。">
            <input
              type="text"
              value={vaultNamespace}
              onChange={(event) => setVaultNamespace(event.target.value)}
              className={inputClassName()}
              placeholder="admin"
            />
          </Field>

          <Field label="Vault Token" hint="留空时回退到服务端环境变量。">
            <input
              type="password"
              value={vaultToken}
              onChange={(event) => setVaultToken(event.target.value)}
              className={inputClassName()}
              placeholder={
                resolvedDefaults.vaultTokenConfigured
                  ? "server env configured"
                  : "paste vault token"
              }
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void probe("vault");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-surface-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[color:var(--color-primary-border)] hover:bg-[var(--color-surface-muted)]"
            >
              {loadingTarget === "vault" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              测试 Vault
            </button>
            <StatusBadge
              title={probeResults.vault.ok ? "vault reachable" : "not checked"}
              ok={probeResults.vault.ok}
            />
          </div>

          {probeResults.vault.error ? (
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-danger-border)] bg-[var(--color-danger-muted)]/40 px-4 py-3 text-sm text-[var(--color-danger-foreground)]">
              {probeResults.vault.error}
            </div>
          ) : null}
        </Card>

        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-muted)] text-[var(--color-primary)]">
              <Workflow className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-[var(--color-heading)]">
                APISIX AI Gateway
              </h2>
              <p className="text-sm text-[var(--color-text-subtle)]">
                统一承接模型路由、鉴权和治理入口。
              </p>
            </div>
          </div>

          <Field
            label="Gateway URL"
            hint="建议填写 OpenAI-compatible `/v1` 前缀所在地址。"
          >
            <input
              type="text"
              value={apisixUrl}
              onChange={(event) => setApisixUrl(event.target.value)}
              className={inputClassName()}
            />
          </Field>

          <Field label="Access Token" hint="留空时回退到服务端环境变量。">
            <input
              type="password"
              value={apisixToken}
              onChange={(event) => setApisixToken(event.target.value)}
              className={inputClassName()}
              placeholder={
                resolvedDefaults.apisixTokenConfigured
                  ? "server env configured"
                  : "paste ai gateway token"
              }
            />
          </Field>

          <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 px-4 py-3 text-sm text-[var(--color-text-subtle)]">
            当前实现优先补齐 console.svc.plus 主页 AI
            助手所需的接入能力。更复杂的 APISIX profile/file-driven
            配置仍保留在部署侧，不在这里硬编码。
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void probe("apisix");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-surface-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[color:var(--color-primary-border)] hover:bg-[var(--color-surface-muted)]"
            >
              {loadingTarget === "apisix" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              测试 APISIX
            </button>
            <StatusBadge
              title={
                probeResults.apisix.ok ? "gateway reachable" : "not checked"
              }
              ok={probeResults.apisix.ok}
            />
          </div>

          {probeResults.apisix.error ? (
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-danger-border)] bg-[var(--color-danger-muted)]/40 px-4 py-3 text-sm text-[var(--color-danger-foreground)]">
              {probeResults.apisix.error}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
