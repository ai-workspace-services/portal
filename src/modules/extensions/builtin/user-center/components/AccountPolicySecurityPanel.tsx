"use client";

import Link from "next/link";
import { CheckCircle2, LockKeyhole, ShieldAlert } from "lucide-react";
import useSWR from "swr";

import Card from "./Card";
import {
  fetchAccountPolicy,
  type AccountPolicy,
} from "../lib/fetchAccountUsage";

interface AccountPolicySecurityPanelProps {
  mfaEnabled: boolean;
  mfaPending: boolean;
  canManageMfa: boolean;
}

function statusLabel(mfaEnabled: boolean, mfaPending: boolean): string {
  if (mfaEnabled && !mfaPending) return "已启用";
  if (mfaPending) return "待完成";
  return "未设置";
}

export default function AccountPolicySecurityPanel({
  mfaEnabled,
  mfaPending,
  canManageMfa,
}: AccountPolicySecurityPanelProps) {
  const { data, error, isLoading } = useSWR<AccountPolicy>(
    "account-policy",
    fetchAccountPolicy,
  );
  const securityReady = mfaEnabled && !mfaPending;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${securityReady ? "bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]" : "bg-[var(--color-warning-muted)] text-[var(--color-warning-foreground)]"}`}
          >
            {securityReady ? (
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              Account security
            </p>
            <h3 className="mt-1 text-base font-semibold text-[var(--color-heading)]">
              多因素认证
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-subtle)]">
              {securityReady
                ? "动态验证码已保护控制台登录。"
                : "绑定认证器可为登录和支付操作增加额外保护。"}
            </p>
          </div>
          <span
            className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${securityReady ? "bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]" : "bg-[var(--color-warning-muted)] text-[var(--color-warning-foreground)]"}`}
          >
            {statusLabel(mfaEnabled, mfaPending)}
          </span>
        </div>
        {canManageMfa ? (
          <Link
            href="/panel/account?setupMfa=1"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:underline"
          >
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            {securityReady ? "管理 MFA" : "完成安全设置"}
          </Link>
        ) : (
          <p className="mt-5 text-sm text-[var(--color-text-subtle)]">
            当前角色无权修改 MFA。
          </p>
        )}
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              Policy snapshot
            </p>
            <h3 className="mt-1 text-base font-semibold text-[var(--color-heading)]">
              策略与路由
            </h3>
          </div>
          <span className="rounded-full bg-[var(--color-primary-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)]">
            {isLoading ? "加载中" : data ? "已同步" : "—"}
          </span>
        </div>
        {error ? (
          <p className="mt-4 text-sm text-[var(--color-danger-foreground)]">
            策略信息暂时不可用：{error.message}
          </p>
        ) : null}
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--color-text-subtle)]">偏好策略</dt>
            <dd className="mt-1 font-semibold text-[var(--color-text)]">
              {data?.preferredStrategy || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-subtle)]">节点组</dt>
            <dd className="mt-1 font-semibold text-[var(--color-text)]">
              {data?.eligibleNodeGroups?.join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-subtle)]">认证状态</dt>
            <dd className="mt-1 font-semibold text-[var(--color-text)]">
              {data?.authState || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-subtle)]">降级模式</dt>
            <dd className="mt-1 font-semibold text-[var(--color-text)]">
              {data?.degradeMode || "—"}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
