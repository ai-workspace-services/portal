"use client";

/**
 * 用户中心 —— Micro SaaS 模版第 2 页
 *
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版/02-user-center.html
 *
 * 相对原版的三处结构性改动：
 * 1. 三个引导步骤原本挂三个同等权重的按钮（第 2 步还是最抢眼的蓝色实心），
 *    现在只有「当前待办」那一步用 primary，视线自然落到该点的地方。
 * 2. 加了完成度进度条，把抽象的步骤变成有终点的进度。
 * 3. 流量为空时给 empty state + 出口按钮，而不是留一片白。
 *
 * 数据来源全部沿用既有 SWR key 与 API，没有新增字段，也没有推断任何
 * 服务端未返回的指标。
 */

import { useCallback, useMemo } from "react";
import BoundaryLink from "@/components/common/BoundaryLink";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { BookOpen, Copy, RefreshCw } from "lucide-react";

import { useUserStore } from "@lib/userStore";
import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";
import { hasPublicUserEmail } from "@lib/publicUserIdentity";
import {
  XdsBadge,
  XdsButton,
  XdsCard,
  XdsCardBody,
  XdsCardHead,
  XdsValueBox,
} from "@/components/ui/xds";

import MfaSetupPanel from "../account/MfaSetupPanel";
import AccountPolicySecurityPanel from "../components/AccountPolicySecurityPanel";
import ServiceReadinessCard from "../components/ServiceReadinessCard";
import {
  IdentityStrip,
  NodesTable,
  OnboardingProgress,
  QuotaCard,
  UsageCard,
  VlessConnectionCard,
} from "../components/xds/AccountPanels";
import {
  fetchAccountPolicy,
  fetchAccountUsageBuckets,
  fetchAccountUsageSummary,
} from "../lib/fetchAccountUsage";
import { fetchAgentNodes } from "../lib/fetchAgentNodes";
import type { VlessNode } from "../lib/vless";

const DASH = "—";

/**
 * 分钟级桶在客户端聚合成小时 / 天 / 月三档 —— accounts 没有单独的 rollup
 * 接口，这段逻辑与 SubscriptionPanel 保持一致。
 */
function summarizeUsageBuckets(
  buckets: { bucketStart: string; totalBytes: number }[] | undefined,
) {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;
  let last1Hour = 0;
  let last24Hours = 0;
  let monthToDate = 0;
  for (const bucket of buckets ?? []) {
    const ts = new Date(bucket.bucketStart).getTime();
    if (Number.isNaN(ts)) continue;
    monthToDate += bucket.totalBytes;
    if (ts >= dayAgo) last24Hours += bucket.totalBytes;
    if (ts >= hourAgo) last1Hour += bucket.totalBytes;
  }
  return { last1Hour, last24Hours, monthToDate };
}

export default function UserCenterAccountRoute() {
  const router = useRouter();
  const { language } = useLanguage();
  const zh = language !== "en";
  const copy = translations[language].userCenter.account;

  const user = useUserStore((state) => state.user);
  const isReadOnlyRole = Boolean(user?.isReadOnly);
  // VLESS 访问凭据用 proxyUuid，不是账户身份 uuid（见 #220）
  const proxyUuid = user?.proxyUuid || null;

  const { data: usageSummary, mutate: mutateUsage } = useSWR(
    "account-usage-summary",
    fetchAccountUsageSummary,
  );
  const { data: accountPolicy } = useSWR("account-policy", fetchAccountPolicy);
  const { data: nodes } = useSWR<VlessNode[]>(
    "user-center-agent-nodes",
    fetchAgentNodes,
  );

  const monthStart = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const { data: usageBuckets, mutate: mutateBuckets } = useSWR(
    ["account-usage-buckets", monthStart.toISOString()],
    () => fetchAccountUsageBuckets(monthStart),
  );
  const breakdown = useMemo(
    () => summarizeUsageBuckets(usageBuckets?.buckets),
    [usageBuckets?.buckets],
  );
  const hasTraffic =
    breakdown.last1Hour + breakdown.last24Hours + breakdown.monthToDate > 0;

  const nodeList = nodes ?? [];
  const credentialsReady = Boolean(proxyUuid);
  // 「验证连接」只有在服务端确实下发了节点、且已经出现过用量时才算完成。
  // 没有连通性接口，所以不假装知道单个节点通不通。
  const connectionVerified = nodeList.length > 0 && hasTraffic;

  const showEmail = hasPublicUserEmail({ email: user?.email, role: user?.role });

  const handleSetupMfa = useCallback(() => {
    router.push("/panel/account?setupMfa=1");
  }, [router]);

  const handleCopyProxyUuid = useCallback(async () => {
    if (!proxyUuid) return;
    try {
      await navigator.clipboard.writeText(proxyUuid);
    } catch (err) {
      console.warn("Failed to copy proxy UUID", err);
    }
  }, [proxyUuid]);

  const handleRefresh = useCallback(() => {
    void mutateUsage();
    void mutateBuckets();
  }, [mutateBuckets, mutateUsage]);

  return (
    <div className="xds" style={{ background: "transparent" }}>
      <div className="xds-stack">
        <header className="xds-page-head">
          <div className="xds-row-between">
            <div>
              <h1 className="xds-page-title">{zh ? "开始使用" : "Get started"}</h1>
              <p className="xds-page-sub">
                {zh
                  ? "按下面的步骤完成账户设置，即可安全使用 XConnect 服务。所有状态均以当前账号 API 返回为准。"
                  : "Follow the steps below to finish account setup. Every status here reflects what your account's API returns."}
              </p>
            </div>
            <div className="xds-row" style={{ gap: 8 }}>
              <XdsButton size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {zh ? "刷新状态" : "Refresh"}
              </XdsButton>
              <BoundaryLink href="/docs" className="xds-btn xds-btn-secondary xds-btn-sm">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                {zh ? "部署向导" : "Deployment guide"}
              </BoundaryLink>
            </div>
          </div>
        </header>

        {/* ── 三步引导 ── */}
        {!isReadOnlyRole ? (
          <OnboardingProgress
            zh={zh}
            onSetupMfa={handleSetupMfa}
            state={{
              emailVerified: Boolean(user?.email),
              mfaEnabled: Boolean(user?.mfaEnabled),
              mfaPending: Boolean(user?.mfaPending),
              credentialsReady,
              connectionVerified,
            }}
          />
        ) : null}

        {/* ── 账户元信息条 ── */}
        <IdentityStrip
          items={[
            { k: zh ? "账户" : "Account", v: user?.username ?? DASH },
            {
              k: zh ? "账户类型" : "Account type",
              v: isReadOnlyRole
                ? zh ? "只读体验" : "Read-only demo"
                : zh ? "标准用户" : "Standard",
            },
            {
              k: zh ? "邮箱验证" : "Email",
              v: user?.email ? (
                <XdsBadge tone="success">{zh ? "已验证" : "Verified"}</XdsBadge>
              ) : (
                <XdsBadge tone="warning">{zh ? "待验证" : "Unverified"}</XdsBadge>
              ),
            },
            {
              k: zh ? "安全强度" : "Security",
              v:
                user?.mfaEnabled && !user?.mfaPending ? (
                  <XdsBadge tone="success">{zh ? "MFA 已启用" : "MFA on"}</XdsBadge>
                ) : (
                  <XdsBadge tone="warning">
                    {zh ? "建议启用 MFA" : "Enable MFA"}
                  </XdsBadge>
                ),
            },
            {
              k: zh ? "账户权限" : "Permissions",
              v: isReadOnlyRole
                ? zh ? "仅查看" : "View only"
                : zh ? "使用服务与查看" : "Use and view",
            },
          ]}
        />

        {/* ── 连接凭据 ── */}
        <section className="xds-uc-hero">
          <VlessConnectionCard proxyUuid={proxyUuid} nodes={nodeList} zh={zh} />

          <XdsCard className="xds-uuid-card">
            <XdsCardHead
              title={zh ? "代理 UUID" : "Proxy UUID"}
              actions={
                <XdsButton
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyProxyUuid}
                  disabled={!proxyUuid}
                  aria-label={zh ? "复制代理 UUID" : "Copy proxy UUID"}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  {zh ? "复制" : "Copy"}
                </XdsButton>
              }
            />
            <XdsCardBody>
              <XdsValueBox>{proxyUuid ?? DASH}</XdsValueBox>
              <p className="xds-t-caption xds-mt-12">
                {zh
                  ? "访问代理节点的凭据，可独立于账户身份轮换。"
                  : "The credential used to reach proxy nodes; rotates independently of account identity."}
              </p>

              <div className="xds-divider" style={{ margin: "16px 0" }} />

              <div className="xds-sec-row">
                <span className="xds-t-caption">{zh ? "用户名" : "Username"}</span>
                <span className="xds-t-body-sm" style={{ fontWeight: 500 }}>
                  {user?.username ?? DASH}
                </span>
              </div>
              <div className="xds-sec-row">
                <span className="xds-t-caption">{zh ? "邮箱" : "Email"}</span>
                <span className="xds-t-body-sm xds-t-mono">
                  {showEmail ? user?.email : DASH}
                </span>
              </div>
              <div className="xds-sec-row">
                <span className="xds-t-caption">
                  {zh ? "多因素认证" : "Multi-factor auth"}
                </span>
                {user?.mfaEnabled && !user?.mfaPending ? (
                  <XdsBadge tone="success">{zh ? "已启用" : "Enabled"}</XdsBadge>
                ) : user?.mfaPending ? (
                  <XdsBadge tone="warning">{zh ? "待确认" : "Pending"}</XdsBadge>
                ) : (
                  <XdsBadge tone="warning">{zh ? "未设置" : "Not set"}</XdsBadge>
                )}
              </div>
            </XdsCardBody>
          </XdsCard>
        </section>

        {/* ── 实时流量 + 配额 ── */}
        <section
          className="xds-grid"
          style={{
            gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)",
            alignItems: "start",
          }}
        >
          <UsageCard
            zh={zh}
            breakdown={breakdown}
            hasTraffic={hasTraffic}
            sourceOfTruth={usageSummary?.sourceOfTruth}
          />
          <QuotaCard zh={zh} usage={usageSummary} policy={accountPolicy} />
        </section>

        {/* ── 运行节点 ── */}
        <NodesTable zh={zh} />

        {/* ── 策略与安全 ── */}
        <section className="xds-stack">
          <div className="xds-sec-head" style={{ maxWidth: "none" }}>
            <span className="xds-t-eyebrow">Policy &amp; security</span>
            <h2 className="xds-t-h2">{zh ? "策略与安全" : "Policy and security"}</h2>
          </div>
          <AccountPolicySecurityPanel
            mfaEnabled={Boolean(user?.mfaEnabled)}
            mfaPending={Boolean(user?.mfaPending)}
            canManageMfa={!isReadOnlyRole}
          />
          {!isReadOnlyRole ? <ServiceReadinessCard /> : null}
          {!isReadOnlyRole ? <MfaSetupPanel showSummary={false} /> : null}
        </section>
      </div>
    </div>
  );
}
