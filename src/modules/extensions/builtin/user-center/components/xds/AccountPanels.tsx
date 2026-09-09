"use client";

/**
 * 用户中心 —— Micro SaaS 模版第 2 页的组成面板
 *
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版/02-user-center.html
 *
 * 数据纪律（沿用 design-qa.md 里已经写死的约束）：
 * 节点卡只渲染 API 实际返回的 name / address / server_name / port / protocols。
 * 不推断也不伪造在线、延迟、负载、流量。API 没给的字段一律显示 `—`，
 * 让「没有数据」和「数据是 0」在界面上可区分。
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import BoundaryLink from "@/components/common/BoundaryLink";
import {
  Activity,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Copy,
  Download,
  MapPin,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react";
import { toDataURL } from "qrcode";

import { formatBytes } from "@lib/format";
import {
  XdsBadge,
  XdsButton,
  XdsCard,
  XdsCardBody,
  XdsCardFoot,
  XdsCardHead,
  XdsEmpty,
  XdsMeter,
} from "@/components/ui/xds";
import {
  buildVlessUri,
  type VlessNode,
} from "../../lib/vless";
import {
  regionalNodeOptions,
  XCONNECT_REGIONAL_POOLS,
} from "../../lib/regionalPools";
import type {
  AccountPolicy,
  AccountUsageSummary,
} from "../../lib/fetchAccountUsage";

const DASH = "—";
const DEFAULT_MONTHLY_QUOTA_BYTES = 5 * 1024 * 1024 * 1024;

function pct(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.min(100, Math.max(0, value)).toFixed(1)}`
    : DASH;
}

function bytesOrDash(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? formatBytes(value)
    : DASH;
}

function currentPlanMaxQuota(usage?: AccountUsageSummary): number | undefined {
  const reported = [
    usage?.includedQuotaBytes,
    usage?.billingProfile?.includedQuotaBytes,
  ].find(
    (value) => typeof value === "number" && Number.isFinite(value) && value > 0,
  );
  if (reported !== undefined) return reported;

  const packageName = usage?.billingProfile?.packageName?.trim().toLowerCase();
  return packageName === "default" || packageName === "free"
    ? DEFAULT_MONTHLY_QUOTA_BYTES
    : usage?.includedQuotaBytes;
}

function dateOrDash(value?: string | null): string {
  if (!value) return DASH;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? DASH : d.toLocaleDateString();
}

/* ═══════════════════════════════════ 账户设置进度 ═══════════════════════════════════ */

export type OnboardingState = {
  emailVerified: boolean;
  mfaEnabled: boolean;
  mfaPending: boolean;
  credentialsReady: boolean;
  connectionVerified: boolean;
};

/**
 * 三步引导。规范要求一个视觉区块内只能有一个 primary 按钮 —— 只有「当前
 * 待办」那一步用 primary，已完成的用 secondary，未开始的用 ghost。
 * 原版三个步骤三个同等权重按钮，用户不知道先点哪个。
 */
export function OnboardingProgress({
  state,
  zh,
  onSetupMfa,
  connectionContent,
}: {
  state: OnboardingState;
  zh: boolean;
  onSetupMfa: () => void;
  connectionContent?: ReactNode;
}) {
  const step1Done = state.emailVerified && state.mfaEnabled && !state.mfaPending;
  const step2Done = state.credentialsReady;
  const step3Done = state.connectionVerified;
  const doneCount = [step1Done, step2Done, step3Done].filter(Boolean).length;
  // 第一个未完成的步骤就是「当前待办」
  const activeIndex = [step1Done, step2Done, step3Done].findIndex((d) => !d);

  const steps = [
    {
      done: step1Done,
      title: zh ? "完善账户安全" : "Secure the account",
      desc: zh
        ? "验证邮箱并绑定多因素认证，保护登录和计费操作。"
        : "Verify email and bind MFA to protect sign-in and billing actions.",
      checks: [
        { ok: state.emailVerified, label: zh ? "邮箱已验证" : "Email verified" },
        {
          ok: state.mfaEnabled && !state.mfaPending,
          label: state.mfaPending
            ? zh ? "多因素认证待确认" : "MFA pending confirmation"
            : zh ? "多因素认证已绑定" : "MFA bound",
        },
      ],
    },
    {
      done: step2Done,
      title: zh ? "获取 VLESS 连接" : "Get VLESS credentials",
      desc: zh
        ? "生成二维码或复制订阅链接，导入支持 VLESS 的客户端。"
        : "Generate a QR code or copy the subscription link into a VLESS client.",
      checks: [
        {
          ok: state.credentialsReady,
          label: zh ? "连接凭据已就绪" : "Credentials ready",
        },
      ],
    },
    {
      done: step3Done,
      title: zh ? "验证连接" : "Verify the link",
      desc: zh
        ? "导入客户端后回到这里确认节点与连接配置是否可用。"
        : "Come back after importing to confirm nodes and connection config.",
      checks: [
        {
          ok: state.connectionVerified,
          label: zh ? "节点配置已下发" : "Node config delivered",
        },
      ],
    },
  ];

  return (
    <section className="xds-onboard">
      <div className="xds-onboard-head">
        <div>
          <div className="xds-panel-title">
            {zh ? "账户设置进度" : "Account setup progress"}
          </div>
          <p className="xds-t-caption" style={{ marginTop: 3 }}>
            {doneCount >= 3
              ? zh ? "全部完成，计费与订阅操作已解锁" : "All done — billing and subscription actions unlocked"
              : zh
                ? `还差 ${3 - doneCount} 步即可解锁计费与订阅操作`
                : `${3 - doneCount} step(s) left to unlock billing and subscription actions`}
          </p>
        </div>
        <div className="xds-prog">
          <span className="xds-t-mono xds-t-caption" style={{ color: "var(--text-primary)" }}>
            {doneCount} / 3
          </span>
          <XdsMeter
            percent={(doneCount / 3) * 100}
            label={zh ? "账户设置进度" : "Setup progress"}
            className="xds-prog-track"
          />
        </div>
      </div>

      <div className="xds-steps3">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className={`xds-s3${i === activeIndex ? " xds-is-active" : ""}`}
          >
            <div className="xds-s3-top">
              <span
                className="xds-step-num"
                style={
                  step.done
                    ? { background: "var(--success)", borderColor: "var(--success)", color: "#fff" }
                    : i === activeIndex
                      ? { background: "var(--blue-500)", borderColor: "var(--blue-500)", color: "#fff" }
                      : undefined
                }
              >
                {step.done ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
              </span>
              <span className="xds-s3-title">{step.title}</span>
              {step.done ? (
                <XdsBadge tone="success">{zh ? "已完成" : "Done"}</XdsBadge>
              ) : i === activeIndex ? (
                <XdsBadge tone="warning">{zh ? "待办" : "To do"}</XdsBadge>
              ) : (
                <XdsBadge>{zh ? "待验证" : "Pending"}</XdsBadge>
              )}
            </div>

            <p className="xds-s3-desc">{step.desc}</p>

            <div className="xds-s3-checks">
              {step.checks.map((c) => (
                <div
                  key={c.label}
                  className={`xds-s3-check ${c.ok ? "xds-ok" : "xds-todo"}`}
                >
                  {c.ok ? (
                    <CheckCircle2
                      className="h-3.5 w-3.5"
                      style={{ color: "var(--success)" }}
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {c.label}
                </div>
              ))}
            </div>

            {i === 1 && connectionContent ? (
              <div className="xds-s3-connection">{connectionContent}</div>
            ) : null}

            <div className="xds-s3-act">
              {i === 0 ? (
                <XdsButton
                  variant={i === activeIndex ? "primary" : "secondary"}
                  size="sm"
                  onClick={onSetupMfa}
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {step.done
                    ? zh ? "管理 MFA" : "Manage MFA"
                    : zh ? "去绑定 MFA" : "Bind MFA"}
                </XdsButton>
              ) : null}
              {i === 1 && !connectionContent ? (
                <a
                  href="#xds-vless"
                  className={`xds-btn xds-btn-sm ${i === activeIndex ? "xds-btn-primary" : "xds-btn-secondary"}`}
                >
                  {zh ? "查看连接凭据" : "View credentials"}
                </a>
              ) : null}
              {i === 2 ? (
                <a
                  href="#xds-vless"
                  className={`xds-btn xds-btn-sm ${i === activeIndex ? "xds-btn-primary" : "xds-btn-ghost"}`}
                >
                  {zh ? "查看连接凭据" : "View credentials"}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════ 账户元信息条 ═══════════════════════════════════ */

export function IdentityStrip({
  items,
}: {
  items: Array<{ k: string; v: ReactNode }>;
}) {
  return (
    <div className="xds-kv-strip">
      {items.map((item) => (
        <div key={item.k} className="xds-kv">
          <div className="xds-kv-k">{item.k}</div>
          <div className="xds-kv-v">{item.v}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════ VLESS 连接卡 ═══════════════════════════════════ */

export function VlessConnectionCard({
  proxyUuid,
  nodes,
  zh,
  embedded = false,
}: {
  /** 代理 UUID —— VLESS 访问凭据，与账户身份 uuid 是两个字段（见 #220） */
  proxyUuid: string | null;
  nodes: VlessNode[];
  zh: boolean;
  embedded?: boolean;
}) {
  const [selectedRegionCode, setSelectedRegionCode] = useState<string | null>(null);
  const regionOptions = useMemo(() => regionalNodeOptions(nodes), [nodes]);
  const useCompactRegionSelect = regionOptions.length > 4;
  const node = useMemo(() => {
    return regionOptions.find(({ pool }) => pool.code === selectedRegionCode)?.node ?? regionOptions[0]?.node;
  }, [regionOptions, selectedRegionCode]);
  useEffect(() => {
    const currentRegion = regionOptions.find(({ node: candidate }) => candidate === node)?.pool.code;
    if (!currentRegion) {
      setSelectedRegionCode(null);
      return;
    }
    if (selectedRegionCode !== currentRegion) setSelectedRegionCode(currentRegion);
  }, [node, regionOptions, selectedRegionCode]);
  const uri = useMemo(() => buildVlessUri(proxyUuid, node), [proxyUuid, node]);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!uri) {
      setQr(null);
      return () => {
        cancelled = true;
      };
    }
    toDataURL(uri, { margin: 1, width: 232, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch((err) => {
        console.warn("Failed to render VLESS QR", err);
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const handleCopy = useCallback(async () => {
    if (!uri) return;
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.warn("Failed to copy VLESS URI", err);
    }
  }, [uri]);

  const handleDownload = useCallback(() => {
    if (!uri) return;
    const blob = new Blob([uri], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "xconnect-subscription.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [uri]);

  const cardBody = (
    <XdsCardBody className="xds-vless-body">
      {regionOptions.length > 1 ? (
        <div className="xds-vless-regions" aria-label={zh ? "选择节点区域" : "Choose node region"}>
          <div className="xds-vless-regions-label">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {zh ? "节点区域" : "Node region"}
          </div>
          {useCompactRegionSelect ? (
            <select
              className="xds-vless-region-select"
              aria-label={zh ? "选择节点区域" : "Choose node region"}
              value={selectedRegionCode ?? ""}
              onChange={(event) => setSelectedRegionCode(event.target.value)}
            >
              {regionOptions.map((option) => (
                <option key={option.pool.code} value={option.pool.code}>
                  {`${option.pool.shortCode} ${zh ? "区域" : "Region"}`}
                </option>
              ))}
            </select>
          ) : (
            <div className="xds-vless-region-list" role="list">
              {regionOptions.map((option) => {
                const active = selectedRegionCode === option.pool.code;
                return (
                  <button
                    key={option.pool.code}
                    type="button"
                    aria-pressed={active}
                    className={`xds-vless-region${active ? " xds-is-active" : ""}`}
                    onClick={() => setSelectedRegionCode(option.pool.code)}
                  >
                    {`${option.pool.shortCode} ${zh ? "区域" : "Region"}`}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
      <div className="xds-qr">
        {qr ? (
          <Image
            src={qr}
            alt={zh ? "VLESS 订阅二维码" : "VLESS subscription QR code"}
            width={102}
            height={102}
            unoptimized
            style={{ width: "100%", height: "auto" }}
          />
        ) : (
          <div
            style={{
              display: "grid",
              placeItems: "center",
              height: "100%",
              fontSize: "var(--fs-micro)",
              color: "var(--text-tertiary)",
            }}
          >
            {DASH}
          </div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div className="xds-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <XdsButton variant="primary" size="sm" onClick={handleCopy} disabled={!uri}>
            {copied ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied
              ? zh ? "已复制" : "Copied"
              : zh ? "复制订阅链接" : "Copy subscription link"}
          </XdsButton>
          <XdsButton size="sm" onClick={handleDownload} disabled={!uri}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {zh ? "下载订阅链接" : "Download subscription"}
          </XdsButton>
        </div>
      </div>
    </XdsCardBody>
  );

  if (embedded) return <div id="xds-vless" className="xds-vless-embedded">{cardBody}</div>;

  return (
    <XdsCard id="xds-vless">
      <XdsCardHead
        title={zh ? "VLESS 连接" : "VLESS connection"}
        description={
          zh
            ? "扫码或复制订阅链接，导入任意支持 VLESS 的客户端。"
            : "Scan or copy the subscription link into any VLESS-capable client."
        }
        actions={
          uri ? (
            <XdsBadge tone="success">{zh ? "凭据已就绪" : "Ready"}</XdsBadge>
          ) : (
            <XdsBadge tone="warning">{zh ? "凭据未就绪" : "Not ready"}</XdsBadge>
          )
        }
      />
      {cardBody}
      <XdsCardFoot>
        <span className="xds-t-caption">
          {zh
            ? "凭据可独立于账户身份轮换。轮换后旧链接立即失效，已连接的客户端需重新导入。"
            : "Credentials rotate independently of account identity. Rotating invalidates the old link immediately."}
        </span>
      </XdsCardFoot>
    </XdsCard>
  );
}

/* ═══════════════════════════════════ 配额卡 ═══════════════════════════════════ */

export function QuotaCard({
  usage,
  policy,
  zh,
}: {
  usage?: AccountUsageSummary;
  policy?: AccountPolicy;
  zh: boolean;
}) {
  const percent = usage?.usagePercent;
  const planName = usage?.billingProfile?.packageName || "default";
  const planMaxQuota = currentPlanMaxQuota(usage);
  const quotaExhausted = usage?.quotaExhausted === true;
  const accessPaused =
    usage?.networkAccessState === "paused" ||
    usage?.networkAccessState === "blocked";
  const accessLabel = (() => {
    switch (usage?.networkAccessReason) {
      case "quota_exhausted":
        return zh ? "额度已用尽 · 已暂停" : "Quota exhausted · Paused";
      case "billing_suspended":
        return zh ? "账务暂停" : "Billing suspended";
      case "operator_paused":
        return zh ? "管理员暂停" : "Operator paused";
      default:
        return usage?.arrears
          ? zh
            ? "欠费"
            : "Arrears"
          : zh
            ? "正常"
            : "Normal";
    }
  })();
  return (
    <XdsCard>
      <XdsCardHead
        title={zh ? "月度配额" : "Monthly quota"}
        actions={
          <XdsBadge dot={false}>
            {zh ? "套餐" : "Plan"} {planName} · {zh ? "最大流量" : "Max"}{" "}
            {bytesOrDash(planMaxQuota)}
            {zh ? " / 月" : " / month"}
          </XdsBadge>
        }
      />
      <XdsCardBody>
        <div className="xds-row-between" style={{ alignItems: "flex-end" }}>
          <div className="xds-stat-value" style={{ fontSize: "var(--fs-h1)" }}>
            {pct(percent)}
            <span className="xds-unit">%</span>
          </div>
          <span className="xds-t-caption xds-t-mono">
            {bytesOrDash(usage?.usedBytes)} / {bytesOrDash(planMaxQuota)}
          </span>
        </div>
        <XdsMeter
          percent={percent}
          label={zh ? "月度配额" : "Monthly quota"}
          className="xds-mt-12"
        />
        <div className="xds-row-between" style={{ marginTop: 8 }}>
          <span className="xds-t-caption">
            {zh ? "剩余" : "Remaining"}{" "}
            {bytesOrDash(usage?.remainingIncludedQuota)}
          </span>
          <span className="xds-t-caption">
            {zh ? "本期重置" : "Resets"} {dateOrDash(usage?.periodEnd)}
          </span>
        </div>

        {quotaExhausted ? (
          <div
            role="status"
            className="xds-t-caption"
            style={{
              marginTop: 12,
              padding: "10px 12px",
              border: "1px solid var(--danger-border)",
              borderRadius: "var(--r-md)",
              background: "var(--danger-bg)",
              color: "var(--danger)",
            }}
          >
            {zh
              ? "本月配额已用尽，用户配置同步已暂停。配额续期或调整后会自动恢复。"
              : "This month’s quota is exhausted. User configuration sync is paused and restores automatically after renewal or adjustment."}
          </div>
        ) : null}

        <div className="xds-divider" style={{ margin: "20px 0" }} />

        <div className="xds-sec-row">
          <span className="xds-t-caption">{zh ? "余额" : "Balance"}</span>
          <span className="xds-t-mono xds-t-body-sm">
            {typeof usage?.currentBalance === "number"
              ? usage.currentBalance.toFixed(2)
              : DASH}
          </span>
        </div>
        <div className="xds-sec-row">
          <span className="xds-t-caption">
            {zh ? "策略组" : "Policy groups"}
          </span>
          <span className="xds-t-caption xds-subtle">
            {policy?.eligibleNodeGroups?.join(", ") || DASH}
          </span>
        </div>
        <div className="xds-sec-row">
          <span className="xds-t-caption">
            {zh ? "同步状态" : "Sync state"}
          </span>
          {usage ? (
            <XdsBadge
              tone={accessPaused || usage.arrears ? "danger" : "success"}
            >
              {accessLabel}
            </XdsBadge>
          ) : (
            <span className="xds-t-caption xds-subtle">{DASH}</span>
          )}
        </div>
        <div className="xds-sec-row">
          <span className="xds-t-caption">
            {zh ? "统计延迟" : "Sync delay"}
          </span>
          <span className="xds-t-mono xds-t-caption">
            {typeof usage?.syncDelaySeconds === "number"
              ? `~${usage.syncDelaySeconds} s`
              : DASH}
          </span>
        </div>

        <BoundaryLink
          href="/panel/subscription"
          className="xds-btn xds-btn-secondary xds-btn-block"
          style={{ marginTop: 16 }}
        >
          {zh ? "管理订阅与配额" : "Manage subscription and quota"}
        </BoundaryLink>
      </XdsCardBody>
    </XdsCard>
  );
}

/* ═══════════════════════════════════ 实时流量 ═══════════════════════════════════ */

export function UsageCard({
  breakdown,
  sourceOfTruth,
  hasTraffic,
  zh,
}: {
  breakdown: { last1Hour: number; last24Hours: number; monthToDate: number };
  sourceOfTruth?: string;
  hasTraffic: boolean;
  zh: boolean;
}) {
  return (
    <XdsCard>
      <XdsCardHead
        title={zh ? "实时流量" : "Live traffic"}
        description={
          zh
            ? `用量由 accounts.svc.plus 汇总，不以本地客户端计数为准 · 数据源 ${sourceOfTruth || DASH}`
            : `Aggregated by accounts.svc.plus, not the local client · source ${sourceOfTruth || DASH}`
        }
      />
      <XdsCardBody>
        <div className="xds-grid xds-g-3" style={{ gap: 20 }}>
          <div>
            <div className="xds-stat-label">{zh ? "最近 1 小时" : "Last hour"}</div>
            <div className="xds-stat-value">{formatBytes(breakdown.last1Hour)}</div>
          </div>
          <div>
            <div className="xds-stat-label">{zh ? "最近 24 小时" : "Last 24 hours"}</div>
            <div className="xds-stat-value">{formatBytes(breakdown.last24Hours)}</div>
          </div>
          <div>
            <div className="xds-stat-label">{zh ? "本月合计" : "Month to date"}</div>
            <div className="xds-stat-value">{formatBytes(breakdown.monthToDate)}</div>
          </div>
        </div>

        {!hasTraffic ? (
          <div
            style={{
              marginTop: 20,
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 16,
            }}
          >
            {/* 空态必须带出口 —— 原版这里是一片空白，读起来像页面坏了 */}
            <XdsEmpty
              icon={<Activity className="h-9 w-9" />}
              title={zh ? "还没有流量数据" : "No traffic yet"}
              description={
                zh
                  ? "完成第 3 步验证连接后，这里会显示按分钟聚合的用量。"
                  : "Once step 3 is verified, per-minute usage shows up here."
              }
              action={
                <a href="#xds-vless" className="xds-btn xds-btn-secondary xds-btn-sm">
                  {zh ? "查看连接凭据" : "View credentials"}
                </a>
              }
            />
          </div>
        ) : null}
      </XdsCardBody>
    </XdsCard>
  );
}

/* ═══════════════════════════════ 区域入口与 pool ═══════════════════════════════ */

export function NodesTable({ zh }: { zh: boolean }) {
  return (
    <XdsCard id="xds-nodes">
      <XdsCardHead
        title={zh ? "区域入口" : "Regional entry points"}
        description={
          zh
            ? "仅展示区域入口域名与 pool 数量，不展示具体运行节点。"
            : "Shows regional entry domains and pool counts only; individual runtime nodes are not displayed."
        }
        actions={
          <XdsBadge dot={false}>{XCONNECT_REGIONAL_POOLS.length}</XdsBadge>
        }
      />
      <div className="xds-scroll-x">
        <table className="xds-table">
          <thead>
            <tr>
              <th>{zh ? "区域" : "Region"}</th>
              <th>{zh ? "区域代码" : "Region code"}</th>
              <th>{zh ? "区域入口" : "Regional entry point"}</th>
              <th style={{ textAlign: "right" }}>{zh ? "Pool 数量" : "Pools"}</th>
            </tr>
          </thead>
          <tbody>
            {XCONNECT_REGIONAL_POOLS.map((pool) => (
              <tr key={pool.code}>
                <td style={{ fontWeight: 500 }}>{zh ? pool.zhName : pool.enName}</td>
                <td className="xds-t-mono xds-subtle">{pool.code}</td>
                <td className="xds-t-mono xds-subtle">{pool.entry}</td>
                <td style={{ textAlign: "right" }}>{pool.poolCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <XdsCardFoot>
        <div className="xds-row-between">
          <span className="xds-t-caption">
            {zh ? `显示 ${XCONNECT_REGIONAL_POOLS.length} 个区域 pool` : `${XCONNECT_REGIONAL_POOLS.length} regional pools`}
          </span>
          <BoundaryLink href="/docs" className="xds-link-arrow xds-t-caption">
            {zh ? "区域入口说明" : "Regional entry point guide"}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </BoundaryLink>
        </div>
      </XdsCardFoot>
    </XdsCard>
  );
}
