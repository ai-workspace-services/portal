"use client";

import useSWR from "swr";
import { ADMIN_API_BASE } from "../../lib/adminApi";
import type { SubscriptionRecord } from "./UserGroupManagement";

export type BillingSnapshot = {
  billingProfile?: {
    packageName: string;
    includedQuotaBytes: number;
    pricingRuleVersion: string;
  } | null;
  quotaState?: {
    remainingIncludedQuota: number;
    proxyAccessState: string;
    suspendState: string;
    periodStart?: string | null;
    periodEnd?: string | null;
  } | null;
  subscriptionRecord?: SubscriptionRecord | null;
  subscriptionValidFrom?: string | null;
  subscriptionValidUntil?: string | null;
  groups?: string[];
};
export type TeamBillingMember = BillingSnapshot & {
  id: string;
  email: string;
  active: boolean;
  accessState: string;
};
type TeamBillingResponse = {
  team: {
    name: string;
    validFrom: string;
    validUntil: string;
    active: boolean;
  };
  members: TeamBillingMember[];
};

async function load<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`详情读取失败（HTTP ${response.status}）`);
  return response.json() as Promise<T>;
}
export function quotaBytes(value?: number | null): string {
  if (value === undefined || value === null) return "未配置";
  return `${(value / 1024 ** 3).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} GB`;
}
function date(value?: string | null): string {
  return value ? value.slice(0, 10) : "未配置";
}
export function BillingFacts({ snapshot }: { snapshot: BillingSnapshot }) {
  const {
    billingProfile: profile,
    quotaState: quota,
    subscriptionRecord: record,
  } = snapshot;
  return (
    <dl className="grid grid-cols-[86px_1fr] gap-x-3 gap-y-2 text-sm">
      <dt>套餐</dt>
      <dd>{profile?.packageName || "未配置"}</dd>
      <dt>月总额度</dt>
      <dd>{quotaBytes(profile?.includedQuotaBytes)}</dd>
      <dt>剩余额度</dt>
      <dd>{quotaBytes(quota?.remainingIncludedQuota)}</dd>
      <dt>订阅有效期</dt>
      <dd>
        {date(snapshot.subscriptionValidFrom ?? record?.validFrom)} —{" "}
        {date(snapshot.subscriptionValidUntil ?? record?.validUntil)}
      </dd>
      <dt>额度周期</dt>
      <dd>
        {date(quota?.periodStart)} — {date(quota?.periodEnd)}
      </dd>
      <dt>网络状态</dt>
      <dd>
        {quota
          ? `${quota.proxyAccessState || "未配置"} / ${quota.suspendState || "未配置"}`
          : "未配置"}
      </dd>
      {record ? (
        <>
          <dt>订阅类型</dt>
          <dd>{record.subscriptionType || "未配置"}</dd>
          <dt>年配额</dt>
          <dd>{quotaBytes(record.annualQuotaBytes)}</dd>
          <dt>付费状态</dt>
          <dd>
            {record.paymentStatus || "未配置"} · ¥
            {(record.feeMinor / 100).toFixed(2)}
          </dd>
          <dt>订阅备注</dt>
          <dd className="break-words">{record.note || "—"}</dd>
        </>
      ) : null}
    </dl>
  );
}
export function AccountSubscriptionDetails({ userId }: { userId: string }) {
  const result = useSWR<
    BillingSnapshot & {
      user: {
        subscriptionValidFrom?: string | null;
        subscriptionValidUntil?: string | null;
      };
    }
  >(`${ADMIN_API_BASE}/billing/accounts/${encodeURIComponent(userId)}`, load, {
    refreshInterval: 30_000,
  });
  return (
    <section
      className="rounded-md border border-[color:var(--color-surface-border)] p-3.5"
      aria-label="套餐与订阅详情"
    >
      <h3 className="mb-3 font-semibold">套餐与订阅</h3>
      {result.error ? (
        <p role="alert">{result.error.message}</p>
      ) : result.data ? (
        <BillingFacts snapshot={{ ...result.data, ...result.data.user }} />
      ) : (
        <p role="status">正在读取套餐和余量…</p>
      )}
    </section>
  );
}
export function TeamSubscriptionDetails({ teamId }: { teamId: string }) {
  const result = useSWR<TeamBillingResponse>(
    teamId
      ? `/api/auth/network-team?teamId=${encodeURIComponent(teamId)}`
      : null,
    load,
    { refreshInterval: 30_000 },
  );
  if (!teamId) return null;
  return (
    <section
      className="space-y-3 rounded-md border border-[color:var(--color-surface-border)] p-4"
      aria-label="团队套餐详情"
    >
      <h3 className="font-semibold">团队订阅与成员余量</h3>
      {result.error ? (
        <p role="alert">{result.error.message}</p>
      ) : result.data ? (
        <>
          <p className="text-sm">
            {result.data.team.name} ·{" "}
            {result.data.team.active ? "启用" : "暂停"} ·{" "}
            {date(result.data.team.validFrom)} —{" "}
            {date(result.data.team.validUntil)}
          </p>
          <p className="text-xs text-slate-500">额度按成员独立计算。</p>
          {result.data.members.map((member) => (
            <details key={member.id} className="rounded-md border p-3">
              <summary className="cursor-pointer break-all text-sm">
                {member.email} ·{" "}
                {member.billingProfile?.packageName || "未配置套餐"} · 剩余{" "}
                {quotaBytes(member.quotaState?.remainingIncludedQuota)} ·{" "}
                {member.active ? "启用" : "停用"}
              </summary>
              <div className="mt-3">
                <BillingFacts snapshot={member} />
                <p className="mt-2 break-all text-xs">
                  分组：{member.groups?.join(", ") || "未分组"}
                </p>
              </div>
            </details>
          ))}
          {!result.data.members.length ? (
            <p className="text-sm">暂无成员</p>
          ) : null}
        </>
      ) : (
        <p role="status">正在读取团队套餐…</p>
      )}
    </section>
  );
}
