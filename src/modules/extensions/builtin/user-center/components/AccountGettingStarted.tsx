"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  KeyRound,
  QrCode,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import type { User } from "@lib/userStore";

type AccountGettingStartedProps = {
  user: User | null;
  isReadOnlyRole: boolean;
};

type ReadinessStepProps = {
  number: number;
  title: string;
  description: string;
  status: string;
  ready: boolean;
  children: ReactNode;
};

function ReadinessStep({
  number,
  title,
  description,
  status,
  ready,
  children,
}: ReadinessStepProps) {
  return (
    <article className="min-w-0 px-5 py-5 first:pl-0 last:pr-0 lg:border-r lg:border-[color:var(--color-surface-border)] lg:last:border-r-0">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
            ready
              ? "border-[var(--color-success)] text-[var(--color-success)]"
              : "border-[var(--color-primary)] text-[var(--color-primary)]"
          }`}
        >
          {number}
        </span>
        <h2 className="font-semibold text-[var(--color-heading)]">{title}</h2>
        <span
          className={`rounded-md px-2 py-1 text-xs font-semibold ${
            ready
              ? "bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]"
              : "bg-[var(--color-primary-muted)] text-[var(--color-primary)]"
          }`}
        >
          {status}
        </span>
      </div>
      <p className="mt-3 min-h-10 text-sm leading-5 text-[var(--color-text-muted)]">
        {description}
      </p>
      <div className="mt-4">{children}</div>
    </article>
  );
}

export default function AccountGettingStarted({
  user,
  isReadOnlyRole,
}: AccountGettingStartedProps) {
  const accountReady = Boolean(user?.emailVerified && user?.mfaEnabled);
  const connectionReady = Boolean(user?.proxyUuid);
  const accountName = user?.username || user?.name || user?.email || "—";

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
            Account console
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-heading)]">
            开始使用
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            按下面的步骤完成账户设置，即可安全使用 XWorkmate 服务。
          </p>
        </div>
        <p className="text-xs text-[var(--color-text-subtle)]">
          所有状态均以当前账号 API 返回为准
        </p>
      </header>

      <section
        aria-label="服务启用步骤"
        className="grid divide-y divide-[color:var(--color-surface-border)] rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] lg:grid-cols-3 lg:divide-x lg:divide-y-0"
      >
        <ReadinessStep
          number={1}
          title="完善账户安全"
          description="验证邮箱并绑定多因素认证，保护登录和计费操作。"
          status={accountReady ? "已完成" : "需要设置"}
          ready={accountReady}
        >
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-[var(--color-text-muted)]">
              {user?.emailVerified ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
              ) : (
                <CircleDashed className="h-4 w-4 text-[var(--color-warning)]" />
              )}
              邮箱{user?.emailVerified ? "已验证" : "待验证"}
            </p>
            <p className="flex items-center gap-2 text-[var(--color-text-muted)]">
              {user?.mfaEnabled ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
              ) : (
                <CircleDashed className="h-4 w-4 text-[var(--color-warning)]" />
              )}
              多因素认证{user?.mfaEnabled ? "已启用" : "未设置"}
            </p>
          </div>
          {!isReadOnlyRole ? (
            <Link
              href="/panel/account?setupMfa=1"
              className="mt-5 inline-flex items-center gap-2 rounded-md border border-[color:var(--color-surface-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-muted)]"
            >
              <ShieldCheck className="h-4 w-4" />
              {accountReady ? "管理安全设置" : "完成安全设置"}
            </Link>
          ) : null}
        </ReadinessStep>

        <ReadinessStep
          number={2}
          title="获取 VLESS 连接"
          description="生成二维码或复制订阅链接，再导入支持 VLESS 的客户端。"
          status={connectionReady ? "可以连接" : "等待配置"}
          ready={connectionReady}
        >
          <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            {connectionReady ? (
              <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
            ) : (
              <CircleDashed className="h-4 w-4 text-[var(--color-warning)]" />
            )}
            {connectionReady ? "连接凭据已就绪" : "尚未取得可用连接凭据"}
          </p>
          <a
            href="#connections"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            <QrCode className="h-4 w-4" />
            查看 VLESS 二维码
          </a>
        </ReadinessStep>

        <ReadinessStep
          number={3}
          title="验证连接"
          description="导入客户端后，返回此处确认节点与连接配置是否可用。"
          status="待验证"
          ready={false}
        >
          <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <CircleDashed className="h-4 w-4 text-[var(--color-warning)]" />
            节点连通状态会在服务端返回时显示
          </p>
          <a
            href="#connections"
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-[color:var(--color-surface-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-muted)]"
          >
            查看运行节点 <ArrowRight className="h-4 w-4" />
          </a>
        </ReadinessStep>
      </section>

      <section className="grid divide-y divide-[color:var(--color-surface-border)] rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
        <div className="p-4">
          <p className="text-xs text-[var(--color-text-subtle)]">账户</p>
          <p className="mt-1 truncate font-medium text-[var(--color-heading)]">
            {accountName}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs text-[var(--color-text-subtle)]">账户类型</p>
          <p className="mt-1 font-medium text-[var(--color-heading)]">
            {isReadOnlyRole ? "只读用户" : "标准用户"}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs text-[var(--color-text-subtle)]">邮箱验证</p>
          <p className="mt-1 flex items-center gap-1.5 font-medium text-[var(--color-heading)]">
            <UserRound className="h-4 w-4 text-[var(--color-primary)]" />
            {user?.emailVerified ? "已验证" : "待验证"}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs text-[var(--color-text-subtle)]">安全强度</p>
          <p className="mt-1 flex items-center gap-1.5 font-medium text-[var(--color-heading)]">
            <KeyRound className="h-4 w-4 text-[var(--color-primary)]" />
            {user?.mfaEnabled ? "已启用 MFA" : "建议启用 MFA"}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs text-[var(--color-text-subtle)]">账户权限</p>
          <p className="mt-1 font-medium text-[var(--color-heading)]">
            使用服务与查看
          </p>
        </div>
      </section>
    </div>
  );
}
