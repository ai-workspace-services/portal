"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Loader2, RefreshCw, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useUserStore } from "@lib/userStore";
import { ADMIN_API_BASE } from "../../lib/adminApi";
import { quotaFromGB, quotaToGB } from "../planCatalog";

export type WhitelistGroupMember = {
  userId: string;
  email: string;
  name?: string;
  role?: string;
  remainingIncludedQuota?: number;
  includedQuotaBytes?: number;
  proxyAccessState?: string;
  hasPaidSubscription?: boolean;
  currentPlanId?: string;
};

export type WhitelistGroup = {
  groupId: string;
  displayName: string;
  monthlyQuotaBytes: number;
  allowedPools: string[];
  active: boolean;
  description?: string;
  members: WhitelistGroupMember[];
};

const POOL_OPTIONS = [
  { id: "Media-Pool", label: "Media-Pool（基础共享池）" },
  { id: "Pro-EC2-Pool", label: "Pro-EC2-Pool（高速池）" },
];

const inputClass =
  "w-full rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-heading)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-muted)]";

const panelClass =
  "rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)]";

async function fetchWhitelistGroups(
  url: string,
): Promise<{ groups: WhitelistGroup[] }> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("无法加载白名单用户组配置，请重试。");
  }
  return response.json();
}

export default function OpsWhitelistGroupCard() {
  const user = useUserStore((s) => s.user);
  const canManageConfig = Boolean(
    user?.isRoot ||
      user?.isAdmin ||
      user?.permissions?.includes("*") ||
      user?.permissions?.includes("admin.billing.money.write"),
  );
  const canManageMembers = Boolean(
    canManageConfig ||
      user?.role === "operator" ||
      user?.permissions?.includes("admin.settings.write"),
  );

  const { data, error, isLoading, mutate } = useSWR(
    `${ADMIN_API_BASE}/billing/whitelist-groups`,
    fetchWhitelistGroups,
    { revalidateOnFocus: false },
  );

  const groups = Array.isArray(data?.groups) ? data.groups : [];
  const activeGroup =
    groups.find((g) => g.groupId === "WHITELIST-FREE") ?? groups[0] ?? null;

  const [displayName, setDisplayName] = useState("白名单免费组");
  const [monthlyQuotaGB, setMonthlyQuotaGB] = useState("5");
  const [allowedPools, setAllowedPools] = useState<string[]>(["Media-Pool"]);
  const [active, setActive] = useState(true);
  const [description, setDescription] = useState("");
  const [configReason, setConfigReason] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberReason, setMemberReason] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [mutatingMember, setMutatingMember] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!activeGroup) return;
    setDisplayName(activeGroup.displayName || activeGroup.groupId);
    setMonthlyQuotaGB(quotaToGB(activeGroup.monthlyQuotaBytes) || "5");
    setAllowedPools(
      Array.isArray(activeGroup.allowedPools) && activeGroup.allowedPools.length > 0
        ? activeGroup.allowedPools
        : ["Media-Pool"],
    );
    setActive(Boolean(activeGroup.active));
    setDescription(activeGroup.description || "");
  }, [activeGroup]);

  const togglePool = (poolId: string) => {
    setAllowedPools((prev) =>
      prev.includes(poolId)
        ? prev.filter((item) => item !== poolId)
        : [...prev, poolId],
    );
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;
    setActionError("");
    setStatusMessage("");
    try {
      if (!configReason.trim()) {
        throw new Error("请填写白名单额度或池权限变更原因。");
      }
      if (allowedPools.length === 0) {
        throw new Error("请至少保留一个可用节点池。");
      }
      const monthlyQuotaBytes = quotaFromGB(monthlyQuotaGB);
      setSavingConfig(true);
      const response = await fetch(
        `${ADMIN_API_BASE}/billing/whitelist-groups/${encodeURIComponent(activeGroup.groupId)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName.trim() || activeGroup.displayName,
            monthlyQuotaBytes,
            allowedPools,
            active,
            description: description.trim(),
            reason: configReason.trim(),
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof payload?.message === "string"
            ? payload.message
            : typeof payload?.error === "string"
              ? payload.error
              : "保存白名单组配置失败。",
        );
      }
      setConfigReason("");
      await mutate();
      setStatusMessage(
        `${displayName.trim() || activeGroup.groupId} 已更新为每月 ${monthlyQuotaGB} GB（${allowedPools.join(", ")}）。`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "保存白名单配置失败。");
    } finally {
      setSavingConfig(false);
    }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;
    setActionError("");
    setStatusMessage("");
    try {
      const email = memberEmail.trim();
      const reason = memberReason.trim();
      if (!email) {
        throw new Error("请输入要加入白名单的用户邮箱。");
      }
      if (!reason) {
        throw new Error("请填写加入白名单操作原因。");
      }
      setMutatingMember(true);
      const response = await fetch(
        `${ADMIN_API_BASE}/billing/whitelist-groups/${encodeURIComponent(activeGroup.groupId)}/members`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, reason }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof payload?.message === "string"
            ? payload.message
            : typeof payload?.error === "string"
              ? payload.error
              : "添加白名单成员失败。",
        );
      }
      setMemberEmail("");
      setMemberReason("");
      await mutate();
      setStatusMessage(`已将 ${email} 加入 ${activeGroup.displayName || activeGroup.groupId}。`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "添加成员失败。");
    } finally {
      setMutatingMember(false);
    }
  };

  const removeMember = async (member: WhitelistGroupMember) => {
    if (!activeGroup) return;
    setActionError("");
    setStatusMessage("");
    const reason =
      memberReason.trim() || configReason.trim() || `移除白名单成员 ${member.email}`;
    try {
      setMutatingMember(true);
      const response = await fetch(
        `${ADMIN_API_BASE}/billing/whitelist-groups/${encodeURIComponent(activeGroup.groupId)}/members/${encodeURIComponent(member.userId)}?reason=${encodeURIComponent(reason)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof payload?.message === "string"
            ? payload.message
            : typeof payload?.error === "string"
              ? payload.error
              : "移除白名单成员失败。",
        );
      }
      await mutate();
      setStatusMessage(
        `已将 ${member.email} 移出白名单（若无有效付费订阅将进入暂停流量模式）。`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "移除成员失败。");
    } finally {
      setMutatingMember(false);
    }
  };

  return (
    <section
      className={`${panelClass} min-w-0 p-4 sm:p-5`}
      aria-labelledby="whitelist-group-heading"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h2
              id="whitelist-group-heading"
              className="text-lg font-semibold text-[var(--color-heading)]"
            >
              白名单免费用户组（可配置）
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
              替代已下线的公开 Free 套餐；支持自定义每月免费流量（默认 5 GB/月）与节点池权限（默认仅基础共享池 Media-Pool），成员列表完全由数据库维护。
            </p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
          aria-label="刷新白名单用户组"
          onClick={() => void mutate()}
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
        </button>
      </header>

      {error && (
        <p role="alert" className="mb-3 text-sm text-[var(--color-danger)]">
          {error.message}
        </p>
      )}

      {!activeGroup ? (
        <p className="py-4 text-sm text-[var(--color-text-muted)]">
          {isLoading ? "加载白名单分组中…" : "暂无可配置的白名单分组（请先完成数据库迁移）。"}
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <form onSubmit={(e) => void saveConfig(e)} className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-heading)]">
              分组额度与节点池规则（{activeGroup.groupId}）
            </h3>
            <fieldset disabled={!canManageConfig || savingConfig} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1 text-xs text-[var(--color-text-muted)]">
                  <span>分组名称</span>
                  <input
                    type="text"
                    className={inputClass}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </label>
                <label className="block space-y-1 text-xs text-[var(--color-text-muted)]">
                  <span>每月免费额度（GB/月）</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    className={inputClass}
                    value={monthlyQuotaGB}
                    onChange={(e) => setMonthlyQuotaGB(e.target.value)}
                  />
                </label>
              </div>
              <fieldset className="space-y-1.5">
                <legend className="text-xs text-[var(--color-text-muted)]">
                  允许访问节点池
                </legend>
                <div className="flex flex-wrap gap-3">
                  {POOL_OPTIONS.map((pool) => (
                    <label
                      key={pool.id}
                      className="inline-flex items-center gap-2 text-xs text-[var(--color-heading)]"
                    >
                      <input
                        type="checkbox"
                        checked={allowedPools.includes(pool.id)}
                        onChange={() => togglePool(pool.id)}
                      />
                      <span>{pool.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block space-y-1 text-xs text-[var(--color-text-muted)]">
                <span>分组说明</span>
                <input
                  type="text"
                  className={inputClass}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-[var(--color-heading)]">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <span>启用该白名单免费分组（按自然月重置额度）</span>
              </label>
              <label className="block space-y-1 text-xs text-[var(--color-text-muted)]">
                <span>配置修改原因</span>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="例如：调整月度白名单免费额度"
                  value={configReason}
                  onChange={(e) => setConfigReason(e.target.value)}
                />
              </label>
            </fieldset>
            {canManageConfig && (
              <button
                type="submit"
                disabled={savingConfig}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50 dark:bg-[var(--color-action)]"
              >
                {savingConfig && <Loader2 size={14} className="animate-spin" />}
                保存白名单配额与池规则
              </button>
            )}
          </form>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-heading)]">
                白名单成员（{activeGroup.members?.length ?? 0} 人）
              </h3>
              <span className="rounded-full border border-[color:var(--color-surface-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                当前额度：{quotaToGB(activeGroup.monthlyQuotaBytes)} GB/月
              </span>
            </div>

            {canManageMembers && (
              <form onSubmit={(e) => void addMember(e)} className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="email"
                    aria-label="新增白名单成员邮箱"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="user@example.com"
                    className={inputClass}
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                  />
                  <input
                    type="text"
                    aria-label="白名单成员变更原因"
                    placeholder="原因（必填，如：审核/首批白名单）"
                    className={inputClass}
                    value={memberReason}
                    onChange={(e) => setMemberReason(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={mutatingMember}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-heading)] hover:border-[var(--color-primary)] disabled:opacity-50"
                >
                  <UserPlus size={14} />
                  添加白名单成员
                </button>
              </form>
            )}

            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {(activeGroup.members ?? []).map((member) => {
                const remainGB = quotaToGB(member.remainingIncludedQuota);
                const includedGB = quotaToGB(member.includedQuotaBytes);
                return (
                  <li
                    key={member.userId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--color-heading)]">
                        {member.email}
                      </p>
                      <p className="text-[var(--color-text-subtle)]">
                        剩余 {remainGB || "0"} / {includedGB || "0"} GB
                        {member.proxyAccessState ? ` · ${member.proxyAccessState}` : ""}
                        {member.hasPaidSubscription && member.currentPlanId
                          ? ` · 付费(${member.currentPlanId})`
                          : ""}
                      </p>
                    </div>
                    {canManageMembers && (
                      <button
                        type="button"
                        disabled={mutatingMember}
                        onClick={() => void removeMember(member)}
                        aria-label={`移除 ${member.email}`}
                        className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        移除
                      </button>
                    )}
                  </li>
                );
              })}
              {(activeGroup.members?.length ?? 0) === 0 && (
                <li className="py-3 text-center text-xs text-[var(--color-text-subtle)]">
                  暂无白名单成员
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {actionError && (
        <p role="alert" className="mt-3 text-xs text-[var(--color-danger)]">
          {actionError}
        </p>
      )}
      {statusMessage && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 text-xs text-[var(--color-success-foreground)]"
        >
          {statusMessage}
        </p>
      )}
    </section>
  );
}
