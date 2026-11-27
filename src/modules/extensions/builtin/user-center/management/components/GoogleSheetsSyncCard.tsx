"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ExternalLink,
  GitCompareArrows,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import type { ConnectorRuntime } from "../../components/IntegrationsConsole";
import {
  authorizeConnectorWithPopup,
  openOAuthPopupWindow,
} from "../../lib/oauthPopup";
import type { AdminPlanGroupPreview } from "./UserGroupManagement";

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1V4u9b6MFIJgVuVAb056jidZLSFMiyhJJj9eDSGud1_I/edit?gid=1136257492#gid=1136257492";

type DiffStatus =
  | "in_sync"
  | "pull_candidate"
  | "push_candidate"
  | "conflict"
  | "unregistered";

type FieldDifference = {
  field: string;
  label: string;
  sheetValue: string;
  systemValue: string;
};

type SubscriptionDiffRow = {
  email: string;
  status: DiffStatus;
  sheetRowNumber?: number;
  differences: FieldDifference[];
};

type DiffResponse = {
  spreadsheetUrl: string;
  spreadsheetId: string;
  gid: string;
  sheetTitle: string;
  authMode: string;
  writable: boolean;
  account?: string;
  diff: {
    totalSheetRows: number;
    totalSystemRecords: number;
    inSyncCount: number;
    pullCandidateCount: number;
    pushCandidateCount: number;
    conflictCount: number;
    unregisteredCount: number;
    rows: SubscriptionDiffRow[];
    pullCsv: string;
  };
};

type PushPreviewState = {
  writable: boolean;
  sheetTitle: string;
  updatedCount: number;
  appendedCount: number;
  preservedUnregisteredCount: number;
  totalOutputRows: number;
};

type Props = {
  onSubscriptionRecordsImport?: (
    csv: string,
    reason: string,
  ) => Promise<AdminPlanGroupPreview>;
  onShowImportPreview?: (preview: AdminPlanGroupPreview, reason: string) => void;
};

const DIFF_LABELS: Record<DiffStatus, string> = {
  in_sync: "已一致",
  pull_candidate: "待拉取 (表→库)",
  push_candidate: "待推送 (库→表)",
  conflict: "字段差异",
  unregistered: "未注册账号",
};

const DIFF_STYLES: Record<DiffStatus, string> = {
  in_sync:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pull_candidate:
    "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  push_candidate:
    "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  conflict:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  unregistered:
    "border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)]",
};

export function GoogleSheetsSyncCard({
  onSubscriptionRecordsImport,
  onShowImportPreview,
}: Props) {
  const [connector, setConnector] = useState<ConnectorRuntime | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(DEFAULT_SHEET_URL);
  const [diffResult, setDiffResult] = useState<DiffResponse | null>(null);
  const [pushPreview, setPushPreview] = useState<PushPreviewState | null>(null);
  const [busy, setBusy] = useState<
    "authorize" | "diff" | "pull" | "push-preview" | "push-apply" | null
  >(null);
  const [statusMessage, setStatusMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (typeof fetch !== "function") return;
    try {
      const request = fetch("/api/connectors", { cache: "no-store" });
      if (!request || typeof request.then !== "function") return;
      void request
        .then(async (response) => {
          if (!response || !response.ok) return;
          const payload = (await response.json()) as Record<
            string,
            ConnectorRuntime
          >;
          const drive = payload?.["google-drive"];
          if (!cancelled && drive) {
            setConnector(drive);
            if (drive.spreadsheetUrl) {
              setSpreadsheetUrl(drive.spreadsheetUrl);
            }
          }
        })
        .catch(() => undefined);
    } catch {
      // ignore fetch errors in non-browser test environments
    }
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshDriveRuntime() {
    try {
      const response = await fetch("/api/connectors", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as Record<
        string,
        ConnectorRuntime
      >;
      const drive = payload?.["google-drive"];
      if (drive) {
        setConnector(drive);
        if (drive.spreadsheetUrl) {
          setSpreadsheetUrl(drive.spreadsheetUrl);
        }
      }
    } catch {
      // ignore refresh errors
    }
  }

  async function handleAuthorize() {
    setBusy("authorize");
    setStatusMessage(null);
    const popup = openOAuthPopupWindow("Google Drive OAuth2 授权");
    try {
      const outcome = await authorizeConnectorWithPopup({
        connectorId: "google-drive",
        popup,
        body: {
          spreadsheetUrl: spreadsheetUrl.trim(),
          returnTo: "/panel/management",
        },
      });
      if (!outcome.ok) {
        throw new Error(outcome.error || "Google OAuth2 授权未完成");
      }
      if (outcome.redirected) {
        return;
      }
      await refreshDriveRuntime();
      setBusy(null);
      setStatusMessage({
        kind: "success",
        text: outcome.account
          ? `Google OAuth2 授权成功（${outcome.account}），正在自动比对表格…`
          : "Google OAuth2 授权成功，正在自动比对表格…",
      });
      await runDiff();
    } catch (error) {
      setStatusMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "OAuth2 授权失败",
      });
      setBusy(null);
    }
  }

  async function runDiff(): Promise<DiffResponse | null> {
    setBusy("diff");
    setStatusMessage(null);
    setPushPreview(null);
    try {
      const response = await fetch("/api/connectors/google-drive/sheets/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetUrl: spreadsheetUrl.trim() }),
      });
      const payload = (await response.json().catch(() => ({}))) as DiffResponse & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || "双向比对失败");
      }
      setDiffResult(payload);
      setStatusMessage({
        kind: "success",
        text: `已对比「${payload.sheetTitle}」(${payload.authMode === "public-csv" ? "只读链接模式" : "Google OAuth2 读写模式"})：表格 ${payload.diff.totalSheetRows} 行，系统 ${payload.diff.totalSystemRecords} 条。`,
      });
      return payload;
    } catch (error) {
      setStatusMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "双向比对失败",
      });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function handlePullToSystem() {
    if (!onSubscriptionRecordsImport) return;
    setBusy("pull");
    setStatusMessage(null);
    try {
      let current = diffResult;
      if (!current) {
        const response = await fetch("/api/connectors/google-drive/sheets/diff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spreadsheetUrl: spreadsheetUrl.trim() }),
        });
        const payload = (await response.json().catch(() => ({}))) as DiffResponse & {
          message?: string;
        };
        if (!response.ok) {
          throw new Error(payload.message || "拉取 Google Sheet 失败");
        }
        current = payload;
        setDiffResult(payload);
      }

      const reason = `Google Sheets 双向同步拉取 (${current.spreadsheetId} / ${current.sheetTitle})`;
      const preview = await onSubscriptionRecordsImport(
        current.diff.pullCsv,
        reason,
      );
      if (onShowImportPreview) {
        onShowImportPreview(preview, reason);
      }
      if (preview.noChanges || preview.changes.length === 0) {
        setStatusMessage({
          kind: "success",
          text: `拉取检查完成：系统与表格已一致（跳过未注册 ${current.diff.unregisteredCount} 条）。`,
        });
      }
    } catch (error) {
      setStatusMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "拉取预览失败",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handlePushPreview() {
    setBusy("push-preview");
    setStatusMessage(null);
    try {
      const response = await fetch("/api/connectors/google-drive/sheets/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "preview",
          spreadsheetUrl: spreadsheetUrl.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as PushPreviewState & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || "生成回写预览失败");
      }
      setPushPreview(payload);
      if (!payload.writable) {
        setStatusMessage({
          kind: "error",
          text: "当前为只读模式，无法写回 Google Sheet。请先点击「Google OAuth2 授权」。",
        });
      }
    } catch (error) {
      setStatusMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "生成回写预览失败",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handlePushApply() {
    setBusy("push-apply");
    setStatusMessage(null);
    try {
      const response = await fetch("/api/connectors/google-drive/sheets/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "apply",
          spreadsheetUrl: spreadsheetUrl.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        updatedCount?: number;
        appendedCount?: number;
        preservedUnregisteredCount?: number;
        sheetTitle?: string;
        lastSyncedAt?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || "写回 Google Sheet 失败");
      }
      setPushPreview(null);
      setStatusMessage({
        kind: "success",
        text: `已写回「${payload.sheetTitle ?? "Google Sheet"}」：更新 ${payload.updatedCount ?? 0} 行，新增 ${payload.appendedCount ?? 0} 行（保留 ${payload.preservedUnregisteredCount ?? 0} 行未注册记录）。`,
      });
      await runDiff();
    } catch (error) {
      setStatusMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "写回 Google Sheet 失败",
      });
    } finally {
      setBusy(null);
    }
  }

  const isOAuthWritable = Boolean(connector?.writable || diffResult?.writable);

  return (
    <section
      aria-label="Google Sheets 双向同步"
      className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-subtle)] p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--color-heading)]">
              Google Sheets 双向同步
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                isOAuthWritable
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              {isOAuthWritable ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Google OAuth2 可读写
                  {connector?.account ? ` · ${connector.account}` : ""}
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3" />
                  仅只读链接（写回需 OAuth2）
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            直接对比 Google Sheet 与 Accounts 数据库的订阅套餐、配额、有效期与费用，支持事务性拉取（Pull）与无损回写（Push）。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void handleAuthorize()}
            className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            {busy === "authorize" ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            )}
            Google OAuth2 授权
          </button>
          <Link
            href="/panel/connector"
            className="inline-flex items-center gap-1 rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-heading)]"
          >
            连接器中心
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2">
          <input
            aria-label="同步目标 Google Sheet URL"
            type="url"
            value={spreadsheetUrl}
            onChange={(event) => setSpreadsheetUrl(event.target.value)}
            placeholder={DEFAULT_SHEET_URL}
            className="h-9 flex-1 rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
          />
          <a
            href={spreadsheetUrl || DEFAULT_SHEET_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-2.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-heading)]"
          >
            打开原表 <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void runDiff()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            {busy === "diff" ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            双向比对
          </button>

          <button
            type="button"
            disabled={busy !== null || !onSubscriptionRecordsImport}
            onClick={() => void handlePullToSystem()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 dark:bg-[var(--color-action)]"
          >
            {busy === "pull" ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowDownToLine className="h-3.5 w-3.5" />
            )}
            从表格拉取 (Pull)
          </button>

          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void handlePushPreview()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            {busy === "push-preview" ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowUpFromLine className="h-3.5 w-3.5" />
            )}
            回写到表格 (Push)
          </button>
        </div>
      </div>

      {statusMessage ? (
        <p
          role="status"
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            statusMessage.kind === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-[color:var(--color-danger-border)] bg-[var(--color-danger-muted)]/40 text-[var(--color-danger-foreground)]"
          }`}
        >
          {statusMessage.text}
        </p>
      ) : null}

      {pushPreview ? (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-[color:var(--color-primary)]/30 bg-[var(--color-surface)] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-[var(--color-text)]">
            <span className="font-semibold">回写预览（{pushPreview.sheetTitle}）：</span>
            更新 {pushPreview.updatedCount} 行，新增 {pushPreview.appendedCount} 行，保留未注册 {pushPreview.preservedUnregisteredCount} 行。
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPushPreview(null)}
              className="rounded-md border border-[color:var(--color-surface-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!pushPreview.writable || busy !== null}
              onClick={() => void handlePushApply()}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy === "push-apply" ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              确认写回表格
            </button>
          </div>
        </div>
      ) : null}

      {diffResult ? (
        <div className="mt-3 space-y-2.5">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-[var(--color-surface)] px-2.5 py-1 text-[var(--color-text-muted)]">
              已一致 {diffResult.diff.inSyncCount}
            </span>
            <span className="rounded-md bg-[var(--color-surface)] px-2.5 py-1 text-sky-700 dark:text-sky-300">
              待拉取 {diffResult.diff.pullCandidateCount}
            </span>
            <span className="rounded-md bg-[var(--color-surface)] px-2.5 py-1 text-indigo-700 dark:text-indigo-300">
              待推送 {diffResult.diff.pushCandidateCount}
            </span>
            <span className="rounded-md bg-[var(--color-surface)] px-2.5 py-1 text-amber-700 dark:text-amber-300">
              字段差异 {diffResult.diff.conflictCount}
            </span>
            <span className="rounded-md bg-[var(--color-surface)] px-2.5 py-1 text-[var(--color-text-subtle)]">
              表格未注册 {diffResult.diff.unregisteredCount}
            </span>
          </div>

          {diffResult.diff.rows.length > 0 ? (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)]">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">邮箱</th>
                    <th className="px-3 py-2 font-medium">同步状态</th>
                    <th className="px-3 py-2 font-medium">差异明细</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-surface-border)]">
                  {diffResult.diff.rows.map((row) => (
                    <tr key={`${row.email}-${row.status}`}>
                      <td className="px-3 py-2 font-mono text-xs text-[var(--color-heading)]">
                        {row.email}
                        {row.sheetRowNumber ? (
                          <span className="ml-1.5 text-[var(--color-text-subtle)]">
                            #{row.sheetRowNumber}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${DIFF_STYLES[row.status]}`}
                        >
                          {DIFF_LABELS[row.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">
                        {row.differences.length > 0
                          ? row.differences
                              .map(
                                (d) =>
                                  `${d.label}: 表(${d.sheetValue || "空"}) vs 库(${d.systemValue || "空"})`,
                              )
                              .join("；")
                          : row.status === "unregistered"
                            ? "系统暂无此邮箱，Pull 跳过、Push 保留"
                            : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
