"use client";

import { type FormEvent, useEffect, useId, useRef } from "react";
import { Loader2, Trash2, X } from "lucide-react";

export type DeleteUserTarget = {
  userId: string;
  email: string;
  displayName: string;
  reason: string;
  requestId: string;
  busy: boolean;
  error?: string;
};

type DeleteUserDialogProps = {
  target?: DeleteUserTarget;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteUserDialog({
  target,
  onReasonChange,
  onClose,
  onConfirm,
}: DeleteUserDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reasonId = useId();
  const hintId = useId();
  const errorId = useId();

  const isOpen = Boolean(target);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }
    if (dialog.open) {
      dialog.close();
      dialog.returnValue = "";
    }
  }, [isOpen]);

  if (!target) {
    return (
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-full max-w-md rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] shadow-xl"
      />
    );
  }

  const trimmedReason = target.reason.trim();
  const describedBy = target.error ? `${hintId} ${errorId}` : hintId;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        if (target.busy) {
          event.preventDefault();
        }
      }}
      onClose={() => {
        const dialog = dialogRef.current;
        if (dialog) {
          dialog.returnValue = "";
        }
        if (!target.busy) {
          onClose();
        }
      }}
      className="m-auto w-full max-w-md rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] shadow-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1
              id={titleId}
              className="text-lg font-semibold text-[var(--color-heading)]"
            >
              确认删除（归档）用户
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              目标账号：{target.email}
              {target.displayName && target.displayName !== target.email
                ? `（${target.displayName}）`
                : ""}
            </p>
            <p className="mt-0.5 font-mono text-xs text-[var(--color-text-subtle)]">
              UID: {target.userId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={target.busy}
            aria-label="关闭删除用户对话框"
            className="rounded-lg p-2 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p
          id={hintId}
          className="rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs leading-5 text-[var(--color-text-muted)]"
        >
          删除操作会将账号归档并停用（保留历史标识与审计记录）。管理员账号及有效订阅/付费账号受保护，无法直接归档删除。
        </p>

        <div>
          <label
            htmlFor={reasonId}
            className="block text-sm font-medium text-[var(--color-heading)]"
          >
            删除原因（必填，写入审计日志）
          </label>
          <textarea
            id={reasonId}
            value={target.reason}
            onChange={(event) => onReasonChange(event.target.value)}
            maxLength={500}
            rows={3}
            required
            disabled={target.busy}
            aria-invalid={target.error ? true : undefined}
            aria-describedby={describedBy}
            placeholder="例如：重复注册账号清理 / 用户申请注销（工单 #1234）"
            className="mt-1.5 w-full resize-y rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary-muted)] disabled:opacity-60"
          />
          <p className="mt-1 text-right text-xs text-[var(--color-text-subtle)]">
            {target.reason.trim().length}/500
          </p>
        </div>

        {target.error ? (
          <p
            id={errorId}
            role="alert"
            className="rounded-lg bg-[var(--color-danger-muted)] px-3 py-2 text-sm text-[var(--color-danger-foreground)]"
          >
            {target.error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            disabled={target.busy}
            className="rounded-lg border border-[color:var(--color-surface-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={target.busy || !trimmedReason}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {target.busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {target.busy ? "删除中…" : "确认删除"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
