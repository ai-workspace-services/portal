"use client";

import useSWR from "swr";
import { RefreshCw, ShieldCheck } from "lucide-react";

import { useLanguage } from "@i18n/LanguageProvider";
import {
  XdsBadge,
  XdsButton,
  XdsCard,
  XdsCardBody,
  XdsCardHead,
} from "@/components/ui/xds";
import GatewayRoutingPolicyCard from "../components/GatewayRoutingPolicyCard";
import { NodesTable } from "../components/xds/AccountPanels";
import { fetchRegionalPools, type RegionalPool } from "../lib/regionalPools";
import {
  DEFAULT_ROUTING_POLICY_YAML,
  fetchRoutingPolicy,
  type RoutingPolicyResponse,
} from "../lib/routingPolicy";

export default function UserCenterGatewayRoute() {
  const { language } = useLanguage();
  const zh = language !== "en";

  const {
    data: pools,
    isLoading: poolsLoading,
    error: poolsError,
    mutate: mutatePools,
  } = useSWR<RegionalPool[]>("user-center-regional-pools", fetchRegionalPools, {
    refreshInterval: 30_000,
  });

  const {
    data: policyData,
    mutate: mutatePolicy,
  } = useSWR<RoutingPolicyResponse>(
    "gateway-routing-policy",
    fetchRoutingPolicy,
    { revalidateOnFocus: false },
  );

  return (
    <div className="xds" style={{ background: "transparent" }}>
      <div className="xds-stack">
        <header className="xds-page-head">
          <div className="xds-row-between">
            <div>
              <h1 className="xds-page-title">
                {zh ? "网关路由与三层分流控制" : "Gateway Routing & Three-Tier Policy"}
              </h1>
              <p className="xds-page-sub">
                {zh
                  ? "统一管理 Media-Pool、Pro-EC2-Pool（白名单 + Blackhole 媒体防护）、Custom-Dedicated 与 Team 池状态，并同步 GitOps 策略配置。"
                  : "Manage Media-Pool, Pro-EC2-Pool (Whitelist + Blackhole media protection), Custom-Dedicated, and Team routing pools with GitOps policy sync."}
              </p>
            </div>
            <XdsButton
              size="sm"
              onClick={() => {
                void mutatePools();
                void mutatePolicy();
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {zh ? "刷新状态" : "Refresh"}
            </XdsButton>
          </div>
        </header>

        <section
          aria-label={zh ? "三层分流池矩阵" : "Three-tier routing pool matrix"}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <XdsCard>
            <XdsCardHead
              title="Media-Pool"
              actions={
                <XdsBadge tone="info" dot={false}>
                  {zh ? "全网不限流" : "Unlimited"}
                </XdsBadge>
              }
            />
            <XdsCardBody className="space-y-2 text-xs text-[var(--color-text-muted)]">
              <p>
                {zh
                  ? "公共 VPS 大流量池（Free / Shared / Plus），承担流媒体优先与全网 MATCH 兜底。"
                  : "Public high-bandwidth VPS pool (Free / Shared / Plus) for streaming media and global MATCH fallback."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <XdsBadge tone="success" dot={false}>
                  mediaOnProAction: allow
                </XdsBadge>
              </div>
            </XdsCardBody>
          </XdsCard>

          <XdsCard>
            <XdsCardHead
              title="Pro-EC2-Pool"
              actions={
                <XdsBadge tone="warning" dot={false}>
                  {zh ? "仅白名单" : "Whitelist-Only"}
                </XdsBadge>
              }
            />
            <XdsCardBody className="space-y-2 text-xs text-[var(--color-text-muted)]">
              <p>
                {zh
                  ? "公共 EC2 低延迟精品池（Pro），仅放行 AI / 开发 / 商务域名，流媒体自动黑洞阻断。"
                  : "Public low-latency EC2 pool (Pro) restricted to AI / Dev / Business whitelists with active media blackhole."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <XdsBadge tone="danger" dot={false}>
                  <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
                  mediaOnProAction: blackhole
                </XdsBadge>
              </div>
            </XdsCardBody>
          </XdsCard>

          <XdsCard>
            <XdsCardHead
              title="Custom-Dedicated"
              actions={
                <XdsBadge tone="success" dot={false}>
                  {zh ? "私有白名单 · 不限流" : "Private Whitelist Unlimited"}
                </XdsBadge>
              }
            />
            <XdsCardBody className="space-y-2 text-xs text-[var(--color-text-muted)]">
              <p>
                {zh
                  ? "非公共专属节点（Custom 白名单绑定），绝不进入公共池，客户端与服务端均无限制。"
                  : "Private dedicated nodes bound to custom whitelists, isolated from public pools with unlimited media."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <XdsBadge tone="neutral" dot={false}>
                  public_resource: false
                </XdsBadge>
              </div>
            </XdsCardBody>
          </XdsCard>

          <XdsCard>
            <XdsCardHead
              title="Team"
              actions={
                <XdsBadge tone="success" dot={false}>
                  {zh ? "团队专属" : "Dedicated"}
                </XdsBadge>
              }
            />
            <XdsCardBody className="space-y-2 text-xs text-[var(--color-text-muted)]">
              <p>
                {zh
                  ? "企业与团队独立专属资源池，按 teamId 隔离成员与流量配额。"
                  : "Dedicated organization and team pools isolated per teamId and quota assignment."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <XdsBadge tone="neutral" dot={false}>
                  5+1 · team
                </XdsBadge>
              </div>
            </XdsCardBody>
          </XdsCard>
        </section>

        <NodesTable
          zh={zh}
          pools={poolsError ? [] : (pools ?? [])}
          isLoading={poolsLoading}
          error={poolsError}
        />

        <GatewayRoutingPolicyCard
          zh={zh}
          initialYaml={policyData?.yaml ?? DEFAULT_ROUTING_POLICY_YAML}
          initialTarget={policyData?.target}
          sourceLabel={
            policyData?.source === "github"
              ? zh
                ? "GitHub 仓库同步"
                : "GitHub synced"
              : zh
                ? "规范基线模板"
                : "Canonical baseline"
          }
        />
      </div>
    </div>
  );
}
