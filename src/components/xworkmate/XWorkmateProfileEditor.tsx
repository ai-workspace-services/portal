"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { resolveCredentialReady } from "@/lib/integrations/credentialStatus";
import type { IntegrationDefaults } from "@/lib/openclaw/types";
import type { XWorkmateProfileResponse } from "@/lib/xworkmate/types";
import { toXWorkmateIntegrationDefaults } from "@/lib/xworkmate/types";
import { useOpenClawConsoleStore } from "@/state/openclawConsoleStore";

type ProbeTarget = "openclaw" | "vault" | "apisix";

type ProbeState = {
  ok: boolean;
  status?: number;
  error?: string;
  body?: string;
};

type XWorkmateProfileEditorProps = {
  payload: XWorkmateProfileResponse;
  scopeKey: string;
  workspaceHref: string;
};

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
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
      {label}
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

export function XWorkmateProfileEditor({
  payload,
  scopeKey,
  workspaceHref,
}: XWorkmateProfileEditorProps) {
  const defaults = useMemo<IntegrationDefaults>(
    () => toXWorkmateIntegrationDefaults(payload),
    [payload],
  );
  const setScope = useOpenClawConsoleStore((state) => state.setScope);
  const openclawUrl = useOpenClawConsoleStore((state) => state.openclawUrl);
  const openclawOrigin = useOpenClawConsoleStore(
    (state) => state.openclawOrigin,
  );
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

  const [saving, setSaving] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState<ProbeTarget | null>(null);
  const [saveState, setSaveState] = useState<string>("");
  const [probeResults, setProbeResults] = useState<
    Record<ProbeTarget, ProbeState>
  >({
    openclaw: { ok: false },
    vault: { ok: false },
    apisix: { ok: false },
  });

  useEffect(() => {
    setScope(scopeKey, defaults);
  }, [defaults, scopeKey, setScope]);

  const summary = useMemo(
    () => [
      {
        key: "openclaw",
        label: "OpenClaw",
        configured: Boolean(openclawUrl.trim()),
        tokenConfigured: resolveCredentialReady({
          inlineToken: openclawToken,
          storedTokenConfigured: payload.tokenConfigured.openclaw,
          vaultUrl,
          vaultSecretPath,
          vaultAuthToken: vaultToken,
          storedVaultAuthConfigured: payload.tokenConfigured.vault,
        }),
      },
      {
        key: "vault",
        label: "Vault",
        configured: Boolean(vaultUrl.trim()),
        tokenConfigured:
          payload.tokenConfigured.vault || Boolean(vaultToken.trim()),
      },
      {
        key: "apisix",
        label: "APISIX",
        configured: Boolean(apisixUrl.trim()),
        tokenConfigured: resolveCredentialReady({
          inlineToken: apisixToken,
          storedTokenConfigured: payload.tokenConfigured.apisix,
          vaultUrl,
          vaultSecretPath,
          vaultAuthToken: vaultToken,
          storedVaultAuthConfigured: payload.tokenConfigured.vault,
        }),
      },
    ],
    [
      apisixToken,
      apisixUrl,
      openclawToken,
      openclawUrl,
      payload.tokenConfigured.apisix,
      payload.tokenConfigured.openclaw,
      payload.tokenConfigured.vault,
      vaultSecretPath,
      vaultToken,
      vaultUrl,
    ],
  );

  async function probe(target: ProbeTarget) {
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

      const payload = (await response.json().catch(() => ({}))) as ProbeState;
      setProbeResults((current) => ({
        ...current,
        [target]: {
          ok: Boolean(response.ok && payload.ok),
          status: payload.status ?? response.status,
          error: payload.error,
          body: typeof payload.body === "string" ? payload.body : "",
        },
      }));
    } finally {
      setLoadingTarget(null);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setSaveState("");
    try {
      const response = await fetch("/api/xworkmate/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: {
            openclawUrl,
            openclawOrigin,
            vaultUrl,
            vaultNamespace,
            vaultSecretPath,
            vaultSecretKey,
            apisixUrl,
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "save_failed");
      }

      setSaveState("已保存配置。临时 token 仍只保留在当前浏览器会话。");
    } catch (error) {
      console.error("Failed to save xworkmate profile", error);
      setSaveState("保存失败，请检查权限或服务连接。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-[color:var(--color-surface-border)] bg-white/96 px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                ok={payload.canEditIntegrations}
                label={
                  payload.profileScope === "tenant-shared"
                    ? "共享版配置"
                    : "个人独享配置"
                }
              />
              <StatusBadge
                ok={payload.membershipRole === "admin"}
                label={`角色 · ${payload.membershipRole}`}
              />
              <StatusBadge
                ok={summary.some((item) => item.configured)}
                label={`${payload.tenant.name} · ${payload.tenant.domain}`}
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-black">
                {payload.profileScope === "tenant-shared"
                  ? "共享集成配置"
                  : "我的集成配置"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-subtle)]">
                {payload.profileScope === "tenant-shared"
                  ? "这组配置对 svc.plus/xworkmate 的共享工作台生效，只有管理员可编辑。"
                  : "这组配置只对当前租户域名下的你自己生效，不影响其他成员。"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={workspaceHref}
              className="inline-flex h-11 items-center rounded-[14px] border border-[color:var(--color-surface-border)] bg-white px-5 text-sm font-semibold text-[var(--color-heading)] transition hover:bg-[var(--color-surface-hover)]"
            >
              返回工作台
            </Link>
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving || !payload.canEditIntegrations}
              className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(51,102,255,0.28)] transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              保存配置
            </button>
          </div>
        </div>
        {saveState ? (
          <p className="mt-4 text-sm text-[var(--color-text-subtle)]">
            {saveState}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {summary.map((item) => (
          <div
            key={item.key}
            className="rounded-[22px] border border-[color:var(--color-surface-border)] bg-white/92 p-5 shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--color-heading)]">
                  {item.label}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
                  {item.configured ? "已填写连接信息" : "等待配置"}
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge ok={item.configured} label="地址" />
              <StatusBadge ok={item.tokenConfigured} label="凭证" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-4 rounded-[24px] border border-[color:var(--color-surface-border)] bg-white/96 p-5 shadow-[var(--shadow-sm)]">
          <Field label="OpenClaw WebSocket URL">
            <input
              value={openclawUrl}
              onChange={(event) => setOpenclawUrl(event.target.value)}
              placeholder="wss://openclaw.svc.plus"
              className={inputClassName()}
            />
          </Field>
          <Field
            label="OpenClaw Origin"
            hint="留空时允许前端按当前页面 origin 发送。"
          >
            <input
              value={openclawOrigin}
              onChange={(event) => setOpenclawOrigin(event.target.value)}
              placeholder={`https://${payload.tenant.domain}`}
              className={inputClassName()}
            />
          </Field>
          <Field
            label="OpenClaw Token"
            hint="仅保留在当前浏览器会话，不会持久化到服务端。"
          >
            <input
              type="password"
              value={openclawToken}
              onChange={(event) => setOpenclawToken(event.target.value)}
              placeholder="Session token only"
              className={inputClassName()}
            />
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-heading)]">
                探测 OpenClaw
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                {probeResults.openclaw.error || "检查网关连接和会话 token。"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => probe("openclaw")}
              className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[color:var(--color-surface-border)] bg-white px-4 text-sm font-semibold text-[var(--color-heading)] transition hover:bg-[var(--color-surface-hover)]"
            >
              {loadingTarget === "openclaw" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              测试
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-[24px] border border-[color:var(--color-surface-border)] bg-white/96 p-5 shadow-[var(--shadow-sm)]">
          <Field label="Vault URL">
            <input
              value={vaultUrl}
              onChange={(event) => setVaultUrl(event.target.value)}
              placeholder="https://vault.svc.plus"
              className={inputClassName()}
            />
          </Field>
          <Field label="Vault Namespace">
            <input
              value={vaultNamespace}
              onChange={(event) => setVaultNamespace(event.target.value)}
              placeholder="admin"
              className={inputClassName()}
            />
          </Field>
          <Field
            label="Vault Token"
            hint="仅用于当前浏览器会话内探测或读取引用。"
          >
            <input
              type="password"
              value={vaultToken}
              onChange={(event) => setVaultToken(event.target.value)}
              placeholder="Session token only"
              className={inputClassName()}
            />
          </Field>
          <Field label="Vault Secret Path">
            <input
              value={vaultSecretPath}
              onChange={(event) => setVaultSecretPath(event.target.value)}
              placeholder="kv/openclaw"
              className={inputClassName()}
            />
          </Field>
          <Field label="Vault Secret Key">
            <input
              value={vaultSecretKey}
              onChange={(event) => setVaultSecretKey(event.target.value)}
              placeholder="token"
              className={inputClassName()}
            />
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-heading)]">
                探测 Vault
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                {probeResults.vault.error ||
                  "验证 Vault 地址、namespace 与 token。"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => probe("vault")}
              className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[color:var(--color-surface-border)] bg-white px-4 text-sm font-semibold text-[var(--color-heading)] transition hover:bg-[var(--color-surface-hover)]"
            >
              {loadingTarget === "vault" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              测试
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-[color:var(--color-surface-border)] bg-white/96 p-5 shadow-[var(--shadow-sm)]">
        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <Field label="APISIX URL">
            <input
              value={apisixUrl}
              onChange={(event) => setApisixUrl(event.target.value)}
              placeholder="https://ai-gateway.svc.plus"
              className={inputClassName()}
            />
          </Field>
          <Field label="APISIX Token" hint="同样只保留在当前浏览器 session。">
            <input
              type="password"
              value={apisixToken}
              onChange={(event) => setApisixToken(event.target.value)}
              placeholder="Session token only"
              className={inputClassName()}
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[18px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-heading)]">
              探测 APISIX
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              {probeResults.apisix.error ||
                "验证 AI Gateway 地址和临时 token。"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => probe("apisix")}
            className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[color:var(--color-surface-border)] bg-white px-4 text-sm font-semibold text-[var(--color-heading)] transition hover:bg-[var(--color-surface-hover)]"
          >
            {loadingTarget === "apisix" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            测试
          </button>
        </div>
      </div>
    </div>
  );
}
