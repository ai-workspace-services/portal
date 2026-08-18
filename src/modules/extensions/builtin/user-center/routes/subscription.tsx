"use client";

/**
 * 订阅与计费 —— Micro SaaS 模版第 3 页
 *
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版/03-billing.html
 *
 * 相对原版的三处改动：
 * 1. MFA 限制原本同时以「右上角灰紫禁用按钮」和「黄色横幅」两种形式出现，
 *    禁用按钮读起来像坏了。现在合并成单处、可行动的 alert：左侧说明受限范围，
 *    右侧一个 primary「去绑定 MFA」。
 * 2. 全 0 的数据卡不再是死值 —— 空态给出口按钮，说明下一步该做什么。
 * 3. 退款与取消收进 danger zone，每项都写清后果（退款窗口、降级结果）。
 *
 * 数据与 API 契约完全沿用既有实现（/api/auth/subscriptions、accounts 用量与
 * 计费接口、Stripe 客户门户），没有新增字段。
 */

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileText,
  Info,
  Lock,
  ShieldCheck,
} from "lucide-react";

import Breadcrumbs from "@/app/panel/components/Breadcrumbs";
import { openStripePortal } from "@components/billing/stripe-client";
import { usePaymentMfaRequired } from "@components/billing/PaymentMfaNotice";
import { formatBytes } from "@lib/format";
import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";
import { useUserStore } from "@lib/userStore";
import {
  XdsAlert,
  XdsBadge,
  XdsButton,
  XdsCard,
  XdsCardBody,
  XdsCardFoot,
  XdsCardHead,
  XdsEmpty,
  XdsMeter,
  XdsStat,
} from "@/components/ui/xds";

import BillingOptionsPanel from "../account/BillingOptionsPanel";
import {
  fetchAccountBillingSummary,
  fetchAccountPolicy,
  fetchAccountUsageSummary,
} from "../lib/fetchAccountUsage";

const DASH = "—";

type SubscriptionRecord = {
  id: string;
  provider: string;
  kind?: string;
  planId?: string;
  status: string;
  paymentMethod?: string;
  externalId: string;
  createdAt?: string;
  updatedAt?: string;
  cancelledAt?: string;
  meta?: Record<string, unknown>;
};

type SubscriptionResponse = {
  subscriptions?: SubscriptionRecord[];
  error?: string;
  message?: string;
};

const fetcher = (url: string) =>
  fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  }).then((res) => res.json());

function formatDate(value?: string | null): string {
  if (!value) return DASH;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function bytesOrDash(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? formatBytes(value)
    : DASH;
}

/** 订阅状态到语义色的映射，颜色和文字同时表达，不靠色点区分 */
function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  const s = status.toLowerCase();
  if (s === "active" || s === "paid" || s === "succeeded") return "success";
  if (s === "cancelled" || s === "canceled" || s === "failed") return "danger";
  if (s === "pending" || s === "processing" || s === "past_due") return "warning";
  return "neutral";
}

export default function UserCenterSubscriptionRoute() {
  const { language } = useLanguage();
  const zh = language !== "en";
  const copy = translations[language].userCenter.account.subscription;

  const user = useUserStore((state) => state.user);
  const isReadOnlyRole = Boolean(user?.isReadOnly);
  // 「谁需要绑定 MFA 才能支付」这条规则由 PaymentMfaNotice 单独维护，
  // 这里只复用它的判定，避免两处各写一份而慢慢跑偏。
  const mfaRequired = usePaymentMfaRequired();
  const mfaReady = !mfaRequired;

  const { data, isLoading, mutate } = useSWR<SubscriptionResponse>(
    "/api/auth/subscriptions",
    fetcher,
  );
  const { data: usageSummary } = useSWR(
    "account-usage-summary",
    fetchAccountUsageSummary,
  );
  const { data: billingSummary } = useSWR(
    "account-billing-summary",
    fetchAccountBillingSummary,
  );
  const { data: accountPolicy } = useSWR("account-policy", fetchAccountPolicy);

  const records = useMemo(() => data?.subscriptions ?? [], [data?.subscriptions]);
  const [activeTab, setActiveTab] = useState<"overview" | "usage" | "records">(
    "overview",
  );
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = useCallback(
    async (externalId: string) => {
      if (!externalId) return;
      setSubmitting(externalId);
      setError(null);
      try {
        const response = await fetch("/api/auth/subscriptions/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ externalId }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          setError((payload?.message as string) || copy.cancelError);
          return;
        }
        await mutate();
      } catch (err) {
        console.warn("Failed to cancel subscription", err);
        setError(copy.cancelRequestError);
      } finally {
        setSubmitting(null);
      }
    },
    [copy.cancelError, copy.cancelRequestError, mutate],
  );

  const handleOpenPortal = useCallback(async () => {
    setPortalLoading(true);
    setError(null);
    try {
      await openStripePortal({ returnPath: "/panel/subscription" });
    } catch (err) {
      console.warn("Failed to open Stripe portal", err);
      setError(copy.portalError);
    } finally {
      setPortalLoading(false);
    }
  }, [copy.portalError]);

  if (isReadOnlyRole) {
    return (
      <div className="xds" style={{ background: "transparent" }}>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/panel" },
            { label: "Subscription", href: "/panel/subscription" },
          ]}
        />
        <div className="xds-stack" style={{ marginTop: 16 }}>
          <header className="xds-page-head">
            <h1 className="xds-page-title">
              {zh ? "订阅与配额" : "Subscription and quota"}
            </h1>
            <p className="xds-page-sub">
              {zh
                ? "Demo 体验账号为只读模式，无需订阅或付费。你可以继续浏览控制台并体验核心功能。"
                : "Demo accounts are read-only — no subscription or payment needed. Keep exploring the console."}
            </p>
          </header>
          <XdsCard>
            <XdsCardBody>
              <XdsEmpty
                icon={<CreditCard className="h-9 w-9" />}
                title={zh ? "只读账号无计费" : "No billing on read-only accounts"}
                description={
                  zh
                    ? "想要真实配额与节点，请注册一个标准账户。"
                    : "Register a standard account for real quota and nodes."
                }
                action={
                  <Link href="/register" className="xds-btn xds-btn-primary xds-btn-sm">
                    {zh ? "创建标准账户" : "Create an account"}
                  </Link>
                }
              />
            </XdsCardBody>
          </XdsCard>
        </div>
      </div>
    );
  }

  return (
    <div className="xds" style={{ background: "transparent" }}>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/panel" },
          { label: "Subscription", href: "/panel/subscription" },
        ]}
      />

      <div className="xds-stack" style={{ marginTop: 16 }}>
        <header className="xds-page-head">
          <h1 className="xds-page-title">
            {zh ? "订阅与配额" : "Subscription and quota"}
          </h1>
          <p className="xds-page-sub">
            {zh
              ? "套餐、用量、余额和账单分录均来自现有订阅与 accounts.svc.plus 接口。所有支付统一经 Stripe 结算。"
              : "Plans, usage, balance and ledger all come from the existing subscription and accounts.svc.plus APIs. Payments settle through Stripe."}
          </p>
        </header>

        {/* ── 安全门禁：只出现一处，且可行动 ── */}
        {mfaRequired ? (
          <div className="xds-gate">
            <span className="xds-gate-ico" aria-hidden="true">
              <Lock className="h-5 w-5" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="xds-t-body-sm"
                style={{ fontWeight: 600, color: "var(--warning)" }}
              >
                {zh ? "绑定 MFA 后即可发起支付" : "Bind MFA to enable payments"}
              </div>
              <p
                className="xds-t-caption"
                style={{ color: "var(--warning)", opacity: 0.85, marginTop: 3 }}
              >
                {zh
                  ? "浏览用量、配额和账单不受影响。发起 Stripe 购买、变更订阅或进入客户门户前需要完成一次身份验证。"
                  : "Viewing usage, quota and invoices is unaffected. A second factor is required before Stripe purchases, subscription changes or the customer portal."}
              </p>
            </div>
            <Link
              href="/panel/account?setupMfa=1"
              className="xds-btn xds-btn-primary"
              style={{ flex: "none" }}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {zh ? "去绑定 MFA" : "Bind MFA"}
            </Link>
          </div>
        ) : null}

        {error ? (
          <XdsAlert tone="danger" icon={<Info className="h-4 w-4" />}>
            {error}
          </XdsAlert>
        ) : null}

        {/* ── Tabs ── */}
        <div className="xds-tabs">
          {(
            [
              { key: "overview", label: zh ? "概览" : "Overview" },
              { key: "usage", label: zh ? "用量明细" : "Usage detail" },
              { key: "records", label: zh ? "订阅记录" : "Records" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`xds-tab${activeTab === tab.key ? " xds-is-active" : ""}`}
              aria-pressed={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 概览：4 张数据卡 ── */}
        {activeTab === "overview" ? (
          <>
            <section
              className="xds-grid xds-g-4"
              style={{ gap: 12, alignItems: "start" }}
            >
              <XdsStat
                label={zh ? "权威用量" : "Authoritative usage"}
                value={bytesOrDash(usageSummary?.totalBytes)}
                aside={
                  <span className="xds-tag xds-t-mono" style={{ fontSize: 10 }}>
                    {usageSummary?.sourceOfTruth || DASH}
                  </span>
                }
                meta={
                  zh
                    ? "由 accounts.svc.plus 汇总，不以本地客户端计数为准"
                    : "Aggregated by accounts.svc.plus, not the local client"
                }
              />

              <XdsStat
                label={zh ? "月度配额" : "Monthly quota"}
                value={
                  typeof usageSummary?.usagePercent === "number"
                    ? Math.min(100, Math.max(0, usageSummary.usagePercent)).toFixed(1)
                    : DASH
                }
                unit={typeof usageSummary?.usagePercent === "number" ? "%" : undefined}
                meta={`${zh ? "已用" : "Used"} ${bytesOrDash(usageSummary?.usedBytes)} / ${bytesOrDash(usageSummary?.includedQuotaBytes)} · ${zh ? "本期重置" : "resets"} ${formatDate(usageSummary?.periodEnd)}`}
              >
                <XdsMeter
                  percent={usageSummary?.usagePercent}
                  label={zh ? "月度配额" : "Monthly quota"}
                  className="xds-mt-12"
                />
              </XdsStat>

              <XdsStat
                label={zh ? "账户余额" : "Balance"}
                value={
                  typeof usageSummary?.currentBalance === "number"
                    ? usageSummary.currentBalance.toFixed(2)
                    : DASH
                }
                meta={`${zh ? "套餐" : "Plan"} ${usageSummary?.billingProfile?.packageName || billingSummary?.billingProfile?.packageName || "default"} · ${zh ? "规则" : "rules"} ${usageSummary?.billingProfile?.pricingRuleVersion || DASH}`}
              />

              <XdsStat
                label={zh ? "策略 / 同步" : "Policy / sync"}
                value={
                  <XdsBadge tone={usageSummary?.arrears ? "danger" : "success"}>
                    {usageSummary?.arrears
                      ? zh ? "欠费" : "Arrears"
                      : zh ? "正常" : "Normal"}
                    {usageSummary?.throttleState ? ` · ${usageSummary.throttleState}` : ""}
                  </XdsBadge>
                }
                meta={`${zh ? "统计延迟" : "Sync delay"} ~${usageSummary?.syncDelaySeconds ?? 0} s · ${zh ? "策略组" : "groups"} ${accountPolicy?.eligibleNodeGroups?.join(", ") || DASH}`}
              />
            </section>

            {/* ── 套餐选择 ── */}
            <XdsCard>
              <XdsCardHead
                title={zh ? "选择套餐" : "Choose a plan"}
                description={
                  zh
                    ? "按量购买或订阅购买都会映射到统一的 Stripe 价格配置，回调与 webhook 自动更新订阅状态。"
                    : "Metered and subscription purchases map to the same Stripe price config; callbacks and webhooks update state automatically."
                }
              />
              <XdsCardBody>
                <BillingOptionsPanel />
                <XdsAlert
                  tone="info"
                  icon={<Info className="h-4 w-4" />}
                  title={zh ? "支付如何进行" : "How payment works"}
                  className="xds-mt-20"
                >
                  {zh
                    ? "选择套餐 → 跳转 Stripe Checkout（本地不保存任何支付方式入口）→ 回调与 webhook 自动识别到账并更新订阅记录，无需手工同步。"
                    : "Pick a plan → Stripe Checkout (no payment entry point is stored locally) → callbacks and webhooks reconcile the subscription record automatically."}
                </XdsAlert>
              </XdsCardBody>
            </XdsCard>
          </>
        ) : null}

        {/* ── 用量明细：计费分录 ── */}
        {activeTab === "usage" ? (
          <XdsCard>
            <XdsCardHead
              title={zh ? "计费分录" : "Billing ledger"}
              description={`${copy.recentLedgerDescription} · ${copy.source}: ${billingSummary?.sourceOfTruth || DASH}`}
            />
            {billingSummary?.ledger?.length ? (
              <div className="xds-scroll-x">
                <table className="xds-table">
                  <thead>
                    <tr>
                      <th>{zh ? "类型" : "Type"}</th>
                      <th>{zh ? "计费周期" : "Period"}</th>
                      <th>{zh ? "规则版本" : "Rule version"}</th>
                      <th style={{ textAlign: "right" }}>{zh ? "计费流量" : "Rated"}</th>
                      <th style={{ textAlign: "right" }}>{zh ? "金额" : "Amount"}</th>
                      <th style={{ textAlign: "right" }}>{zh ? "结余" : "Balance"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingSummary.ledger.map((entry) => (
                      <tr key={entry.id}>
                        <td style={{ fontWeight: 500 }}>{entry.entryType}</td>
                        <td className="xds-subtle">{formatDate(entry.bucketStart)}</td>
                        <td className="xds-t-mono xds-subtle">
                          {entry.pricingRuleVersion || DASH}
                        </td>
                        <td className="xds-num">{bytesOrDash(entry.ratedBytes)}</td>
                        <td className="xds-num">
                          {typeof entry.amountDelta === "number"
                            ? entry.amountDelta.toFixed(2)
                            : DASH}
                        </td>
                        <td className="xds-num">
                          {typeof entry.balanceAfter === "number"
                            ? entry.balanceAfter.toFixed(2)
                            : DASH}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <XdsCardBody>
                <XdsEmpty
                  icon={<FileText className="h-9 w-9" />}
                  title={zh ? "暂无计费分录" : "No ledger entries yet"}
                  description={
                    zh
                      ? "产生用量后，按周期结算的分录会在这里列出，可用于对账。"
                      : "Once usage accrues, per-period entries appear here for reconciliation."
                  }
                  action={
                    <Link
                      href="/panel/account"
                      className="xds-btn xds-btn-secondary xds-btn-sm"
                    >
                      {zh ? "去建立连接" : "Set up a connection"}
                    </Link>
                  }
                />
              </XdsCardBody>
            )}
          </XdsCard>
        ) : null}

        {/* ── 订阅记录 ── */}
        {activeTab === "records" ? (
          <XdsCard>
            <XdsCardHead
              title={zh ? "订阅记录" : "Subscription records"}
              description={
                zh
                  ? "Stripe 购买记录与订阅分录，状态由回调与 webhook 自动同步。"
                  : "Stripe purchases and subscription entries, synced by callback and webhook."
              }
              actions={
                <XdsButton
                  size="sm"
                  onClick={handleOpenPortal}
                  disabled={portalLoading || !mfaReady}
                  title={
                    !mfaReady
                      ? zh ? "需先绑定 MFA" : "Requires MFA"
                      : undefined
                  }
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  {portalLoading ? copy.openingBilling : copy.manageBilling}
                </XdsButton>
              }
            />

            {isLoading ? (
              <XdsCardBody>
                <p className="xds-t-caption">{copy.loading}</p>
              </XdsCardBody>
            ) : records.length === 0 ? (
              <XdsCardBody>
                <XdsEmpty
                  icon={<FileText className="h-9 w-9" />}
                  title={zh ? "暂无订阅记录" : "No subscriptions yet"}
                  description={
                    zh
                      ? "完成首次购买后，账单与发票会在这里按周期列出，并可申请退款。"
                      : "After the first purchase, invoices are listed per period here and refunds can be requested."
                  }
                  action={
                    <XdsButton size="sm" onClick={() => setActiveTab("overview")}>
                      {zh ? "查看套餐" : "See plans"}
                    </XdsButton>
                  }
                />
              </XdsCardBody>
            ) : (
              <div className="xds-scroll-x">
                <table className="xds-table">
                  <thead>
                    <tr>
                      <th>{zh ? "渠道 / 类型" : "Provider / kind"}</th>
                      <th>{zh ? "套餐" : "Plan"}</th>
                      <th>{zh ? "外部 ID" : "External ID"}</th>
                      <th>{zh ? "创建" : "Created"}</th>
                      <th>{zh ? "状态" : "Status"}</th>
                      <th style={{ width: "1%" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => {
                      const canCancel =
                        record.provider === "stripe" &&
                        (record.kind ?? "subscription") === "subscription" &&
                        record.status !== "cancelled";
                      return (
                        <tr key={record.id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{record.provider}</div>
                            <div className="xds-t-caption">
                              {record.kind ?? "subscription"}
                              {record.paymentMethod ? ` · ${record.paymentMethod}` : ""}
                            </div>
                          </td>
                          <td>{record.planId || DASH}</td>
                          <td
                            className="xds-t-mono xds-subtle"
                            style={{ wordBreak: "break-all", maxWidth: 220 }}
                          >
                            {record.externalId}
                          </td>
                          <td className="xds-subtle">{formatDate(record.createdAt)}</td>
                          <td>
                            <XdsBadge tone={statusTone(record.status)}>
                              {record.status}
                            </XdsBadge>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <XdsButton
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(record.externalId)}
                              disabled={
                                !canCancel ||
                                !mfaReady ||
                                submitting === record.externalId
                              }
                            >
                              {!canCancel
                                ? copy.historical
                                : submitting === record.externalId
                                  ? copy.processing
                                  : copy.stop}
                            </XdsButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <XdsCardFoot>
              <div className="xds-row-between">
                <span className="xds-t-caption">
                  {zh ? `共 ${records.length} 条` : `${records.length} record(s)`}
                </span>
                <Link href="/docs" className="xds-link-arrow xds-t-caption">
                  {zh ? "计费与退款说明" : "Billing and refund policy"}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </XdsCardFoot>
          </XdsCard>
        ) : null}

        {/* ── 退款与取消：破坏性操作必须解释后果 ── */}
        <XdsCard className="xds-danger-zone">
          <XdsCardHead
            title={
              <span style={{ color: "var(--danger)" }}>
                {zh ? "退款与取消订阅" : "Refunds and cancellation"}
              </span>
            }
            description={
              <span style={{ color: "var(--danger)", opacity: 0.85 }}>
                {zh
                  ? "这些操作不可撤销，执行前需要完成 MFA 验证。"
                  : "These actions cannot be undone and require MFA."}
              </span>
            }
          />
          <XdsCardBody>
            <div className="xds-sec-row">
              <div style={{ maxWidth: "64ch" }}>
                <div className="xds-t-body-sm" style={{ fontWeight: 500 }}>
                  {zh ? "申请退款" : "Request a refund"}
                </div>
                <p className="xds-t-caption" style={{ marginTop: 3 }}>
                  {zh
                    ? "首次订阅 7 天内可全额退款；超额用量部分不参与退款。审核后 5–10 个工作日原路退回。"
                    : "Full refund within 7 days of a first subscription; overage is excluded. Returns to the original method in 5–10 business days after review."}
                </p>
              </div>
              <XdsButton
                onClick={handleOpenPortal}
                disabled={!mfaReady || portalLoading || records.length === 0}
                style={{ flex: "none" }}
              >
                {zh ? "申请退款" : "Request refund"}
              </XdsButton>
            </div>
            <div className="xds-sec-row">
              <div style={{ maxWidth: "64ch" }}>
                <div className="xds-t-body-sm" style={{ fontWeight: 500 }}>
                  {zh ? "取消订阅" : "Cancel subscription"}
                </div>
                <p className="xds-t-caption" style={{ marginTop: 3 }}>
                  {zh
                    ? "当前周期结束前服务保持可用，之后自动降级到 Free 套餐，连接凭据保留。"
                    : "Service stays available until the period ends, then downgrades to Free. Connection credentials are kept."}
                </p>
              </div>
              <XdsButton
                variant="danger"
                onClick={() => setActiveTab("records")}
                disabled={!mfaReady || records.length === 0}
                style={{ flex: "none" }}
              >
                {zh ? "去订阅记录取消" : "Cancel in records"}
              </XdsButton>
            </div>
          </XdsCardBody>
        </XdsCard>
      </div>
    </div>
  );
}
