"use client";

import { Clock3, History, ShieldCheck } from "lucide-react";

import { formatBytes } from "@lib/format";
import type {
  AccountPlanSummary,
  AccountUsageSummary,
} from "../lib/fetchAccountUsage";
import {
  XdsBadge,
  XdsCard,
  XdsCardBody,
  XdsCardHead,
  XdsMeter,
} from "@/components/ui/xds";

export type SubscriptionStatusRecord = {
  id: string;
  status: string;
  planId?: string;
  createdAt?: string;
  cancelledAt?: string;
  meta?: Record<string, unknown>;
};

type SubscriptionStatusCardProps = {
  records: SubscriptionStatusRecord[];
  usageSummary?: AccountUsageSummary;
  zh: boolean;
};

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function planQuotaLabel(plan?: AccountPlanSummary | null, zh = true): string {
  if (!plan) return "—";
  if (plan.unlimited) return zh ? "无限制" : "Unlimited";
  return formatBytes(plan.maxTrafficBytes);
}

function isActiveRecord(record: SubscriptionStatusRecord): boolean {
  const status = record.status.toLowerCase();
  if (status !== "active" && status !== "trialing") return false;
  const expiresAt = record.meta?.expiresAt;
  if (typeof expiresAt !== "string") return true;
  const timestamp = new Date(expiresAt).getTime();
  return Number.isNaN(timestamp) || timestamp > Date.now();
}

function activeRecordEnd(record?: SubscriptionStatusRecord): string | null {
  if (!record) return null;
  const expiresAt = record.meta?.expiresAt;
  return typeof expiresAt === "string" ? expiresAt : null;
}

export default function SubscriptionStatusCard({
  records,
  usageSummary,
  zh,
}: SubscriptionStatusCardProps) {
  const activeRecords = records.filter(isActiveRecord);
  const currentPlan =
    usageSummary?.currentPlan?.assigned === true
      ? usageSummary.currentPlan
      : usageSummary?.defaultPlan;
  const assigned = usageSummary?.planAssignmentStatus === "assigned";
  const activeRecord = activeRecords[0];
  const subscriptionEnd =
    activeRecordEnd(activeRecord) || usageSummary?.periodEnd || null;
  const state = usageSummary?.networkAccessState;
  const statusTone =
    state === "paused" || state === "blocked" || usageSummary?.arrears
      ? "danger"
      : activeRecords.length > 0 || assigned
        ? "success"
        : "neutral";
  const statusLabel =
    usageSummary?.networkAccessReason === "quota_exhausted"
      ? zh
        ? "额度已用尽 · 已断流"
        : "Quota exhausted · Disconnected"
      : usageSummary?.networkAccessReason === "billing_suspended"
        ? zh
          ? "账务暂停"
          : "Billing suspended"
        : activeRecords.length > 0 || assigned
          ? zh
            ? "正常"
            : "Active"
          : zh
            ? "待分配"
            : "Awaiting assignment";

  return (
    <XdsCard data-testid="subscription-status-card">
      <XdsCardHead
        title={zh ? "我的订阅" : "My subscriptions"}
        description={
          zh
            ? "当前权益、历史订阅与额度状态来自 Accounts 本地账务模型。"
            : "Entitlements, subscription history and quota state come from the local Accounts billing model."
        }
        actions={
          <XdsBadge tone={statusTone}>
            {activeRecords.length > 0
              ? `${activeRecords.length} ${zh ? "项有效" : "active"}`
              : statusLabel}
          </XdsBadge>
        }
      />
      <XdsCardBody>
        <div className="xds-grid xds-g-4" style={{ gap: 12 }}>
          <div className="xds-card xds-stat">
            <div className="xds-stat-label">
              {zh ? "当前套餐" : "Current plan"}
            </div>
            <div className="xds-stat-value">
              {currentPlan?.displayName || "default"}
            </div>
            <div className="xds-stat-meta">
              {assigned
                ? `${zh ? "最大流量" : "Max"} ${planQuotaLabel(currentPlan, zh)}`
                : `${zh ? "默认额度参考" : "Default quota reference"} · ${planQuotaLabel(currentPlan, zh)}`}
            </div>
          </div>

          <div className="xds-card xds-stat">
            <div className="xds-stat-label">
              {zh ? "本期用量" : "Current usage"}
            </div>
            <div className="xds-stat-value">
              {formatBytes(
                usageSummary?.usedBytes ?? usageSummary?.totalBytes ?? 0,
              )}
            </div>
            <XdsMeter
              percent={
                currentPlan?.unlimited ? undefined : usageSummary?.usagePercent
              }
              label={zh ? "月度配额" : "Monthly quota"}
              className="xds-mt-12"
            />
            <div className="xds-stat-meta">
              {currentPlan?.unlimited
                ? zh
                  ? "无限制额度"
                  : "Unlimited quota"
                : `${zh ? "上限" : "Limit"} ${planQuotaLabel(currentPlan, zh)}`}
            </div>
          </div>

          <div className="xds-card xds-stat">
            <div className="xds-stat-label">
              <Clock3 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              {zh ? "有效期 / 重置" : "Validity / reset"}
            </div>
            <div className="xds-stat-value text-base">
              {subscriptionEnd ? formatDate(subscriptionEnd) : "—"}
            </div>
            <div className="xds-stat-meta">
              {usageSummary?.periodEnd
                ? `${zh ? "下次额度重置" : "Next quota reset"} ${formatDate(usageSummary.periodEnd)}`
                : zh
                  ? "由当前套餐周期决定"
                  : "Defined by the current plan cycle"}
            </div>
          </div>

          <div className="xds-card xds-stat">
            <div className="xds-stat-label">
              <History className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              {zh ? "历史记录" : "History"}
            </div>
            <div className="xds-stat-value">{records.length}</div>
            <div className="xds-stat-meta">
              {zh
                ? `有效 ${activeRecords.length} · 不会删除历史账单`
                : `${activeRecords.length} active · billing history is retained`}
            </div>
          </div>
        </div>

        <div className="xds-sec-row" style={{ marginTop: 16 }}>
          <div>
            <div className="xds-t-body-sm" style={{ fontWeight: 500 }}>
              {statusLabel}
            </div>
            <p className="xds-t-caption" style={{ marginTop: 3 }}>
              {usageSummary?.networkAccessReason === "quota_exhausted"
                ? zh
                  ? "已停止配置同步并断开代理连接；恢复额度后可重新连接。"
                  : "Config sync is stopped and proxy access is disconnected; reconnect after quota recovery."
                : assigned
                  ? zh
                    ? "套餐变更只更新本地权益状态，支付渠道不会成为账户主键。"
                    : "Plan changes update local entitlements; the payment provider is never the account key."
                  : zh
                    ? "当前账户尚未被管理员分配套餐，注册属性保持不变。"
                    : "No plan has been assigned yet; the registration attributes remain unchanged."}
            </p>
          </div>
          <ShieldCheck
            className="h-4 w-4 text-[var(--text-tertiary)]"
            aria-hidden="true"
          />
        </div>
      </XdsCardBody>
    </XdsCard>
  );
}
