"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  CloudflarePlanTier,
  WafActionMode,
  WafConnectionTestResult,
  WafProviderConfig,
  WafProviderType,
  WafRemoteStatusResult,
  WafSyncResult,
} from "@server/waf/types";

const GROUPS = [
  { name: "Anthropic", bots: ["ClaudeBot", "Claude-SearchBot", "Claude-User"] },
  { name: "百度", bots: ["Baiduspider"] },
  { name: "字节跳动", bots: ["Bytespider", "TikTokSpider", "Doubaobot"] },
] as const;

const panel =
  "rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5";
const field =
  "w-full rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-heading)]";
const btnSecondary =
  "rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-sm font-medium text-[var(--color-heading)] hover:bg-[var(--color-surface-border)]/20 disabled:opacity-50";

type ProviderFormState = {
  id?: string;
  type: WafProviderType;
  name: string;
  enabled: boolean;
  domain: string;
  zoneId: string;
  planTier: CloudflarePlanTier;
  endpointUrl: string;
  credentialSource: "env" | "custom";
  secret: string;
};

function emptyForm(type: WafProviderType = "cloudflare"): ProviderFormState {
  return {
    type,
    name: "",
    enabled: true,
    domain: "",
    zoneId: "",
    planTier: "free",
    endpointUrl: "",
    credentialSource: "env",
    secret: "",
  };
}

function formFromProvider(p: WafProviderConfig): ProviderFormState {
  return {
    id: p.id,
    type: p.type,
    name: p.name,
    enabled: p.enabled,
    domain: p.domain || "",
    zoneId: p.zoneId || "",
    planTier: p.planTier || "free",
    endpointUrl: p.endpointUrl || "",
    credentialSource: p.credentialSource,
    secret: "",
  };
}

export default function CrawlerProtection() {
  const [providers, setProviders] = useState<WafProviderConfig[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState("cloudflare-default");

  const [domain, setDomain] = useState("");
  const [mode, setMode] = useState<WafActionMode>("observe");
  const [selected, setSelected] = useState<string[]>(
    GROUPS.flatMap((group) => [...group.bots]),
  );
  const [exceptionsText, setExceptionsText] = useState("/robots.txt\n/.well-known/*");

  const [editingForm, setEditingForm] = useState<ProviderFormState | null>(null);
  const [savingProvider, setSavingProvider] = useState(false);

  const [busyAction, setBusyAction] = useState<
    null | "test" | "publish" | "status"
  >(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [testResult, setTestResult] = useState<WafConnectionTestResult | null>(
    null,
  );
  const [syncResult, setSyncResult] = useState<WafSyncResult | null>(null);
  const [remoteStatus, setRemoteStatus] =
    useState<WafRemoteStatusResult | null>(null);

  const [userAgent, setUserAgent] = useState("ClaudeBot/1.0");
  const [path, setPath] = useState("/");
  const [simResult, setSimResult] = useState("");

  const activeProvider = useMemo(
    () => providers.find((p) => p.id === selectedProviderId) ?? null,
    [providers, selectedProviderId],
  );

  const loadProviders = useCallback(async (preferId?: string) => {
    setLoadingProviders(true);
    try {
      const res = await fetch("/api/ops/crawler-protection/providers", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { providers?: WafProviderConfig[] };
      const list = Array.isArray(data.providers) ? data.providers : [];
      setProviders(list);
      if (list.length > 0) {
        const targetId =
          preferId && list.some((p) => p.id === preferId)
            ? preferId
            : list.some((p) => p.id === selectedProviderId)
              ? selectedProviderId
              : list[0].id;
        setSelectedProviderId(targetId);
        const chosen = list.find((p) => p.id === targetId);
        if (chosen?.domain && !domain) {
          setDomain(chosen.domain);
        }
      }
    } catch (err) {
      setFeedback({
        kind: "error",
        text: `加载 WAF Provider 列表失败：${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setLoadingProviders(false);
    }
  }, [domain, selectedProviderId]);

  useEffect(() => {
    void loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const domainValid = useMemo(
    () => /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain),
    [domain],
  );

  const exceptions = useMemo(
    () =>
      exceptionsText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [exceptionsText],
  );

  function toggleBot(bot: string) {
    setSelected((prev) =>
      prev.includes(bot) ? prev.filter((item) => item !== bot) : [...prev, bot],
    );
    setSimResult("");
  }

  async function handleSaveProvider(event: React.FormEvent) {
    event.preventDefault();
    if (!editingForm) return;
    setSavingProvider(true);
    setFeedback(null);
    try {
      const method = editingForm.id ? "PUT" : "POST";
      const res = await fetch("/api/ops/crawler-protection/providers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingForm.id,
          type: editingForm.type,
          name: editingForm.name,
          enabled: editingForm.enabled,
          domain: editingForm.domain,
          zoneId: editingForm.zoneId,
          planTier: editingForm.planTier,
          endpointUrl: editingForm.endpointUrl,
          credentialSource: editingForm.credentialSource,
          secret: editingForm.secret || undefined,
        }),
      });
      const data = (await res.json()) as {
        provider?: WafProviderConfig;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.provider) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      setEditingForm(null);
      setFeedback({
        kind: "success",
        text: `已保存 WAF Provider：${data.provider.name}`,
      });
      if (data.provider.domain && !domain) {
        setDomain(data.provider.domain);
      }
      await loadProviders(data.provider.id);
    } catch (err) {
      setFeedback({
        kind: "error",
        text: `保存 Provider 失败：${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setSavingProvider(false);
    }
  }

  async function handleDeleteProvider(id: string) {
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/ops/crawler-protection/providers?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setEditingForm(null);
      setFeedback({ kind: "success", text: `已删除 Provider：${id}` });
      await loadProviders("cloudflare-default");
    } catch (err) {
      setFeedback({
        kind: "error",
        text: `删除 Provider 失败：${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async function handleTestConnection() {
    if (!activeProvider) return;
    setBusyAction("test");
    setFeedback(null);
    setTestResult(null);
    try {
      const res = await fetch("/api/ops/crawler-protection/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: activeProvider.id,
          domain: domain || activeProvider.domain || undefined,
        }),
      });
      const data = (await res.json()) as WafConnectionTestResult;
      setTestResult(data);
      setFeedback({
        kind: data.ok ? "success" : "error",
        text: data.message,
      });
    } catch (err) {
      setFeedback({
        kind: "error",
        text: `连接测试失败：${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleFetchStatus() {
    if (!activeProvider) return;
    setBusyAction("status");
    setFeedback(null);
    try {
      const params = new URLSearchParams({ providerId: activeProvider.id });
      if (domain) params.set("domain", domain);
      const res = await fetch(
        `/api/ops/crawler-protection/publish?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as WafRemoteStatusResult;
      setRemoteStatus(data);
      setFeedback({
        kind: data.ok ? "info" : "error",
        text: data.message,
      });
    } catch (err) {
      setFeedback({
        kind: "error",
        text: `查询远端状态失败：${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePublish() {
    if (!activeProvider || !domainValid || selected.length === 0) return;
    setBusyAction("publish");
    setFeedback(null);
    try {
      const res = await fetch("/api/ops/crawler-protection/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: activeProvider.id,
          domain,
          mode,
          bots: selected,
          exceptions,
        }),
      });
      const data = (await res.json()) as WafSyncResult & { error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      setSyncResult(data);
      setFeedback({ kind: "success", text: data.message });
    } catch (err) {
      setFeedback({
        kind: "error",
        text: `规则下发失败：${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setBusyAction(null);
    }
  }

  function simulate() {
    const matched = selected.find((bot) =>
      userAgent.toLowerCase().includes(bot.toLowerCase()),
    );
    const providerLabel = activeProvider?.name || selectedProviderId;
    if (!matched) {
      setSimResult(
        `允许：${path || "/"} 未命中已选爬虫特征 (${providerLabel})`,
      );
      return;
    }
    const label =
      mode === "block"
        ? "拒绝"
        : mode === "challenge"
          ? "托管质询 (Challenge)"
          : "观察放行";
    setSimResult(
      `${label}：命中 ${matched}，路径 ${path || "/"} (${providerLabel})`,
    );
  }

  function downloadDraft() {
    const draft = {
      domain,
      providerId: selectedProviderId,
      providerType: activeProvider?.type,
      mode,
      bots: selected,
      exceptions,
    };
    const blob = new Blob([JSON.stringify(draft, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${domain || "crawler-policy"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-heading)]">
            站点爬虫防护
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            选择并配置 WAF Provider（Cloudflare Rulesets API 或 Open Webhook / 自建边缘 WAF），下发爬虫防护规则。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setEditingForm(emptyForm("cloudflare"))}
          >
            + 新增 WAF Provider
          </button>
        </div>
      </header>

      {feedback && (
        <div
          role="status"
          className={`rounded-lg border p-3 text-sm ${
            feedback.kind === "error"
              ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
              : feedback.kind === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-[color:var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-heading)]"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {editingForm && (
        <form onSubmit={handleSaveProvider} className={`${panel} space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--color-heading)]">
              {editingForm.id ? `编辑 WAF Provider (${editingForm.id})` : "新增 WAF Provider"}
            </h2>
            <button
              type="button"
              className="text-xs text-[var(--color-text-muted)] hover:underline"
              onClick={() => setEditingForm(null)}
            >
              取消
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1 text-sm">
              Provider 类型
              <select
                className={field}
                value={editingForm.type}
                disabled={Boolean(editingForm.id)}
                onChange={(e) =>
                  setEditingForm({
                    ...editingForm,
                    type: e.target.value as WafProviderType,
                  })
                }
              >
                <option value="cloudflare">Cloudflare WAF (Rulesets API)</option>
                <option value="webhook">Open Webhook / 自建边缘 WAF</option>
              </select>
            </label>

            <label className="block space-y-1 text-sm">
              显示名称
              <input
                required
                className={field}
                value={editingForm.name}
                onChange={(e) =>
                  setEditingForm({ ...editingForm, name: e.target.value })
                }
                placeholder="例如：Cloudflare Prod / 东京自建 WAF"
              />
            </label>

            {editingForm.type === "cloudflare" ? (
              <>
                <label className="block space-y-1 text-sm">
                  默认域名 (可选，用于自动查找 Zone)
                  <input
                    className={field}
                    value={editingForm.domain}
                    onChange={(e) =>
                      setEditingForm({ ...editingForm, domain: e.target.value.trim() })
                    }
                    placeholder="svc.plus"
                  />
                </label>

                <label className="block space-y-1 text-sm">
                  Cloudflare Zone ID (可选)
                  <input
                    className={field}
                    value={editingForm.zoneId}
                    onChange={(e) =>
                      setEditingForm({ ...editingForm, zoneId: e.target.value.trim() })
                    }
                    placeholder="留空则按域名自动解析"
                  />
                </label>

                <label className="block space-y-1 text-sm">
                  Cloudflare 套餐等级
                  <select
                    className={field}
                    value={editingForm.planTier}
                    onChange={(e) =>
                      setEditingForm({
                        ...editingForm,
                        planTier: e.target.value as CloudflarePlanTier,
                      })
                    }
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="business">Business</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </label>
              </>
            ) : (
              <label className="block space-y-1 text-sm md:col-span-2">
                Webhook Endpoint URL (HTTPS)
                <input
                  required
                  type="url"
                  className={field}
                  value={editingForm.endpointUrl}
                  onChange={(e) =>
                    setEditingForm({ ...editingForm, endpointUrl: e.target.value.trim() })
                  }
                  placeholder="https://waf.internal.example/v1/crawler-policy"
                />
              </label>
            )}

            <label className="block space-y-1 text-sm">
              凭据来源
              <select
                className={field}
                value={editingForm.credentialSource}
                onChange={(e) =>
                  setEditingForm({
                    ...editingForm,
                    credentialSource: e.target.value as "env" | "custom",
                  })
                }
              >
                <option value="env">
                  服务端环境变量 (
                  {editingForm.type === "cloudflare"
                    ? "CLOUDFLARE_API_TOKEN"
                    : "WAF_WEBHOOK_SECRET"}
                  )
                </option>
                <option value="custom">自定义加密存储凭据</option>
              </select>
            </label>

            {editingForm.credentialSource === "custom" && (
              <label className="block space-y-1 text-sm">
                {editingForm.type === "cloudflare"
                  ? "Cloudflare API Token"
                  : "Webhook HMAC Secret"}
                <input
                  type="password"
                  className={field}
                  value={editingForm.secret}
                  onChange={(e) =>
                    setEditingForm({ ...editingForm, secret: e.target.value })
                  }
                  placeholder="留空则保留当前已存凭据"
                />
              </label>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editingForm.enabled}
              onChange={(e) =>
                setEditingForm({ ...editingForm, enabled: e.target.checked })
              }
            />
            启用该 WAF Provider
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={savingProvider}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingProvider ? "保存中..." : "保存 Provider 配置"}
            </button>
            {editingForm.id &&
              editingForm.id !== "cloudflare-default" &&
              editingForm.id !== "open-webhook" && (
                <button
                  type="button"
                  onClick={() => handleDeleteProvider(editingForm.id!)}
                  className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-600 hover:bg-red-500/10"
                >
                  删除该 Provider
                </button>
              )}
          </div>
        </form>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <section className={`${panel} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-[var(--color-heading)]">
              策略配置与规则下发
            </h2>
            {activeProvider && (
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    activeProvider.hasSecret
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {activeProvider.hasSecret ? "凭据就绪" : "未配置凭据"}
                </span>
                <button
                  type="button"
                  className="underline hover:text-[var(--color-heading)]"
                  onClick={() => setEditingForm(formFromProvider(activeProvider))}
                >
                  配置 Provider
                </button>
              </div>
            )}
          </div>

          <label className="block space-y-1 text-sm">
            WAF Provider
            <select
              className={field}
              aria-label="WAF Provider"
              disabled={loadingProviders}
              value={selectedProviderId}
              onChange={(event) => {
                const nextId = event.target.value;
                setSelectedProviderId(nextId);
                setTestResult(null);
                setRemoteStatus(null);
                setSyncResult(null);
                const found = providers.find((p) => p.id === nextId);
                if (found?.domain && !domain) {
                  setDomain(found.domain);
                }
              }}
            >
              {providers.length === 0 ? (
                <option value="cloudflare-default">Cloudflare WAF (加载中)</option>
              ) : (
                providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type === "cloudflare" ? "Cloudflare" : "Webhook"}
                    {!p.enabled ? " - 已禁用" : ""})
                  </option>
                ))
              )}
            </select>
          </label>

          {activeProvider?.capabilities.note && (
            <p className="text-xs text-[var(--color-text-muted)]">
              {activeProvider.capabilities.note}
            </p>
          )}

          <label className="block space-y-1 text-sm">
            站点域名
            <input
              className={field}
              value={domain}
              onChange={(event) => setDomain(event.target.value.trim())}
              placeholder="console.svc.plus"
            />
          </label>

          <label className="block space-y-1 text-sm">
            执行模式
            <select
              className={field}
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as WafActionMode);
                setSimResult("");
              }}
            >
              <option value="observe">
                观察模式 (observe{activeProvider?.type === "cloudflare" && !activeProvider.capabilities.supportsObserveMode ? " - 仅 Enterprise 支持" : ""})
              </option>
              <option value="challenge">托管质询 (challenge / managed_challenge)</option>
              <option value="block">拒绝模式 (block)</option>
            </select>
          </label>

          {GROUPS.map((group) => (
            <fieldset
              key={group.name}
              className="rounded-lg border border-[color:var(--color-surface-border)] p-3"
            >
              <legend className="px-1 text-sm font-semibold">{group.name}</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {group.bots.map((bot) => (
                  <label key={bot} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(bot)}
                      onChange={() => toggleBot(bot)}
                    />
                    {bot}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <label className="block space-y-1 text-sm">
            例外路径 (每行或逗号分隔，跳过拦截)
            <textarea
              rows={2}
              className={field}
              value={exceptionsText}
              onChange={(e) => setExceptionsText(e.target.value)}
              placeholder="/robots.txt"
            />
          </label>

          <p className="text-xs text-[var(--color-text-muted)]">
            建议保留 `/robots.txt` 与 `/.well-known/*` 例外；User-Agent 可被伪造，建议配合速率限制与质询模式。
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePublish}
              disabled={
                busyAction !== null ||
                !activeProvider ||
                !activeProvider.enabled ||
                !domainValid ||
                selected.length === 0
              }
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busyAction === "publish" ? "下发中..." : "下发规则到 WAF"}
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={busyAction !== null || !activeProvider}
              className={btnSecondary}
            >
              {busyAction === "test" ? "测试中..." : "测试连接"}
            </button>
            <button
              type="button"
              onClick={handleFetchStatus}
              disabled={busyAction !== null || !activeProvider}
              className={btnSecondary}
            >
              {busyAction === "status" ? "查询中..." : "查询远端状态"}
            </button>
            <button
              type="button"
              onClick={downloadDraft}
              disabled={!domainValid}
              className={btnSecondary}
            >
              导出草稿
            </button>
          </div>
        </section>

        <div className="space-y-5">
          <section className={`${panel} space-y-3`}>
            <h2 className="font-semibold text-[var(--color-heading)]">
              WAF 远端状态与同步记录
            </h2>
            {syncResult ? (
              <div className="space-y-1.5 text-xs">
                <div className="font-medium text-emerald-600 dark:text-emerald-400">
                  已下发：{syncResult.appliedAction} ({syncResult.domain})
                </div>
                {syncResult.ruleId && (
                  <div className="text-[var(--color-text-muted)]">
                    Rule ID: <code>{syncResult.ruleId}</code>
                  </div>
                )}
                {syncResult.expression && (
                  <pre className="overflow-x-auto rounded bg-black/5 p-2 text-[11px] dark:bg-white/5">
                    {syncResult.expression}
                  </pre>
                )}
              </div>
            ) : remoteStatus ? (
              <div className="space-y-1.5 text-xs">
                <div>
                  状态：
                  {remoteStatus.configured ? (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      已部署 ({remoteStatus.action})
                    </span>
                  ) : (
                    <span className="text-[var(--color-text-muted)]">未部署</span>
                  )}
                </div>
                {remoteStatus.expression && (
                  <pre className="overflow-x-auto rounded bg-black/5 p-2 text-[11px] dark:bg-white/5">
                    {remoteStatus.expression}
                  </pre>
                )}
              </div>
            ) : testResult ? (
              <div className="text-xs text-[var(--color-text-muted)]">
                {testResult.message}
                {testResult.zoneId ? ` (Zone: ${testResult.zoneId})` : ""}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">
                点击“测试连接”、“查询远端状态”或“下发规则到 WAF”查看实时同步结果。
              </p>
            )}
          </section>

          <section className={`${panel} space-y-4`}>
            <h2 className="font-semibold text-[var(--color-heading)]">
              模拟请求
            </h2>
            <label className="block space-y-1 text-sm">
              User-Agent
              <input
                className={field}
                value={userAgent}
                onChange={(event) => {
                  setUserAgent(event.target.value);
                  setSimResult("");
                }}
              />
            </label>
            <label className="block space-y-1 text-sm">
              请求路径
              <input
                className={field}
                value={path}
                onChange={(event) => {
                  setPath(event.target.value);
                  setSimResult("");
                }}
              />
            </label>
            <button
              type="button"
              onClick={simulate}
              className="rounded-lg border border-[color:var(--color-surface-border)] px-4 py-2 text-sm font-semibold"
            >
              模拟请求
            </button>
            {simResult && (
              <div className="rounded-lg border border-[color:var(--color-surface-border)] p-3 text-sm">
                {simResult}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
