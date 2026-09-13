"use client";

import React from "react";
import Link from "next/link";
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
    specs: "CN2 GIA · 香港/台北/东京/首尔 · $2.5/mo 轻量",
    rtt: "22ms (香港/台北)",
    status: "运行正常",
    color: "bg-indigo-500",
  },
];

export default function UserCenterGlobalMeshRoute() {
  const { language } = useLanguage();
  const zh = language !== "en";

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
                {zh ? "Global Mesh 全球算力拓扑" : "Global Mesh Compute Topology"}
              </h1>
              <XdsBadge tone="success">
                {zh ? "48+ PoPs 已互联" : "48+ PoPs Connected"}
              </XdsBadge>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              {zh
                ? "集中监控与调度亚太、美洲、欧洲五大 VPS 算力节点及 WireGuard / Xconec 零信任全互联拓扑。"
                : "Monitor and orchestrate compute nodes across 5 major VPS providers via zero-trust WireGuard full mesh."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/products/global-mesh"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{zh ? "访问产品展示页" : "View Product Showcase"}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 核心交互式全局地图与五大 VPS 运营商映射 (8:4 黄金分割) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {zh ? "全球节点地理分布与 VPS 运营商算力映射" : "Global PoP Geo Map & VPS Provider Mapping"}
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {zh ? "实时 mTLS 加密隧道" : "Active mTLS Tunnels"}
          </span>
        </div>
        <GlobalMeshMap />
      </section>

      {/* ── 五大 VPS 运营商规格矩阵 ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {zh ? "五大 VPS 运营商算力节点状态" : "Top 5 VPS Providers Status"}
            </h2>
          </div>
          <Link
            href="/products/global-mesh"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <span>{zh ? "查看完整多云基准评测" : "View Multi-cloud Benchmarks"}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {VPS_PROVIDERS.map((provider) => (
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
          ))}
        </div>
      </section>

      {/* ── 底部架构与协议指标 ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-1.5">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-medium text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>{zh ? "零信任隧道加密" : "Zero-Trust Encryption"}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {zh
              ? "基于 WireGuard 协议全互联，所有 VPS 节点仅通过私网 mTLS 互访，公网对外 0 端口暴露。"
              : "Full mesh via WireGuard kernel module. Nodes communicate exclusively via mTLS with 0 open public ports."}
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
