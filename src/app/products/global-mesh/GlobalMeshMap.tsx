"use client";

import React, { useState, useRef } from "react";
import {
  Cloud,
  Server,
  Network,
  Workflow,
  Zap,
  Database,
  Lock,
  Eye,
  ShieldCheck,
  Laptop,
  Monitor,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Radio,
  Layers,
  Terminal,
  GitBranch,
} from "lucide-react";
import {
  TOPOLOGY_LAYERS,
  CS_VS_BS_MATRIX,
  LIFECYCLE_STAGES,
  ZERO_TRUST_DEFENSE_ITEMS,
  FINOPS_TABLE_ROWS,
} from "./globalMeshArchitectureData";
interface ComputeTooltip {
  visible: boolean;
  name: string;
  popsCount: string;
  providers: string;
  field1Label: string;
  field1Value: string;
  field2Label: string;
  field2Value: string;
  rtt: string;
  req: string;
  x: number | string;
  y: number | string;
}

interface NodeComputeInfo {
  providers: string;
  cpu: string;
  gpu: string;
  rtt: string;
  popsCount: string;
  req: string;
}

interface NodeSaasInfo {
  providers: string;
  techStack: string;
  role: string;
  rtt: string;
  popsCount: string;
  req: string;
}

const COUNTRY_COMPUTE_MAP: Record<string, NodeComputeInfo> = {
  Australia: {
    providers: "Linode · Vultr · Contabo",
    cpu: "AMD EPYC 32C/64T (独占核心)",
    gpu: "NVIDIA RTX 6000 Ada (48GB)",
    rtt: "142ms",
    popsCount: "3 PoPs (悉尼)",
    req: "3.60k",
  },
  Japan: {
    providers: "Linode · Vultr · UCloud",
    cpu: "AMD EPYC 9004 3.7GHz",
    gpu: "NVIDIA H100 (80GB) · A100",
    rtt: "31ms",
    popsCount: "12 PoPs (东京/大阪)",
    req: "142.9k",
  },
  "United States": {
    providers: "Hetzner · Linode · Vultr · Contabo",
    cpu: "Intel Xeon 3.8GHz / AMD EPYC",
    gpu: "NVIDIA H100 · L40S · A100",
    rtt: "118ms",
    popsCount: "14 PoPs (硅谷/亚什本)",
    req: "59.91k",
  },
  Germany: {
    providers: "Hetzner · Linode · Contabo · Vultr",
    cpu: "Dedicated AMD EPYC / ARM64 Ampere",
    gpu: "裸金属高性能计算集群 (CPU 并发)",
    rtt: "125ms",
    popsCount: "8 PoPs (法兰克福/纽伦堡)",
    req: "8.24k",
  },
  Singapore: {
    providers: "五大 VPS 运营商共同枢纽",
    cpu: "AMD EPYC + Intel Xeon 旗舰",
    gpu: "NVIDIA A100 / RTX 6000",
    rtt: "40ms",
    popsCount: "5 PoPs (新加坡)",
    req: "4.76k",
  },
  "Hong Kong": {
    providers: "UCloud · Linode · Vultr",
    cpu: "高主频 Intel Xeon 3.8GHz",
    gpu: "亚太出海合规 GPU 推理",
    rtt: "22ms",
    popsCount: "3 PoPs (香港/台北)",
    req: "8.44k",
  },
  Netherlands: {
    providers: "Vultr · Contabo",
    cpu: "AMD EPYC 9004",
    gpu: "NVIDIA L40S · A100",
    rtt: "135ms",
    popsCount: "4 PoPs (阿姆斯特丹)",
    req: "13.43k",
  },
  "United Kingdom": {
    providers: "Linode · Vultr",
    cpu: "Dedicated AMD EPYC",
    gpu: "NVIDIA RTX 6000 Ada",
    rtt: "130ms",
    popsCount: "3 PoPs (伦敦)",
    req: "4.12k",
  },
  Finland: {
    providers: "Hetzner",
    cpu: "ARM CAX11 / Dedicated EPYC",
    gpu: "低温绿色冷备计算集群",
    rtt: "145ms",
    popsCount: "2 PoPs (赫尔辛基)",
    req: "2.51k",
  },
  Chile: {
    providers: "Vultr",
    cpu: "High Frequency NVMe",
    gpu: "边缘推理实例",
    rtt: "210ms",
    popsCount: "1 PoP (圣地亚哥)",
    req: "1.84k",
  },
  "South Africa": {
    providers: "Vultr",
    cpu: "High Frequency NVMe",
    gpu: "边缘推理实例",
    rtt: "240ms",
    popsCount: "1 PoP (约翰内斯堡)",
    req: "1.90k",
  },
};

const COUNTRY_SAAS_MAP: Record<string, NodeSaasInfo> = {
  "United States": {
    providers: "Cloudflare · GCP Cloud Run · GitHub",
    techStack: "Cloud Run (us-central1) · R2 存储 · Anycast DNS",
    role: "全球 Serverless 弹性 BFF & 零出口费存储中枢",
    rtt: "< 15ms (Edge) / 118ms",
    popsCount: "50+ Edge PoPs",
    req: "128.4k",
  },
  Germany: {
    providers: "observability.svc.plus · Supabase 自建 · ClickHouse",
    techStack: "Victoria 全家桶 · ClickHouse OLAP · PG 16 + pgvector",
    role: "全栈遥测 APM 监控中心 & 自建高性能数据湖",
    rtt: "35ms (泛欧) / 125ms",
    popsCount: "欧洲双活枢纽",
    req: "42.1k",
  },
  Japan: {
    providers: "Cloudflare Edge · Cloud Run (Tokyo) · Gitea Mirror",
    techStack: "Cloud Run (asia-northeast1) · 边缘路由 · act_runner",
    role: "亚太低延时接入网关 & 本地 CI 离线容灾节点",
    rtt: "< 12ms (Edge) / 31ms",
    popsCount: "东亚双活中心",
    req: "98.5k",
  },
  Singapore: {
    providers: "Cloudflare Edge · Supabase Global Edge · R2 APAC",
    techStack: "Cloudflare Workers · R2 APAC 存储池 · GoTrue 边缘验签",
    role: "东南亚跨国流量汇聚 & 零出网费用存储中继",
    rtt: "< 18ms (Edge) / 40ms",
    popsCount: "亚太存储总线",
    req: "56.2k",
  },
  "Hong Kong": {
    providers: "Cloudflare Edge · 亚太专线跳板",
    techStack: "Edge Workers · DNSSEC · CN2 回国专线接入",
    role: "大中华出海边缘缓存与 DNS 智能解析",
    rtt: "< 10ms (Edge) / 22ms",
    popsCount: "大中华极速 PoP",
    req: "34.8k",
  },
  Australia: {
    providers: "Cloudflare Edge · Vultr/Linode 算力节点",
    techStack: "Edge Caching · WireGuard Peer · R2 异地副本",
    role: "大洋洲边缘网关与远程数据镜像",
    rtt: "< 15ms (Edge) / 142ms",
    popsCount: "大洋洲枢纽",
    req: "18.3k",
  },
  Netherlands: {
    providers: "Cloudflare Edge · European Peering IX",
    techStack: "Cloudflare Workers · 遥测冷备同步",
    role: "西欧直连交换中心 · AMS-IX 流量分发",
    rtt: "< 14ms (Edge) / 135ms",
    popsCount: "西欧核心 PoP",
    req: "28.6k",
  },
  "United Kingdom": {
    providers: "Cloudflare Edge · Cloud Run (London)",
    techStack: "Cloud Run europe-west2 · Edge Workers",
    role: "欧洲第二应用计算与身份令牌边缘验签",
    rtt: "< 12ms (Edge) / 130ms",
    popsCount: "伦敦核心 PoP",
    req: "22.4k",
  },
  Finland: {
    providers: "Supabase PG 冷备 · ClickHouse 归档存储",
    techStack: "ClickHouse S3 Table · PG 冷备镜像",
    role: "绿能低电价数据湖与审计日志归档",
    rtt: "145ms",
    popsCount: "北欧冷备集群",
    req: "12.0k",
  },
};

const DEFAULT_VPS_TOOLTIP: ComputeTooltip = {
  visible: true,
  name: "Australia (悉尼)",
  popsCount: "3 PoPs",
  providers: "Linode · Vultr · Contabo",
  field1Label: "CPU 算力",
  field1Value: "AMD EPYC 32C/64T (独占核心)",
  field2Label: "GPU 加速",
  field2Value: "NVIDIA RTX 6000 Ada (48GB)",
  rtt: "142ms",
  req: "3.60k",
  x: "76%",
  y: "44%",
};

const DEFAULT_SAAS_TOOLTIP: ComputeTooltip = {
  visible: true,
  name: "United States (us-central1)",
  popsCount: "50+ Edge PoPs",
  providers: "Cloudflare · GCP Cloud Run · GitHub",
  field1Label: "核心架构",
  field1Value: "Cloud Run (us-central1) · R2 存储 · Anycast DNS",
  field2Label: "SaaS 角色",
  field2Value: "全球 Serverless 弹性 BFF & 零出口费存储中枢",
  rtt: "< 15ms (Edge)",
  req: "128.4k",
  x: "24%",
  y: "32%",
};

interface VpsProviderItem {
  id: string;
  name: string;
  subName: string;
  tag: string;
  sharePct: string;
  color: string;
  badgeBg: string;
  cpu: string;
  cpuShort: string;
  gpu: string;
  gpuShort: string;
  role: string;
  regions: string;
  targetCountry: string;
}

interface SaasProviderItem {
  id: string;
  name: string;
  subName: string;
  tag: string;
  sharePct: string;
  color: string;
  badgeBg: string;
  techStack: string;
  techStackShort: string;
  quota: string;
  quotaShort: string;
  role: string;
  regions: string;
  targetCountry: string;
}

const TOP_VPS_PROVIDERS: VpsProviderItem[] = [
  {
    id: "vultr",
    name: "Vultr",
    subName: "高频算力 & AI 全球集群",
    tag: "32+ PoPs",
    sharePct: "35%",
    color: "#3b82f6",
    badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    cpu: "AMD EPYC 9004 / High-Freq NVMe (3.8GHz+)",
    cpuShort: "EPYC 9004 (3.8GHz+)",
    gpu: "NVIDIA H100 (80GB SXM5) · A100 · L40S · A16",
    gpuShort: "H100 / A100 / L40S",
    role: "AI 异构推理加速",
    regions: "硅谷 · 东京 · 首尔 · 阿姆斯特丹",
    targetCountry: "United States",
  },
  {
    id: "linode",
    name: "Linode (Akamai)",
    subName: "骨干直连 & Dedicated 核心",
    tag: "14+ PoPs",
    sharePct: "28%",
    color: "#10b981",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    cpu: "Dedicated AMD EPYC (100% 独立计算核心)",
    cpuShort: "Dedicated 独享核心",
    gpu: "NVIDIA RTX 6000 Ada (48GB GDDR6 ECC)",
    gpuShort: "RTX 6000 Ada 48GB",
    role: "40Gbps+ 骨干 Relay 汇聚",
    regions: "东京 · 新加坡 · 悉尼 · 伦敦 · 纽瓦克",
    targetCountry: "Australia",
  },
  {
    id: "hetzner",
    name: "Hetzner Online",
    subName: "欧洲核心 & 裸金属大算力",
    tag: "6+ PoPs",
    sharePct: "18%",
    color: "#f43f5e",
    badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    cpu: "AMD EPYC Dedicated / ARM64 Ampere (80核)",
    cpuShort: "EPYC / ARM64 (80核)",
    gpu: "裸金属高性能计算集群 (CPU 并发)",
    gpuShort: "CPU 高吞吐裸金属",
    role: "Telemetry Hub 遥测中继",
    regions: "法尔肯施泰因 · 纽伦堡 · 赫尔辛基",
    targetCountry: "Germany",
  },
  {
    id: "contabo",
    name: "Contabo",
    subName: "海量存储 & 高密构建算力",
    tag: "8+ PoPs",
    sharePct: "11%",
    color: "#6366f1",
    badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    cpu: "高密度 vCPU (4~16 Cores, 8~64GB ECC NVMe)",
    cpuShort: "高密 4~16C ECC NVMe",
    gpu: "海量高并发数据清洗与构建实例",
    gpuShort: "海量存储与构建集群",
    role: "CI/CD Runner · 备份归档",
    regions: "慕尼黑 · 纽伦堡 · 圣路易斯 · 悉尼",
    targetCountry: "Australia",
  },
  {
    id: "ucloud",
    name: "UCloud (优刻得全球)",
    subName: "CN2 GIA & 亚太出海专线",
    tag: "6+ PoPs",
    sharePct: "8%",
    color: "#0ea5e9",
    badgeBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    cpu: "弹性计算旗舰型云主机, 高主频 Intel Xeon",
    cpuShort: "高主频 Intel Xeon",
    gpu: "亚太出海合规 GPU 推理实例",
    gpuShort: "亚太合规 GPU 推理",
    role: "亚太极速堡垒机 (<30ms)",
    regions: "香港 · 台北 · 东京 · 新加坡 · 曼谷",
    targetCountry: "Japan",
  },
];

const TOP_SAAS_PROVIDERS: SaasProviderItem[] = [
  {
    id: "cloudflare",
    name: "Cloudflare",
    subName: "全球 Anycast 边缘与零出网存储",
    tag: "300+ PoPs",
    sharePct: "32%",
    color: "#f97316",
    badgeBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    techStack: "Anycast DNS · Pages · Workers Router · R2 Storage",
    techStackShort: "DNS · Workers · R2",
    quota: "R2 0元出网 · 10万次/天免费 Worker · 免费 DNSSEC",
    quotaShort: "R2 0元出网 · 免费DNS",
    role: "边缘极速接入 & 跨云数据总线",
    regions: "全球 300+ 边缘数据中心 (<15ms)",
    targetCountry: "United States",
  },
  {
    id: "cloudrun",
    name: "GCP Cloud Run",
    subName: "Scale-to-Zero 弹性无服务器微服务",
    tag: "全球 36+ 区域",
    sharePct: "25%",
    color: "#3b82f6",
    badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    techStack: "Knative 弹性容器 · Andromeda 骨干 · Go/Node BFF",
    techStackShort: "Knative 容器 · Go/Node",
    quota: "每月 200万次请求 · 36万 vCPU秒 · 18万 GiB秒内存免费",
    quotaShort: "200万免费请求 · 缩容至0",
    role: "弹性业务 BFF · Webhook 异步处理",
    regions: "爱荷华 (us-central1) · 东京 · 法兰克福",
    targetCountry: "United States",
  },
  {
    id: "supabase",
    name: "Supabase (双轨)",
    subName: "云端身份认证 + 自建 PG/Vector",
    tag: "双轨融合",
    sharePct: "20%",
    color: "#10b981",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    techStack: "GoTrue Auth · PostgreSQL 16 · pgvector · RLS 隔离",
    techStackShort: "GoTrue · PG · pgvector",
    quota: "云端 50k MAU 免费 · 自建节点存储与向量无上限",
    quotaShort: "50k MAU · 向量无上限",
    role: "全局统一鉴权 + 核心关系与 AI 向量数据",
    regions: "全局身份网关 + 德/芬 VPS 本地集群",
    targetCountry: "Germany",
  },
  {
    id: "observability",
    name: "Observability",
    subName: "observability.svc.plus 全栈遥测",
    tag: "全链路追踪",
    sharePct: "13%",
    color: "#a855f7",
    badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    techStack: "VictoriaMetrics · VictoriaLogs · VictoriaTraces · ClickHouse",
    techStackShort: "Victoria全家桶 · ClickHouse",
    quota: "7x 内存压缩 · OTLP 原生协议 · ClickHouse 挂载 R2 冷备",
    quotaShort: "OTLP 原生 · ClickHouse",
    role: "APM 性能链路追踪 · 流日志毫秒级检索",
    regions: "法兰克福 · 纽伦堡 · 外部看门狗",
    targetCountry: "Germany",
  },
  {
    id: "gitops",
    name: "GitHub + Gitea",
    subName: "云端 GitOps 权威 + 私网构建容灾",
    tag: "双轨 GitOps",
    sharePct: "10%",
    color: "#64748b",
    badgeBg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    techStack: "GitHub Actions OIDC · Gitea Mirror · act_runner 离线构建",
    techStackShort: "Actions OIDC · Gitea Runner",
    quota: "突破 GitHub Actions 分钟数限制 · 内网极速镜像拉取",
    quotaShort: "无限制 CI · 离线容灾",
    role: "声明式基础设施流水线 · 自动化发布",
    regions: "全球 GitHub CDN + VPS 内部私有 Runner",
    targetCountry: "Japan",
  },
];

export default function GlobalMeshMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  type ArchitectureTab = "vps" | "saas" | "app-topology" | "lifecycle";
  const [activeLayer, setActiveLayer] = useState<ArchitectureTab>("vps");
  const [topologyFilter, setTopologyFilter] = useState<"all" | "cs" | "bs">("all");
  const [activeLifecycleStage, setActiveLifecycleStage] = useState<"code" | "plan" | "build" | "deploy" | "security" | "run" | "observability">("code");
  const [tooltip, setTooltip] = useState<ComputeTooltip>(DEFAULT_VPS_TOOLTIP);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (target && target.classList.contains("map-country")) {
      const name = target.getAttribute("data-name");
      const req = target.getAttribute("data-req") || "0.1k";
      const pops = target.getAttribute("data-pops") || "无节点";
      if (name && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - containerRect.left;
        const y = e.clientY - containerRect.top;

        if (activeLayer === "vps") {
          const matched = COUNTRY_COMPUTE_MAP[name];
          setTooltip({
            visible: true,
            name,
            popsCount: matched?.popsCount || pops.split(" (")[0] || "1 PoP",
            providers: matched?.providers || (pops.includes("(") ? pops.split(" (")[1].replace(")", "") : "多云互联"),
            field1Label: "CPU 算力",
            field1Value: matched?.cpu || "弹性计算 vCPU 实例",
            field2Label: "GPU 加速",
            field2Value: matched?.gpu || "CPU 密集型 / 动态算力调度",
            rtt: matched?.rtt || "< 160ms",
            req: matched?.req || req,
            x: Math.max(90, Math.min(x, containerRect.width - 130)),
            y: Math.max(60, y - 45),
          });
        } else {
          const matched = COUNTRY_SAAS_MAP[name];
          setTooltip({
            visible: true,
            name,
            popsCount: matched?.popsCount || (name === "United States" || name === "Germany" || name === "Japan" || name === "Singapore" ? "SaaS 核心中继" : "边缘缓存点"),
            providers: matched?.providers || "Cloudflare Anycast 边缘路由节点",
            field1Label: "架构服务",
            field1Value: matched?.techStack || "Anycast Edge · DNS 解析 · DDoS 防护",
            field2Label: "SaaS 角色",
            field2Value: matched?.role || "边缘就近分发与流量代理",
            rtt: matched?.rtt || "< 25ms (Edge)",
            req: matched?.req || req,
            x: Math.max(90, Math.min(x, containerRect.width - 130)),
            y: Math.max(60, y - 45),
          });
        }
      }
    }
  };

  const handleMouseLeave = () => {
    setActiveProvider(null);
    setTooltip(activeLayer === "vps" ? DEFAULT_VPS_TOOLTIP : DEFAULT_SAAS_TOOLTIP);
  };

  const handleProviderHover = (vps: VpsProviderItem) => {
    setActiveProvider(vps.id);
    const target = COUNTRY_COMPUTE_MAP[vps.targetCountry];
    setTooltip({
      visible: true,
      name: `${vps.name} · ${vps.targetCountry}`,
      popsCount: vps.tag,
      providers: `${vps.name} (${vps.subName})`,
      field1Label: "CPU 规格",
      field1Value: vps.cpu,
      field2Label: "GPU 算力",
      field2Value: vps.gpu,
      rtt: target?.rtt || "< 80ms",
      req: target?.req || "核心节点",
      x: vps.id === "linode" || vps.id === "contabo" ? "76%" : vps.id === "vultr" ? "24%" : vps.id === "hetzner" ? "52%" : "82%",
      y: vps.id === "linode" || vps.id === "contabo" ? "44%" : vps.id === "vultr" ? "32%" : vps.id === "hetzner" ? "25%" : "34%",
    });
  };

  const handleSaasHover = (saas: SaasProviderItem) => {
    setActiveProvider(saas.id);
    const target = COUNTRY_SAAS_MAP[saas.targetCountry];
    setTooltip({
      visible: true,
      name: `${saas.name} · ${saas.targetCountry}`,
      popsCount: saas.tag,
      providers: `${saas.name} (${saas.subName})`,
      field1Label: "技术体系",
      field1Value: saas.techStack,
      field2Label: "配额与价值",
      field2Value: saas.quota,
      rtt: target?.rtt || "< 20ms",
      req: target?.req || "SaaS 核心",
      x: saas.id === "cloudflare" || saas.id === "cloudrun" ? "24%" : saas.id === "observability" || saas.id === "supabase" ? "52%" : "82%",
      y: saas.id === "cloudflare" || saas.id === "cloudrun" ? "32%" : saas.id === "observability" || saas.id === "supabase" ? "25%" : "34%",
    });
  };

  const switchLayer = (layer: ArchitectureTab) => {
    setActiveLayer(layer);
    setActiveProvider(null);
    if (layer === "vps") setTooltip(DEFAULT_VPS_TOOLTIP);
    else if (layer === "saas") setTooltip(DEFAULT_SAAS_TOOLTIP);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>
              {activeLayer === "vps" && "VPS 算力 PoP 点分布 / CPU & GPU 与五大 VPS 映射关系"}
              {activeLayer === "saas" && "SaaS 零信任服务网格 / 现代云中立基础设施架构映射"}
              {activeLayer === "app-topology" && "应用架构拓扑网络 / 五层流动模型 (端 - 边 - 控 - 算 - 数)"}
              {activeLayer === "lifecycle" && "工程视角的生命周期 / 7 维 IT 演进流水线 (CODE 到 OBSERVABILITY)"}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeLayer === "vps" && "异构算力规格 · 177 国拓扑分布 · 48+ 核心 PoPs 节点互联"}
            {activeLayer === "saas" && "Serverless 弹性计算 · 0元出网存储 · 双轨数据 · 全栈无死角遥测"}
            {activeLayer === "app-topology" && "全景矢量流动 · C/S 原生生态与 B/S 现代浏览器深度协同 · 零信任端到端贯通"}
            {activeLayer === "lifecycle" && "CODE 到 OBSERVABILITY 全生命周期闭环 · GitOps 与 Serverless 双轨对齐 · 成本节约 90%+"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* 4 Tabs Navigation Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => switchLayer("vps")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeLayer === "vps"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>⚡️ VPS 算力 PoP</span>
            </button>
            <button
              type="button"
              onClick={() => switchLayer("saas")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeLayer === "saas"
                  ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>🌐 SaaS 零信任网格</span>
            </button>
            <button
              type="button"
              onClick={() => switchLayer("app-topology")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeLayer === "app-topology"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>🔀 应用架构拓扑</span>
            </button>
            <button
              type="button"
              onClick={() => switchLayer("lifecycle")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeLayer === "lifecycle"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>🔄 工程生命周期</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. VPS / SaaS View Wrapper */}
      {(activeLayer === "vps" || activeLayer === "saas") && (
        <div className="space-y-4">

          {/* If SaaS View, render Zero-Trust Defense Baseline & FinOps Table */}
          {activeLayer === "saas" && (
            <div className="space-y-4 pt-2">
              {/* 零信任安全防御基线 */}
              <div className="bg-slate-50/60 dark:bg-slate-950/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      SaaS 零信任四大防御基线
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    4-Dimensional Zero-Trust Defense
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {ZERO_TRUST_DEFENSE_ITEMS.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                          {item.metric}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* FinOps 多云混合成本对账表 */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    FinOps 多云混合对账表：AWS/GCP 纯巨头模式 vs Global Mesh 混合方案
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                    节约 90%+ 成本
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/60 dark:bg-slate-800/30 text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2 px-3 font-semibold">基础设施层级与能力</th>
                        <th className="py-2 px-3 font-semibold">AWS / GCP 传统公有云单月</th>
                        <th className="py-2 px-3 font-semibold">Global Mesh 混合方案单月</th>
                        <th className="py-2 px-3 font-semibold">成本节约与架构弹性</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-slate-600 dark:text-slate-400 font-sans">
                      {FINOPS_TABLE_ROWS.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                        >
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {row.dimension}
                          </td>
                          <td className="py-2 px-3 font-mono text-rose-500/90">
                            {row.legacy}
                          </td>
                          <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                            {row.mesh}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                            {row.advantage}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/80 dark:bg-slate-800/40 font-semibold">
                        <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">
                          单月综合预算评估
                        </td>
                        <td className="py-2.5 px-3 font-mono text-rose-500">
                          350 ~ 800+ USD /月
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          20 ~ 35 USD /月 全包
                        </td>
                        <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                          节约 90%+ 成本且多云双活无锁定
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. App Topology View */}
      {activeLayer === "app-topology" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mr-1">
                流量链路筛选:
              </span>
              <button
                type="button"
                onClick={() => setTopologyFilter("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  topologyFilter === "all"
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                全景流动视图 (All Flows)
              </button>
              <button
                type="button"
                onClick={() => setTopologyFilter("cs")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                  topologyFilter === "cs"
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Laptop className="h-3 w-3" />
                C/S 原生多端流 (Flutter · Tauri · Rust)
              </button>
              <button
                type="button"
                onClick={() => setTopologyFilter("bs")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                  topologyFilter === "bs"
                    ? "bg-cyan-600 text-white shadow-xs font-semibold"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Monitor className="h-3 w-3" />
                B/S 现代浏览器流 (Next.js · WASM)
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              端到端 5 层矢量拓扑 · 0 端口入站暴露
            </div>
          </div>

          {/* Inline SVG Topology Diagram */}
          <div className="relative bg-slate-950/80 dark:bg-slate-950 rounded-xl p-3 border border-slate-800 overflow-hidden shadow-inner">
            <svg viewBox="0 0 1000 500" className="w-full h-auto max-h-[500px] select-none block">
              <defs>
                <marker id="topoArrowBlue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#60a5fa" />
                </marker>
                <marker id="topoArrowEmerald" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#34d399" />
                </marker>
                <marker id="topoArrowOrange" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#fb923c" />
                </marker>
                <marker id="topoArrowPurple" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#c084fc" />
                </marker>
                <marker id="topoArrowCyan" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#22d3ee" />
                </marker>
              </defs>

              {/* Layer 1: Client Tier */}
              <g opacity={topologyFilter === "bs" ? 0.35 : 1} className="transition-opacity duration-300">
                <rect x="40" y="25" width="430" height="60" rx="10" fill="#1e293b" stroke="#3b82f6" strokeWidth={topologyFilter === "cs" ? 2.5 : 1.5} />
                <rect x="52" y="37" width="36" height="36" rx="6" fill="#1e3a8a" />
                <text x="70" y="60" fill="#93c5fd" fontSize="15" fontWeight="bold" textAnchor="middle">C</text>
                <text x="98" y="48" fill="#ffffff" fontSize="13" fontWeight="bold">C/S 原生多端生态 (Flutter · Tauri · Rust)</text>
                <text x="98" y="66" fill="#94a3b8" fontSize="10.5">macOS · Win · Linux · iOS · Android · 硬件私钥 Secure Enclave</text>
                <rect x="350" y="35" width="105" height="18" rx="4" fill="#3b82f6" fillOpacity="0.2" stroke="#3b82f6" strokeWidth="0.8" />
                <text x="402" y="48" fill="#60a5fa" fontSize="9" textAnchor="middle" fontWeight="bold">0 端口 WG 隧道直通</text>
              </g>

              <g opacity={topologyFilter === "cs" ? 0.35 : 1} className="transition-opacity duration-300">
                <rect x="530" y="25" width="430" height="60" rx="10" fill="#1e293b" stroke="#06b6d4" strokeWidth={topologyFilter === "bs" ? 2.5 : 1.5} />
                <rect x="542" y="37" width="36" height="36" rx="6" fill="#0e7490" />
                <text x="560" y="60" fill="#a5f3fc" fontSize="15" fontWeight="bold" textAnchor="middle">B</text>
                <text x="588" y="48" fill="#ffffff" fontSize="13" fontWeight="bold">B/S 现代浏览器 (Next.js React SPA/SSR / WASM)</text>
                <text x="588" y="66" fill="#94a3b8" fontSize="10.5">Chrome · Safari · Edge · HttpOnly Token + PKCE 动态挑战验签</text>
                <rect x="840" y="35" width="105" height="18" rx="4" fill="#06b6d4" fillOpacity="0.2" stroke="#06b6d4" strokeWidth="0.8" />
                <text x="892" y="48" fill="#22d3ee" fontSize="9" textAnchor="middle" fontWeight="bold">Anycast 边缘直连</text>
              </g>

              {/* Downward Lines Tier 1 -> Tier 2 */}
              <path d="M 255 85 L 255 120" stroke="#fb923c" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#topoArrowOrange)" opacity={topologyFilter === "bs" ? 0.3 : 0.9} />
              <path d="M 745 85 L 745 120" stroke="#fb923c" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#topoArrowOrange)" opacity={topologyFilter === "cs" ? 0.3 : 0.9} />

              {/* Fast Path WireGuard Tunnel C/S directly to Tier 4 */}
              <path d="M 100 85 C 100 180, 70 250, 100 320" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="5 3" markerEnd="url(#topoArrowPurple)" opacity={topologyFilter === "bs" ? 0.2 : 1} />
              <rect x="45" y="195" width="95" height="18" rx="4" fill="#8b5cf6" fillOpacity="0.25" stroke="#a855f7" strokeWidth="0.8" opacity={topologyFilter === "bs" ? 0.2 : 1} />
              <text x="92" y="208" fill="#d8b4fe" fontSize="9" textAnchor="middle" fontWeight="bold" opacity={topologyFilter === "bs" ? 0.2 : 1}>WireGuard 专网直通</text>

              {/* Layer 2: Edge Ingress Tier */}
              <g>
                <rect x="180" y="125" width="640" height="60" rx="10" fill="#1e293b" stroke="#f97316" strokeWidth="1.5" />
                <rect x="192" y="137" width="36" height="36" rx="6" fill="#c2410c" />
                <text x="210" y="160" fill="#fed7aa" fontSize="14" fontWeight="bold" textAnchor="middle">2</text>
                <text x="238" y="148" fill="#ffffff" fontSize="13" fontWeight="bold">第 2 层 · 边缘调度与分发 (Cloudflare 300+ Anycast PoPs)</text>
                <text x="238" y="166" fill="#94a3b8" fontSize="11">BGP Anycast DNS · 0元出网 R2 存储 · WAF / DDoS 弹性清洗 · Workers 边缘计算</text>
                <rect x="705" y="135" width="100" height="18" rx="4" fill="#f97316" fillOpacity="0.2" stroke="#f97316" strokeWidth="0.8" />
                <text x="755" y="148" fill="#fb923c" fontSize="9" textAnchor="middle" fontWeight="bold">0 延迟边缘护城河</text>
              </g>

              {/* Line Tier 2 -> Tier 3 */}
              <path d="M 500 185 L 500 220" stroke="#34d399" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#topoArrowEmerald)" />

              {/* Layer 3: Control Plane Tier */}
              <g>
                <rect x="180" y="225" width="640" height="60" rx="10" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
                <rect x="192" y="237" width="36" height="36" rx="6" fill="#065f46" />
                <text x="210" y="260" fill="#a7f3d0" fontSize="14" fontWeight="bold" textAnchor="middle">3</text>
                <text x="238" y="248" fill="#ffffff" fontSize="13" fontWeight="bold">第 3 层 · 弹性业务控制面 (GCP Cloud Run Serverless BFF)</text>
                <text x="238" y="266" fill="#94a3b8" fontSize="11">Scale-to-Zero 自动伸缩 · Supabase Auth 集中鉴权 · Scoped Token 动态签发</text>
                <rect x="705" y="235" width="100" height="18" rx="4" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="0.8" />
                <text x="755" y="248" fill="#34d399" fontSize="9" textAnchor="middle" fontWeight="bold">0 闲置费用调度</text>
              </g>

              {/* Line Tier 3 -> Tier 4 & Line Tier 3 -> Tier 5 */}
              <path d="M 400 285 L 400 320" stroke="#c084fc" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#topoArrowPurple)" />
              <path d="M 680 285 C 680 330, 720 375, 720 420" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#topoArrowCyan)" />

              {/* Layer 4: Compute Tier */}
              <g>
                <rect x="180" y="325" width="640" height="60" rx="10" fill="#1e293b" stroke="#8b5cf6" strokeWidth="1.5" />
                <rect x="192" y="337" width="36" height="36" rx="6" fill="#581c87" />
                <text x="210" y="360" fill="#e9d5ff" fontSize="14" fontWeight="bold" textAnchor="middle">4</text>
                <text x="238" y="348" fill="#ffffff" fontSize="13" fontWeight="bold">第 4 层 · 常驻算力与隧道网关 (5 大 VPS 48+ PoPs 裸金属算力)</text>
                <text x="238" y="366" fill="#94a3b8" fontSize="11">Linode · Hetzner · UCloud · Contabo · Vultr · WireGuard 0 端口入站暴露</text>
                <rect x="705" y="335" width="100" height="18" rx="4" fill="#8b5cf6" fillOpacity="0.2" stroke="#8b5cf6" strokeWidth="0.8" />
                <text x="755" y="348" fill="#c084fc" fontSize="9" textAnchor="middle" fontWeight="bold">0 端口私网互联</text>
              </g>

              {/* Line Tier 4 -> Tier 5 */}
              <path d="M 500 385 L 500 420" stroke="#22d3ee" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#topoArrowCyan)" />

              {/* Layer 5: Data Tier */}
              <g>
                <rect x="180" y="425" width="640" height="60" rx="10" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.5" />
                <rect x="192" y="437" width="36" height="36" rx="6" fill="#155e75" />
                <text x="210" y="460" fill="#cffafe" fontSize="14" fontWeight="bold" textAnchor="middle">5</text>
                <text x="238" y="448" fill="#ffffff" fontSize="13" fontWeight="bold">第 5 层 · 双轨数据与全栈遥测 (Supabase PG · ClickHouse · VictoriaMetrics)</text>
                <text x="238" y="466" fill="#94a3b8" fontSize="11">PG 行级安全隔离 (RLS) · 遥测时序聚合 · R2 静态归档 · 0 带宽与存储溢价</text>
                <rect x="705" y="435" width="100" height="18" rx="4" fill="#06b6d4" fillOpacity="0.2" stroke="#06b6d4" strokeWidth="0.8" />
                <text x="755" y="448" fill="#22d3ee" fontSize="9" textAnchor="middle" fontWeight="bold">行级隔离 + 0 溢价</text>
              </g>
            </svg>
          </div>

          {/* 5 Layer Detailed Cards */}
          <div className="space-y-3">
            {TOPOLOGY_LAYERS.map((layer, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border bg-gradient-to-r ${layer.color} transition-all space-y-3`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60 gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${layer.badgeColor}`}>
                      {layer.level}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {layer.name}
                    </h4>
                    <span className="text-xs text-slate-500 font-mono">
                      ({layer.enName})
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 italic">
                    {layer.tagline}
                  </span>
                </div>

                {layer.csDetails && layer.bsDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      className={`p-3 rounded-lg border transition-all ${
                        topologyFilter === "cs"
                          ? "bg-blue-50/90 dark:bg-blue-950/60 border-blue-500/80 shadow-xs"
                          : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          <Laptop className="h-3.5 w-3.5" />
                          {layer.csDetails.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {layer.csDetails.env}
                        </span>
                      </div>
                      <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 mb-2">
                        {layer.csDetails.features.map((f, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-1.5">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <strong>数据流向:</strong> {layer.csDetails.flow}
                      </div>
                      <div className="mt-1.5 p-1.5 rounded bg-blue-50/50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/50 text-[10.5px] text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
                        <Lock className="h-3 w-3 shrink-0 mt-0.5" />
                        <span><strong>安全与权限:</strong> {layer.csDetails.auth}</span>
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-lg border transition-all ${
                        topologyFilter === "bs"
                          ? "bg-cyan-50/90 dark:bg-cyan-950/60 border-cyan-500/80 shadow-xs"
                          : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                          <Monitor className="h-3.5 w-3.5" />
                          {layer.bsDetails.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {layer.bsDetails.env}
                        </span>
                      </div>
                      <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 mb-2">
                        {layer.bsDetails.features.map((f, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-1.5">
                            <span className="text-cyan-500 mt-0.5">•</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <strong>数据流向:</strong> {layer.bsDetails.flow}
                      </div>
                      <div className="mt-1.5 p-1.5 rounded bg-cyan-50/50 dark:bg-cyan-950/40 border border-cyan-200/50 dark:border-cyan-900/50 text-[10.5px] text-cyan-700 dark:text-cyan-300 flex items-start gap-1.5">
                        <Lock className="h-3 w-3 shrink-0 mt-0.5" />
                        <span><strong>安全与权限:</strong> {layer.bsDetails.auth}</span>
                      </div>
                    </div>
                  </div>
                )}

                {layer.sharedDetails && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {layer.sharedDetails.components.map((comp, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-1"
                        >
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {comp.label}
                          </span>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            {comp.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                    {layer.sharedDetails.authControl && (
                      <div className="p-2 rounded bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        <span><strong>鉴权与访问控制机制:</strong> {layer.sharedDetails.authControl}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 6-Dimension Comparison Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
            <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Workflow className="h-3.5 w-3.5 text-blue-500" />
                C/S 原生多端 vs B/S 现代浏览器：6 维深度架构差异与协同全景
              </span>
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-bold">
                深度对比
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/60 dark:bg-slate-800/30 text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 px-3 font-semibold">架构对比维度</th>
                    <th className="py-2 px-3 font-semibold">C/S 原生多端生态</th>
                    <th className="py-2 px-3 font-semibold">B/S 现代浏览器生态</th>
                    <th className="py-2 px-3 font-semibold">Global Mesh 聚合协同优势</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-slate-600 dark:text-slate-400 font-sans">
                  {CS_VS_BS_MATRIX.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {item.dim}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {item.cs}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {item.bs}
                      </td>
                      <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400 font-medium">
                        {item.advantage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Lifecycle View */}
      {activeLayer === "lifecycle" && (
        <div className="space-y-4">
          {/* Inline SVG Pipeline Diagram */}
          <div className="relative bg-slate-950/80 dark:bg-slate-950 rounded-xl p-3 border border-slate-800 overflow-hidden shadow-inner">
            <svg viewBox="0 0 1000 130" className="w-full h-auto max-h-[140px] select-none block">
              <defs>
                <linearGradient id="pipeLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background pipeline track */}
              <line x1="70" y1="55" x2="930" y2="55" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
              <line x1="70" y1="55" x2="930" y2="55" stroke="url(#pipeLineGrad)" strokeWidth="3" strokeDasharray="6 4" strokeLinecap="round" />

              {/* 7 Stage Nodes */}
              {[
                { id: "code", no: 1, name: "CODE", sub: "Gitea / Vault", cx: 70 },
                { id: "plan", no: 2, name: "PLAN", sub: "Linear / Docs", cx: 213 },
                { id: "build", no: 3, name: "BUILD", sub: "Actions / Runner", cx: 356 },
                { id: "deploy", no: 4, name: "DEPLOY", sub: "GitOps / Run", cx: 500 },
                { id: "security", no: 5, name: "SECURITY", sub: "Vault / ZTNA", cx: 643 },
                { id: "run", no: 6, name: "RUN", sub: "5 VPS Mesh", cx: 786 },
                { id: "observability", no: 7, name: "OBSERVE", sub: "Victoria / CKH", cx: 930 },
              ].map((node) => {
                const isSelected = activeLifecycleStage === node.id;
                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-all duration-200"
                    onClick={() => setActiveLifecycleStage(node.id as any)}
                  >
                    {isSelected && (
                      <circle
                        cx={node.cx}
                        cy="55"
                        r="30"
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                        filter="url(#nodeGlow)"
                      />
                    )}
                    <circle
                      cx={node.cx}
                      cy="55"
                      r={isSelected ? "22" : "18"}
                      fill={isSelected ? "#2563eb" : "#1e293b"}
                      stroke={isSelected ? "#93c5fd" : "#475569"}
                      strokeWidth={isSelected ? "2.5" : "1.5"}
                    />
                    <text
                      x={node.cx}
                      y="60"
                      fill={isSelected ? "#ffffff" : "#94a3b8"}
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {node.no}
                    </text>
                    <text
                      x={node.cx}
                      y={isSelected ? "98" : "96"}
                      fill={isSelected ? "#60a5fa" : "#e2e8f0"}
                      fontSize="11"
                      fontWeight={isSelected ? "bold" : "600"}
                      textAnchor="middle"
                    >
                      {node.name}
                    </text>
                    <text
                      x={node.cx}
                      y={isSelected ? "112" : "110"}
                      fill="#64748b"
                      fontSize="9.5"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {node.sub}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 7-Stage Selector Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {LIFECYCLE_STAGES.map((stg) => {
              const isSelected = activeLifecycleStage === stg.id;
              return (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => setActiveLifecycleStage(stg.id)}
                  className={`p-2 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                    isSelected
                      ? "bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-500/80 shadow-xs ring-1 ring-indigo-500/40"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {stg.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-full">
                    {stg.enName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Stage Deep-Dive Card */}
          {(() => {
            const stage =
              LIFECYCLE_STAGES.find((s) => s.id === activeLifecycleStage) ||
              LIFECYCLE_STAGES[0];
            return (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {stage.name} · {stage.enName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {stage.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {stage.tagline}
                      </p>
                    </div>
                  </div>

                  {/* 3 Real-world Options */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {stage.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {opt.title}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded border ${
                                opt.typeTone === "blue"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                  : opt.typeTone === "emerald"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                              }`}
                            >
                              {opt.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {opt.description}
                          </p>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10.5px]">
                          <div className="text-slate-600 dark:text-slate-400 font-sans">
                            <strong className="text-slate-800 dark:text-slate-200">核心优势:</strong> {opt.pros}
                          </div>
                          <div className="text-emerald-600 dark:text-emerald-400 font-mono">
                            <strong className="text-slate-800 dark:text-slate-200">成本核算:</strong> {opt.cost}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mesh Value Banner */}
                  <div className="p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        {stage.meshValue.title}
                      </span>
                      <p className="text-[11px] text-indigo-900/80 dark:text-indigo-200/80">
                        {stage.meshValue.desc}
                      </p>
                    </div>
                    <div className="shrink-0 text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                      {stage.meshValue.recommendation}
                    </div>
                  </div>

                  {/* Metrics Pills */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    {stage.metrics.map((m, mIdx) => (
                      <div key={mIdx} className="text-center p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">{m.label}</span>
                        <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FinOps Table */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                  <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      FinOps 多云混合对账表：AWS/GCP 纯巨头模式 vs Global Mesh 混合方案
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                      节约 90%+ 成本
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/60 dark:bg-slate-800/30 text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                          <th className="py-2 px-3 font-semibold">基础设施层级与能力</th>
                          <th className="py-2 px-3 font-semibold">AWS / GCP 传统公有云单月</th>
                          <th className="py-2 px-3 font-semibold">Global Mesh 混合方案单月</th>
                          <th className="py-2 px-3 font-semibold">成本节约与架构弹性</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-slate-600 dark:text-slate-400 font-sans">
                        {FINOPS_TABLE_ROWS.map((row, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                          >
                            <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                              {row.dimension}
                            </td>
                            <td className="py-2 px-3 font-mono text-rose-500/90">
                              {row.legacy}
                            </td>
                            <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                              {row.mesh}
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                              {row.advantage}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50/80 dark:bg-slate-800/40 font-semibold">
                          <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">
                            单月综合预算评估
                          </td>
                          <td className="py-2.5 px-3 font-mono text-rose-500">
                            350 ~ 800+ USD /月
                          </td>
                          <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            20 ~ 35 USD /月 全包
                          </td>
                          <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                            节约 90%+ 成本且多云双活无锁定
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
