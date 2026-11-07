"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  fetchAgentFreeGrants,
  revokeAgentFreeGrant,
  upsertAgentFreeGrant,
  type AgentFreeGrant,
} from "../../lib/agentFreeGrants";

const copy = {
  zh: {
    modalTitle: "Custom 节点临时 Free 白名单管理",
    modalDescription:
      "为特定账号发放、续期或撤销绑定 Custom 节点的临时 Free 访问权限。变更将通过配置分发同步至边缘 Agent。",
    readOnlyBanner:
      "当前为只读模式（Operator 权限）。仅系统管理员与 Root 可发放或撤销白名单。",
    issueSectionTitle: "发放临时 Free 白名单",
    nodeId: "目标节点 ID",
    nodeIdPlaceholder: "例如 custom-jp-01",
    targetUser: "目标用户",
    targetUserPlaceholder: "输入用户邮箱或账号 ID",
    expiresInDays: "有效期限",
    days7: "7 天",
    days14: "14 天",
    days30: "30 天",
    reason: "申请 / 审计原因",
    reasonPlaceholder: "请输入审批或发放原因（必填）",
    submit: "确认发放",
    submitting: "正在发放…",
    grantsListTitle: "已发放白名单记录",
    loadingGrants: "正在加载白名单记录…",
    loadFailed: "白名单记录加载失败",
    emptyGrants: "暂无白名单记录",
    colNode: "节点",
    colUser: "目标用户",
    colState: "状态",
    colExpires: "到期时间",
    colCreated: "创建时间",
    colReason: "原因",
    colActions: "操作",
    revoke: "撤销",
    revoking: "撤销中…",
    revokePrompt: "请输入撤销原因：",
    state: {
      active: "生效中",
      pending: "待同步",
      expired: "已过期",
      revoked: "已撤销",
      pending_revocation_ack: "待撤销同步",
    },
    close: "关闭",
    refresh: "刷新",
  },
  en: {
    modalTitle: "Custom Node Temporary Free Whitelist Grants",
    modalDescription:
      "Issue, renew, or revoke temporary Free grants for bound Custom nodes. Updates are synchronized directly to edge Agents.",
    readOnlyBanner:
      "Read-only mode (Operator permission). Only Root and Administrators can issue or revoke grants.",
    issueSectionTitle: "Issue Temporary Free Grant",
    nodeId: "Target Node ID",
    nodeIdPlaceholder: "e.g. custom-jp-01",
    targetUser: "Target User",
    targetUserPlaceholder: "Enter user email or account ID",
    expiresInDays: "Validity Period",
    days7: "7 Days",
    days14: "14 Days",
    days30: "30 Days",
    reason: "Audit Reason",
    reasonPlaceholder: "Reason for issuing grant (required)",
    submit: "Issue Grant",
    submitting: "Issuing…",
    grantsListTitle: "Active & Historical Grants",
    loadingGrants: "Loading grants…",
    loadFailed: "Failed to load grants",
    emptyGrants: "No grants found",
    colNode: "Node",
    colUser: "User",
    colState: "State",
    colExpires: "Expires At",
    colCreated: "Created At",
    colReason: "Reason",
    colActions: "Actions",
    revoke: "Revoke",
    revoking: "Revoking…",
    revokePrompt: "Please enter reason for revocation:",
    state: {
      active: "Active",
      pending: "Pending",
      expired: "Expired",
      revoked: "Revoked",
      pending_revocation_ack: "Revoking Ack",
    },
    close: "Close",
    refresh: "Refresh",
  },
};

export default function AgentFreeGrantsModal({
  isOpen,
  onClose,
  initialNodeId,
  customNodeIds = [],
  canManage,
  language = "zh",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialNodeId?: string;
  customNodeIds?: string[];
  canManage: boolean;
  language?: string;
}) {
  const t = language === "zh" ? copy.zh : copy.en;
  const [nodeId, setNodeId] = useState(initialNodeId || (customNodeIds[0] ?? ""));
  const [targetUser, setTargetUser] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    isOpen ? ["admin-agent-free-grants"] : null,
    () => fetchAgentFreeGrants(),
    { refreshInterval: 15_000 },
  );

  if (!isOpen) return null;

  const grants = data?.grants ?? [];
  const formatter = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const formatDate = (val?: string) => (val ? formatter.format(new Date(val)) : "—");

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !nodeId.trim() || !targetUser.trim() || !reason.trim()) {
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const isEmail = targetUser.includes("@");
      await upsertAgentFreeGrant({
        nodeId: nodeId.trim(),
        email: isEmail ? targetUser.trim() : undefined,
        accountId: !isEmail ? targetUser.trim() : undefined,
        expiresInDays,
        reason: reason.trim(),
      });
      setActionSuccess(language === "zh" ? "白名单发放成功" : "Grant issued successfully");
      setTargetUser("");
      setReason("");
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevoke(grant: AgentFreeGrant) {
    if (!canManage) return;
    const promptReason = window.prompt(t.revokePrompt);
    if (!promptReason || !promptReason.trim()) return;

    setActionError(null);
    setActionSuccess(null);
    try {
      await revokeAgentFreeGrant({
        nodeId: grant.nodeId,
        email: grant.email,
        accountId: grant.accountId,
        reason: promptReason.trim(),
      });
      setActionSuccess(language === "zh" ? "白名单已撤销" : "Grant revoked");
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.modalTitle}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
        <header className="flex items-start justify-between border-b border-[color:var(--color-surface-border)] pb-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-heading)]">
              {t.modalTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {t.modalDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="rounded-md border border-[color:var(--color-surface-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
          >
            {t.close}
          </button>
        </header>

        {!canManage && (
          <div
            role="status"
            className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400"
          >
            {t.readOnlyBanner}
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
          >
            {actionError}
          </div>
        )}

        {actionSuccess && (
          <div
            role="status"
            className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400"
          >
            {actionSuccess}
          </div>
        )}

        {/* Issue grant form */}
        {canManage && (
          <form
            onSubmit={handleIssue}
            className="mt-5 space-y-4 rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface-hover)]/40 p-4"
          >
            <h3 className="text-sm font-semibold text-[var(--color-heading)]">
              {t.issueSectionTitle}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                  {t.nodeId}
                </label>
                {customNodeIds.length > 0 ? (
                  <select
                    value={nodeId}
                    onChange={(e) => setNodeId(e.target.value)}
                    aria-label={t.nodeId}
                    className="mt-1 w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
                  >
                    {customNodeIds.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={nodeId}
                    onChange={(e) => setNodeId(e.target.value)}
                    placeholder={t.nodeIdPlaceholder}
                    aria-label={t.nodeId}
                    required
                    className="mt-1 w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                  {t.targetUser}
                </label>
                <input
                  type="text"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  placeholder={t.targetUserPlaceholder}
                  aria-label={t.targetUser}
                  required
                  className="mt-1 w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                  {t.expiresInDays}
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  aria-label={t.expiresInDays}
                  className="mt-1 w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
                >
                  <option value={7}>{t.days7}</option>
                  <option value={14}>{t.days14}</option>
                  <option value={30}>{t.days30}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                {t.reason}
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t.reasonPlaceholder}
                aria-label={t.reason}
                required
                className="mt-1 w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !nodeId.trim() || !targetUser.trim() || !reason.trim()}
                className="rounded-md bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {isSubmitting ? t.submitting : t.submit}
              </button>
            </div>
          </form>
        )}

        {/* Grants table list */}
        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-heading)]">
              {t.grantsListTitle}
            </h3>
            <button
              type="button"
              onClick={() => void mutate()}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              {t.refresh}
            </button>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-500">
              {t.loadFailed}
            </p>
          ) : isLoading ? (
            <p role="status" className="text-sm text-[var(--color-text-muted)]">
              {t.loadingGrants}
            </p>
          ) : grants.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">{t.emptyGrants}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-[color:var(--color-surface-border)]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[color:var(--color-surface-border)] text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t.colNode}</th>
                    <th className="px-3 py-2 font-medium">{t.colUser}</th>
                    <th className="px-3 py-2 font-medium">{t.colState}</th>
                    <th className="px-3 py-2 font-medium">{t.colExpires}</th>
                    <th className="px-3 py-2 font-medium">{t.colCreated}</th>
                    <th className="px-3 py-2 font-medium">{t.colReason}</th>
                    <th className="px-3 py-2 font-medium">{t.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {grants.map((g) => {
                    const isRevocable =
                      canManage &&
                      (g.state === "active" || g.state === "pending") &&
                      g.status !== "revoked";
                    return (
                      <tr
                        key={`${g.nodeId}-${g.email || g.accountId}-${g.createdAt}`}
                        className="border-b border-[color:var(--color-surface-border)] last:border-b-0"
                      >
                        <td className="px-3 py-2 font-mono">{g.nodeId}</td>
                        <td className="px-3 py-2">
                          {g.email || g.accountId || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                              g.state === "active"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : g.state === "pending"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : g.state === "revoked"
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {t.state[g.state] ?? g.state}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {formatDate(g.expiresAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {formatDate(g.createdAt)}
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-2">
                          {g.reason || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {isRevocable ? (
                            <button
                              type="button"
                              onClick={() => void handleRevoke(g)}
                              className="rounded border border-red-500/40 px-2 py-0.5 text-xs text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
                            >
                              {t.revoke}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
