"use client";

import React from "react";
import BoundaryLink from "@/components/common/BoundaryLink";
import {
  Activity,
  ArrowUpRight,
  ExternalLink,
  Globe,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { useLanguage } from "@i18n/LanguageProvider";
import {
  XdsBadge,
  XdsButton,
  XdsCard,
  XdsCardBody,
  XdsCardHead,
} from "@/components/ui/xds";
import GlobalMeshMap from "@/app/products/global-mesh/GlobalMeshMap";

interface VpsProviderSummary {
  name: string;
  tagline: string;
  pops: string;
  specs: string;
  rtt: string;
  status: string;
  color: string;
}

interface SaasProviderSummary {
  name: string;
  tagline: string;
  pops: string;
  specs: string;
  rtt: string;
  status: string;
  color: string;
}

const VPS_PROVIDERS: VpsProviderSummary[] = [
  {
    name: "Vultr",
    tagline: "智算主力与全球 Anycast 骨干",
    pops: "32+ 全球 PoP",
    specs: "NVIDIA GH200/H100 · Ampere ARM · VKE K8s",
    rtt: "29ms (东京/首尔)",
    status: "运行正常",
    color: "bg-blue-500",
  },
  {
    name: "Linode (Akamai)",
    tagline: "Akamai Tier-1 骨干与托管 Kubernetes",
    pops: "11+ 核心机房",
    specs: "LKE 免费控制面 · RTX6000 GPU · 对象存储",
    rtt: "31ms (东京/新加坡)",
    status: "运行正常",
    color: "bg-emerald-500",
  },
  {
    name: "Hetzner",
    tagline: "极致性价比与海量流量枢纽",
    pops: "6+ 绿能数据中心",
    specs: "2C4G ARM €3.79 · 20TB 免费流量 · FSN1/NBG1",
    rtt: "48ms (新加坡/欧美)",
    status: "运行正常",
    color: "bg-red-500",
  },
  {
    name: "Contabo",
    tagline: "高性价比大容量与存储冷备集群",
    pops: "9+ 欧美亚太节点",
    specs: "4 vCPU / 6G 内存 / 100G NVMe / 32TB 流量",
    rtt: "40ms (东京/纽伦堡)",
    status: "运行正常",
    color: "bg-amber-500",
  },
  {
    name: "UCloud",
    tagline: "优质 CN2 GIA / BGP 回国专线运维跳板",
    pops: "8+ 东亚东南亚 PoP",
    specs: "CN2 GIA · 香港/台北/东京/首尔 · 2.5 USD/mo 轻量",
    rtt: "22ms (香港/台北)",
    status: "运行正常",
    color: "bg-indigo-500",
  },
];

const SAAS_PROVIDERS: SaasProviderSummary[] = [
  {
    name: "Cloudflare",
    tagline: "全球 Anycast 边缘与零出网存储总线",
    pops: "300+ 边缘数据中心",
    specs: "Anycast DNS · Pages · Workers · R2 0元出网存储",
    rtt: "< 15ms (Edge)",
    status: "运行正常",
    color: "bg-orange-500",
  },
  {
    name: "GCP Cloud Run",
    tagline: "Scale-to-Zero 弹性无服务器微服务",
    pops: "36+ 全球区域",
    specs: "Knative 弹性容器 · Andromeda 骨干 · 200万免费请求",
    rtt: "31ms (东京/us-c)",
    status: "运行正常",
    color: "bg-blue-500",
  },
  {
    name: "Supabase (双轨)",
    tagline: "云端统一认证 + VPS 自建关系与向量库",
    pops: "云端 + 德/芬 VPS",
    specs: "GoTrue Auth 50k MAU 免费 · PG 16 + pgvector 存储无上限",
    rtt: "28ms (统一鉴权)",
    status: "运行正常",
    color: "bg-emerald-500",
  },
  {
    name: "Observability",
    tagline: "observability.svc.plus 全栈遥测中枢",
    pops: "法兰克福/纽伦堡",
    specs: "VictoriaMetrics/Logs/Traces + ClickHouse + Grafana",
    rtt: "35ms (泛欧接入)",
    status: "运行正常",
    color: "bg-purple-500",
  },
  {
    name: "GitHub + Gitea",
    tagline: "云端 GitOps 权威 + 私网构建容灾",
    pops: "全球 + VPS 内部",
    specs: "Actions OIDC 云凭据 · VPS act_runner 离线构建",
    rtt: "内网直通",
    status: "运行正常",
    color: "bg-slate-500",
  },
];

const LIFECYCLE_QUICK_STATUS = [
  { id: "code", name: "Code", status: "GitHub OIDC + Gitea 双轨", tag: "就绪", color: "text-blue-600 dark:text-blue-400" },
  { id: "plan", name: "Plan", status: "动静解耦 · 节约 90% 成本", tag: "$25/月", color: "text-emerald-600 dark:text-emerald-400" },
  { id: "build", name: "Build", status: "Actions + VPS act_runner", tag: "无限时", color: "text-amber-600 dark:text-amber-400" },
  { id: "deploy", name: "Deploy", status: "GitOps 对账 + Pages/Worker", tag: "零停机", color: "text-cyan-600 dark:text-cyan-400" },
  { id: "security", name: "Security", status: "Vault Server 自建 + HCP Cloud", tag: "0硬编码", color: "text-rose-600 dark:text-rose-400" },
  { id: "run", name: "Run", status: "CDN + Serverless + VPS 裸金属", tag: "三合一", color: "text-violet-600 dark:text-violet-400" },
  { id: "obs", name: "Obs", status: "Victoria 全家桶 + 外部独立哨兵", tag: "防自盲", color: "text-pink-600 dark:text-pink-400" },
];

export default function UserCenterGlobalMeshRoute() {
  const { language } = useLanguage();
  const zh = language !== "en";
  const [providerTab, setProviderTab] = React.useState<"vps" | "saas">("vps");

  return (
    <div className="xds space-y-6" style={{ background: "transparent" }}>
      {/* ── 顶部头图与导航 ── */}
      <header className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 p-5 md:p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Globe className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {zh ? "Global Mesh 全球双网拓扑" : "Global Mesh Dual-Mesh Topology"}
              </h1>
              <XdsBadge tone="success">
                {zh ? "VPS + SaaS 双轮就绪" : "VPS + SaaS Dual Ready"}
              </XdsBadge>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              {zh
                ? "集中监控与调度五大 VPS 算力节点与五大云原生 SaaS 基础设施（Code·Plan·Build·Deploy·Security·Run·Obs 全链路就绪）。"
                : "Monitor and orchestrate compute nodes across 5 major VPS providers and 5 cloud-native SaaS services."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <BoundaryLink
              href="/products/global-mesh"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{zh ? "访问产品展示页" : "View Product Showcase"}</span>
            </BoundaryLink>
          </div>
        </div>
      </header>

      {/* ── 核心交互式全局地图 (8:4 黄金分割) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {zh ? "全球双网地理分布 (VPS 算力 PoP + SaaS 零信任网格)" : "Global PoP Geo Map (VPS + SaaS Dual-Mesh)"}
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {zh ? "实时 mTLS 加密隧道" : "Active mTLS Tunnels"}
          </span>
        </div>
        <GlobalMeshMap />
      </section>

      {/* ── 在线服务工程全生命周期运行状态条 ── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {zh ? "在线服务工程全生命周期状态 (Code · Plan · Build · Deploy · Security · Run · Obs)" : "Online Service Engineering Lifecycle"}
          </h2>
          <BoundaryLink
            href="/products/global-mesh"
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 font-medium"
          >
            <span>{zh ? "查看架构与成本对账" : "View Architecture & FinOps"}</span>
            <ArrowUpRight className="h-3 w-3" />
          </BoundaryLink>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {LIFECYCLE_QUICK_STATUS.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  {item.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  {item.tag}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {item.status}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 服务矩阵 (VPS 算力池 vs SaaS 基础设施) ── */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {zh ? "基础设施矩阵 (算力节点 & 云原生服务)" : "Infrastructure Matrix"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setProviderTab("vps")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  providerTab === "vps"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>⚡️ 5 大 VPS 算力节点</span>
              </button>
              <button
                type="button"
                onClick={() => setProviderTab("saas")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  providerTab === "saas"
                    ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>🌐 5 大云原生 SaaS 服务</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {providerTab === "vps"
            ? VPS_PROVIDERS.map((provider) => (
                <div
                  key={provider.name}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${provider.color}`} />
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {provider.name}
                      </span>
                    </div>
                    <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                      {provider.rtt}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {provider.pops}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">
                    {provider.specs}
                  </p>
                </div>
              ))
            : SAAS_PROVIDERS.map((saas) => (
                <div
                  key={saas.name}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-2 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${saas.color}`} />
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {saas.name}
                      </span>
                    </div>
                    <span className="rounded-md bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:text-purple-400">
                      {saas.rtt}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {saas.pops}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">
                    {saas.specs}
                  </p>
                </div>
              ))}
        </div>
      </section>

      {/* ── 底部架构与协议指标 ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-1.5">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-medium text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>{zh ? "零信任安全与凭据总线" : "Zero-Trust & Vault Security"}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {zh
              ? "基于 HashiCorp Vault (自建 Raft / HCP Cloud) 与 WireGuard 隧道，代码与机器全链路 0 硬编码凭据，节点仅私网互联。"
              : "Zero hardcoded credentials via HashiCorp Vault (Self-hosted Raft / HCP Cloud) & WireGuard mesh mTLS isolation."}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-1.5">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-medium text-xs">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>{zh ? "BGP Anycast 与动态容灾" : "BGP Anycast Failover"}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {zh
              ? "多机房 Anycast 宣告，单机房故障或运营商割接时毫秒级自动切换至备选 PoP。"
              : "Sub-second failover across regions during maintenance or route degradation via BGP Anycast."}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-1.5">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-medium text-xs">
            <Network className="h-4 w-4 text-blue-500" />
            <span>{zh ? "产品全景与控制台无缝联动" : "Seamless Portal Integration"}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {zh
              ? "可在用户中心直接观测算力拓扑，并随时前往产品页查看全球价格矩阵与规格明细。"
              : "View active topology in console and seamlessly access multi-cloud benchmark and pricing details."}
          </p>
        </div>
      </section>
    </div>
  );
}
