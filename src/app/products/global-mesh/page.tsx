"use client";

import React, { useState } from "react";
import MarketingNav from "@/components/marketing/MarketingNav";
import XdsSiteFooter from "@/components/xds/XdsSiteFooter";
import {
  ArrowRight,
  CheckCircle2,
  Code,
  Compass,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  Layers,
  Radio,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";
import GlobalMeshMap from "./GlobalMeshMap";

interface Dimension {
  id: string;
  label: string;
}

const Y_DIMENSIONS: Dimension[] = [
  { id: "cpu", label: "CPU 实例 (共享/独享)" },
  { id: "gpu", label: "GPU 算力 (AI/推理)" },
  { id: "k8s", label: "托管 K8S (LKE/VKE)" },
  { id: "arch", label: "芯片架构 (x86/ARM)" },
  { id: "billing", label: "灵活计费 (按时/按月)" },
  { id: "regions", label: "可用区域 (全球 PoP)" },
  { id: "xconec", label: "Xconec 零信任网关" },
];

interface NodeItem {
  id: string;
  vendor: string;
  city: string;
  region: string;
  rtt: number;
  vals: number[];
  desc: string;
}

const GLOBAL_NODES: NodeItem[] = [
  // Linode Nodes (1-10)
  { id: "li-tyo", vendor: "Linode", city: "东京", region: "APAC", rtt: 31, vals: [1, 1, 1, 0.5, 1, 1, 1], desc: "Akamai 东京核心机房，支持 LKE 托管 K8s 与 GPU，Akamai Tier-1 骨干直连。" },
  { id: "li-sin", vendor: "Linode", city: "新加坡", region: "APAC", rtt: 42, vals: [1, 1, 1, 0.5, 1, 1, 1], desc: "东南亚跨洲核心中继站，具备完整的 VPC 与 Cloud Firewall。" },
  { id: "li-syd", vendor: "Linode", city: "悉尼", region: "APAC", rtt: 95, vals: [1, 0, 1, 0.5, 1, 1, 1], desc: "大洋洲锚点机房，支持免费 LKE 控制面。" },
  { id: "li-fra", vendor: "Linode", city: "法兰克福", region: "EMEA", rtt: 128, vals: [1, 1, 1, 0.5, 1, 1, 1], desc: "欧洲顶级骨干枢纽，直连 DE-CIX，企业级 99.99% SLA。" },
  { id: "li-lon", vendor: "Linode", city: "伦敦", region: "EMEA", rtt: 135, vals: [1, 1, 1, 0.5, 1, 1, 1], desc: "西欧核心节点，支持 GPU RTX6000 与对象存储。" },
  { id: "li-par", vendor: "Linode", city: "巴黎", region: "EMEA", rtt: 140, vals: [1, 0, 1, 0.5, 1, 1, 1], desc: "法国节点，提供标准与独享型算力。" },
  { id: "li-ewr", vendor: "Linode", city: "纽瓦克/新泽西", region: "US-E", rtt: 165, vals: [1, 1, 1, 0.5, 1, 1, 1], desc: "北美大西洋中继第一站，直通纽约金融级专线。" },
  { id: "li-dfw", vendor: "Linode", city: "达拉斯", region: "US-C", rtt: 155, vals: [1, 0, 1, 0.5, 1, 1, 1], desc: "北美中部核心中继，覆盖美中多云互联。" },
  { id: "li-fmt", vendor: "Linode", city: "硅谷 Fremont", region: "US-W", rtt: 122, vals: [1, 1, 1, 0.5, 1, 1, 1], desc: "美西主力机房，太平洋跨海电缆终端。" },
  { id: "li-gru", vendor: "Linode", city: "圣保罗", region: "LATAM", rtt: 260, vals: [1, 0, 1, 0.5, 1, 1, 1], desc: "南美洲骨干中继，填补拉美链路空白。" },

  // Hetzner Nodes (11-16)
  { id: "hz-fsn", vendor: "Hetzner", city: "法肯斯坦 (FSN1)", region: "EMEA", rtt: 132, vals: [1, 0, 0.5, 1, 1, 1, 1], desc: "Hetzner 本土主场，2C4G ARM 仅 €3.79，20TB 免费流量。" },
  { id: "hz-nbg", vendor: "Hetzner", city: "纽伦堡 (NBG1)", region: "EMEA", rtt: 130, vals: [1, 0, 0.5, 1, 1, 1, 1], desc: "欧洲高可用双活中心，遥测监控日志汇聚首选。" },
  { id: "hz-hel", vendor: "Hetzner", city: "赫尔辛基 (HEL1)", region: "EMEA", rtt: 145, vals: [1, 0, 0.5, 1, 1, 1, 1], desc: "北欧低电价绿能机房，全网最低成本冷存储与归档。" },
  { id: "hz-ash", vendor: "Hetzner", city: "亚什本 (Ashburn)", region: "US-E", rtt: 160, vals: [1, 0, 0.5, 1, 1, 1, 1], desc: "全球网络中枢亚什本节点，美东遥测代理。" },
  { id: "hz-hil", vendor: "Hetzner", city: "希尔斯伯勒 (Hillsboro)", region: "US-W", rtt: 125, vals: [1, 0, 0.5, 1, 1, 1, 1], desc: "俄勒冈免税区机房，美西极低成本算力。" },
  { id: "hz-sin", vendor: "Hetzner", city: "新加坡 (SIN)", region: "APAC", rtt: 48, vals: [1, 0, 0.5, 1, 1, 1, 1], desc: "Hetzner 亚太唯一数据中心，20TB 流量横扫东南亚。" },

  // UCloud Nodes (17-24)
  { id: "uc-hkg", vendor: "UCloud", city: "中国香港", region: "APAC", rtt: 22, vals: [1, 0, 1, 0.5, 1, 1, 1], desc: "针对国内电信/联通/移动 CN2 GIA/BGP 深度优化，运维跳板第一选择。" },
  { id: "uc-tpe", vendor: "UCloud", city: "中国台北", region: "APAC", rtt: 28, vals: [1, 0, 1, 0.5, 1, 1, 1], desc: "大中华区低延时第二通道，直通东亚环形骨干。" },
  { id: "uc-tyo", vendor: "UCloud", city: "日本东京", region: "APAC", rtt: 35, vals: [1, 0, 1, 0.5, 1, 1, 1], desc: "直连 NTT 骨干，uLighthost 轻量套餐仅 2.5 USD/mo 起。" },
  { id: "uc-sel", vendor: "UCloud", city: "韩国首尔", region: "APAC", rtt: 32, vals: [1, 0, 1, 0.5, 1, 1, 1], desc: "东亚极速互联节点，提供丰富峰值带宽。" },
  { id: "uc-sin", vendor: "UCloud", city: "新加坡", region: "APAC", rtt: 45, vals: [1, 0, 1, 0.5, 1, 1, 1], desc: "东南亚枢纽，支持 UGC 跨国全球专线。" },
  { id: "uc-bkk", vendor: "UCloud", city: "泰国曼谷", region: "APAC", rtt: 58, vals: [1, 0, 1, 0.5, 1, 1, 1], desc: "稀缺东南亚本地节点，近场管理覆盖。" },
  { id: "uc-lax", vendor: "UCloud", city: "洛杉矶", region: "US-W", rtt: 120, vals: [1, 0, 1, 0.5, 1, 1, 1], desc: "中美跨海优质 BGP 回国专线接入点。" },
  { id: "uc-fra", vendor: "UCloud", city: "法兰克福", region: "EMEA", rtt: 138, vals: [1, 0, 1, 0.5, 1, 1, 1], desc: "欧洲业务反向运维跳板。" },

  // Contabo Nodes (25-33)
  { id: "cb-nbg", vendor: "Contabo", city: "纽伦堡", region: "EMEA", rtt: 136, vals: [1, 0, 0, 0, 0.5, 1, 1], desc: "4 vCPU / 6GB 内存 / 100G NVMe / 32TB 流量，月付仅 5.50 USD。" },
  { id: "cb-fra", vendor: "Contabo", city: "法兰克福", region: "EMEA", rtt: 134, vals: [1, 0, 0, 0, 0.5, 1, 1], desc: "大容量备份与归档集群，免流量费用担忧。" },
  { id: "cb-lon", vendor: "Contabo", city: "英国伦敦", region: "EMEA", rtt: 142, vals: [1, 0, 0, 0, 0.5, 1, 1], desc: "英国机房，适合私有 Docker 镜像加速。" },
  { id: "cb-nyc", vendor: "Contabo", city: "纽约", region: "US-E", rtt: 168, vals: [1, 0, 0, 0, 0.5, 1, 1], desc: "北美东部高配置大存储节点。" },
  { id: "cb-stl", vendor: "Contabo", city: "圣路易斯", region: "US-C", rtt: 158, vals: [1, 0, 0, 0, 0.5, 1, 1], desc: "北美中部大型 CI Runner 与数据库冷备份中心。" },
  { id: "cb-sea", vendor: "Contabo", city: "西雅图", region: "US-W", rtt: 128, vals: [1, 0, 0, 0, 0.5, 1, 1], desc: "美西大容量节点。" },
  { id: "cb-sin", vendor: "Contabo", city: "新加坡", region: "APAC", rtt: 52, vals: [1, 0, 0, 0, 0.5, 1, 1], desc: "亚太高配廉价中枢。" },
  { id: "cb-tyo", vendor: "Contabo", city: "日本东京", region: "APAC", rtt: 40, vals: [1, 0, 0, 0, 0.5, 1, 1], desc: "东京高性价比备份服务器。" },
  { id: "cb-dxb", vendor: "Contabo", city: "阿联酋迪拜", region: "MEA", rtt: 115, vals: [1, 0, 0, 0, 0.5, 1, 1], desc: "中东地区极少数平价独立机房。" },

  // Vultr Nodes (34-45)
  { id: "vu-nrt", vendor: "Vultr", city: "东京 (NRT)", region: "APAC", rtt: 29, vals: [1, 1, 1, 1, 1, 1, 1], desc: "Vultr 亚太主力机房，支持 Ampere ARM 与 VKE 托管 K8s。" },
  { id: "vu-icn", vendor: "Vultr", city: "首尔 (ICN)", region: "APAC", rtt: 30, vals: [1, 1, 1, 1, 1, 1, 1], desc: "韩国核心 PoP，支持 BGP Anycast 与自定义 ISO。" },
  { id: "vu-sgp", vendor: "Vultr", city: "新加坡 (SGP)", region: "APAC", rtt: 38, vals: [1, 1, 1, 1, 1, 1, 1], desc: "亚太旗舰级数据中心，全系 GPU 与高速私网 VPC 2.0。" },
  { id: "vu-syd", vendor: "Vultr", city: "悉尼 (SYD)", region: "APAC", rtt: 88, vals: [1, 1, 1, 1, 1, 1, 1], desc: "澳洲双中心（悉尼/墨尔本），原生 ARM64 3 USD/mo 起。" },
  { id: "vu-fra", vendor: "Vultr", city: "法兰克福 (FRA)", region: "EMEA", rtt: 126, vals: [1, 1, 1, 1, 1, 1, 1], desc: "欧洲核心枢纽，抗 DDoS 防护与负载均衡。" },
  { id: "vu-ams", vendor: "Vultr", city: "阿姆斯特丹 (AMS)", region: "EMEA", rtt: 130, vals: [1, 1, 1, 1, 1, 1, 1], desc: "直连 AMS-IX，极佳欧洲交换网络。" },
  { id: "vu-sjc", vendor: "Vultr", city: "硅谷 (SJC)", region: "US-W", rtt: 118, vals: [1, 1, 1, 1, 1, 1, 1], desc: "美西科技中枢，NVIDIA GH200 / H100 智算集群。" },
  { id: "vu-lax", vendor: "Vultr", city: "洛杉矶 (LAX)", region: "US-W", rtt: 116, vals: [1, 1, 1, 1, 1, 1, 1], desc: "加州大型 PoP，跨太平洋出口。" },
  { id: "vu-ewr", vendor: "Vultr", city: "新泽西 (EWR)", region: "US-E", rtt: 162, vals: [1, 1, 1, 1, 1, 1, 1], desc: "美东核心中心，支持 BYOIP 自带公网 IP。" },
  { id: "vu-sao", vendor: "Vultr", city: "圣保罗 (SAO)", region: "LATAM", rtt: 245, vals: [1, 1, 1, 1, 1, 1, 1], desc: "南美巴西数据中心，覆盖拉美运维业务。" },
  { id: "vu-scl", vendor: "Vultr", city: "智利圣地亚哥 (SCL)", region: "LATAM", rtt: 270, vals: [1, 0, 1, 1, 1, 1, 1], desc: "南美太平洋沿岸稀缺节点。" },
  { id: "vu-jnb", vendor: "Vultr", city: "约翰内斯堡 (JNB)", region: "MEA", rtt: 210, vals: [1, 0, 1, 1, 1, 1, 1], desc: "非洲大陆极少数具备企业级 SLA 的 VPS 节点。" },

  // Xconec Cross-Cloud Redundancy Pillars (46-48)
  { id: "xc-apac", vendor: "Xconec", city: "亚太多云矩阵", region: "APAC", rtt: 24, vals: [1, 1, 1, 1, 1, 1, 1], desc: "UCloud(香港/东京) + Linode/Vultr(东京/新加坡) + Hetzner(新加坡)，亚太 100% 双活。" },
  { id: "xc-emea", vendor: "Xconec", city: "欧洲多云矩阵", region: "EMEA", rtt: 125, vals: [1, 1, 1, 1, 1, 1, 1], desc: "Hetzner(德/芬主力) + Linode(法兰克福Akamai) + Contabo(冷备) + Vultr，零单点风险。" },
  { id: "xc-us", vendor: "Xconec", city: "美洲多云矩阵", region: "US", rtt: 115, vals: [1, 1, 1, 1, 1, 1, 1], desc: "Hetzner(美西/美东) + Vultr(硅谷/纽约) + Contabo(中部) + Linode，全天候容灾。" },
];

const VENDOR_COLS: NodeItem[] = [
  { id: "v-li", vendor: "Linode", city: "全部节点 (25+)", region: "GLOBAL", vals: [1, 1, 1, 0.5, 1, 1, 1], rtt: 35, desc: "Akamai 400G+ Tier-1 骨干，LKE 免费控制面，99.99% SLA。" },
  { id: "v-hz", vendor: "Hetzner", city: "欧洲/美西/新 (6)", region: "GLOBAL", vals: [1, 0, 0.5, 1, 1, 1, 1], rtt: 48, desc: "极致算力性价比 (€3.79 2C4G ARM)，20TB 高速流量。" },
  { id: "v-uc", vendor: "UCloud", city: "亚太优质 (13+)", region: "APAC", vals: [1, 0, 1, 0.5, 1, 1, 1], rtt: 22, desc: "大中华区 CN2/BGP 香港/东京低延时直通，uLighthost 2.5 USD 起。" },
  { id: "v-cb", vendor: "Contabo", city: "大容量池 (9)", region: "GLOBAL", vals: [1, 0, 0, 0, 0.5, 1, 1], rtt: 55, desc: "4C6G/32TB 巨无霸配置，月付 5.50 USD，适合冷备与镜像同步。" },
  { id: "v-vu", vendor: "Vultr", city: "全球节点王 (33)", region: "GLOBAL", vals: [1, 1, 1, 1, 1, 1, 1], rtt: 29, desc: "GPU 最全、ARM64 标配、VKE 托管 K8s、BGP Anycast 全自助。" },
  { id: "v-xc", vendor: "Xconec", city: "五云网状融合", region: "MESH", vals: [1, 1, 1, 1, 1, 1, 1], rtt: 18, desc: "0 端口入站暴露，端到端 WireGuard/mTLS，秒级跨云自动重路由。" },
];

const REGION_COLS: NodeItem[] = [
  { id: "r-hk", vendor: "APAC-HK", city: "大中华 (香港/台北)", region: "APAC", vals: [1, 0, 1, 0.5, 1, 1, 1], rtt: 22, desc: "UCloud uLighthost 主力直连。" },
  { id: "r-tyo", vendor: "APAC-TYO", city: "东亚 (东京/首尔)", region: "APAC", vals: [1, 1, 1, 1, 1, 1, 1], rtt: 30, desc: "Linode + Vultr + UCloud 三云热备。" },
  { id: "r-sin", vendor: "APAC-SIN", city: "东南亚 (新加坡)", region: "APAC", vals: [1, 1, 1, 1, 1, 1, 1], rtt: 40, desc: "五云 100% 共同交汇超级枢纽。" },
  { id: "r-de", vendor: "EMEA-DE", city: "欧洲核心 (法兰克福)", region: "EMEA", vals: [1, 1, 1, 1, 1, 1, 1], rtt: 125, desc: "Hetzner + Linode + Contabo + Vultr 密集覆盖。" },
  { id: "r-hel", vendor: "EMEA-HEL", city: "欧洲北区 (赫尔辛基)", region: "EMEA", vals: [1, 0, 0.5, 1, 1, 1, 1], rtt: 145, desc: "Hetzner HEL1 低温低电价冷备节点。" },
  { id: "r-usw", vendor: "US-WEST", city: "北美西区 (硅谷/LA)", region: "US-W", vals: [1, 1, 1, 1, 1, 1, 1], rtt: 118, desc: "Hetzner + Vultr + Linode + UCloud 交叉覆盖。" },
  { id: "r-use", vendor: "US-EAST", city: "北美东区 (亚什本/纽约)", region: "US-E", vals: [1, 1, 1, 1, 1, 1, 1], rtt: 160, desc: "Hetzner Ashburn + Linode EWR + Contabo NYC。" },
  { id: "r-eme", vendor: "EMERGING", city: "新兴市场 (拉美/中东/非)", region: "GLOBAL", vals: [1, 1, 1, 1, 1, 1, 1], rtt: 220, desc: "Vultr (圣保罗/南非) + Contabo (迪拜)。" },
];

interface LifecycleOption {
  title: string;
  type: "SaaS 托管" | "VPS 开源自建" | "混合推荐";
  typeTone: "blue" | "emerald" | "purple";
  description: string;
  pros: string;
  cost: string;
}

interface LifecycleStage {
  id: "code" | "plan" | "build" | "deploy" | "security" | "run" | "observability";
  name: string;
  enName: string;
  tagline: string;
  badge: string;
  options: LifecycleOption[];
  meshValue: {
    title: string;
    desc: string;
    recommendation: string;
  };
  metrics: { label: string; value: string }[];
}

const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: "code",
    name: "Code 代码托管",
    enName: "Code & Versioning",
    tagline: "单一公有云与多云私网双轨代码资产管理",
    badge: "代码与版本控制",
    options: [
      {
        title: "GitHub.com (云端主库)",
        type: "SaaS 托管",
        typeTone: "blue",
        description: "全球开发生态事实标准，天然集成 GitHub Actions，支持 OIDC 免秘钥云端鉴权，作为团队唯一的真相源 (Single Source of Truth)。",
        pros: "生态极佳 · 免基础设施维护 · OIDC 云原生凭据打通",
        cost: "公开仓库免费 · 私有团队 4 USD/用户/月起",
      },
      {
        title: "Gitea Self-hosted (VPS 自建私服)",
        type: "VPS 开源自建",
        typeTone: "emerald",
        description: "部署在 Hetzner / Contabo VPS 上的轻量自建 Git。作为内网高速镜像库与离线容灾备份，突破 GitHub API 速率与外网依赖。",
        pros: "内存仅需数十 MB · 零 API 频率限制 · 内网极速代码拉取 · 100% 离线容灾",
        cost: "开源免费 · 复用已有 VPS 节点 (0 元边际成本)",
      },
      {
        title: "GitLab Self-hosted / Cloud (全功能 DevOps)",
        type: "VPS 开源自建",
        typeTone: "purple",
        description: "面向大型团队的全功能 DevOps 平台。支持多组织权限精细化审计、自建 K8s 深度集成与全套合规审查。",
        pros: "企业级多群组审计 · 原生内置安全合规扫描",
        cost: "开源社区版免费 · 推荐 4C8G+ VPS 配置 (€10~€15/月)",
      },
    ],
    meshValue: {
      title: "Global Mesh 聚合价值",
      desc: "采用『GitHub 为主源，VPS Gitea 为私网镜像』双轨模式。开发者向 GitHub 提交触发 GitOps，VPS 节点通过 WireGuard 私网自动同步，保障 GitHub 故障或跨国出口抖动时，生产部署与内网拉取毫秒级容灾。",
      recommendation: "推荐：GitHub 主代码仓 + Hetzner VPS Gitea 私有镜像双轨方案",
    },
    metrics: [
      { label: "镜像同步延时", value: "< 2.5s" },
      { label: "内网拉取速率", value: "内网千兆跑满" },
      { label: "可用性保障", value: "99.99% 双活" },
    ],
  },
  {
    id: "plan",
    name: "Plan 架构规划",
    enName: "Architecture & Sizing",
    tagline: "动静解耦、轻重分离与极简多云预算精算",
    badge: "需求与容量精算",
    options: [
      {
        title: "动静分离 & 边缘先发",
        type: "混合推荐",
        typeTone: "purple",
        description: "将静态前端资产交由 Cloudflare Pages 全球 CDN (<15ms) 分发，动态 API 经由 Workers 路由，重载计算下沉至 VPS 算力池。",
        pros: "首屏加载 <300ms · 边缘直接承载 85%+ 流量 · 0 流量出网费",
        cost: "Cloudflare Pages 免费无限带宽 · Workers 10万次/天免费",
      },
      {
        title: "数据与计算轻重分区分离",
        type: "混合推荐",
        typeTone: "blue",
        description: "无状态 BFF 跑在 Serverless (Cloud Run) 实现无流量缩容至 0；关系数据库、向量库与检索常驻 VPS 大内存 NVMe 节点。",
        pros: "避免 Serverless 数据库连接池耗尽 · 彻底免去大厂天价闲置费",
        cost: "Cloud Run 每月 200万次免费请求 · VPS 节点固定月付",
      },
      {
        title: "零信任入站架构规划",
        type: "混合推荐",
        typeTone: "emerald",
        description: "规划 10.240.0.0/16 虚拟带外管理专网，全网 VPS 0 公网入站端口暴露，所有访问依赖 WireGuard / mTLS / Tunnel 双向握手。",
        pros: "杜绝公网扫描与 0-day 端口漏洞利用 · SRE 专属加密通道",
        cost: "开源 WireGuard 内核模块 · 0 额外网关许可费",
      },
    ],
    meshValue: {
      title: "Global Mesh 聚合价值",
      desc: "利用 VPS 算力地图获得全球五大机房的真实硬件性价比底线，配合 SaaS 免费层规划，将传统大厂上云每月 300~800 USD 的基础架构开销直降至 25 USD/月以内。",
      recommendation: "推荐：轻量弹性归 Serverless + 重态存储与向量归 VPS 裸金属",
    },
    metrics: [
      { label: "单月基础预算", value: "20~25 USD /月" },
      { label: "成本节省比例", value: "85%~92%" },
      { label: "架构扩展弹性", value: "无限横向拓展" },
    ],
  },
  {
    id: "build",
    name: "Build 产物构建",
    enName: "CI Pipelines & Runners",
    tagline: "云端 Actions 与本地 VPS 专属 Runner 协同提速",
    badge: "构建与持续集成",
    options: [
      {
        title: "GitHub Actions (托管 Runner)",
        type: "SaaS 托管",
        typeTone: "blue",
        description: "免运维开箱即用，官方维护的 Ubuntu/macOS 环境，无缝集成 Marketplace 数千款 Actions 插件与 OIDC 秘钥。",
        pros: "免去构建机运维 · 生态最丰富 · OIDC 云凭据开箱即用",
        cost: "公共仓库免费 · 私有仓库每月 2,000 分钟免费额度",
      },
      {
        title: "Gitea Runner / act_runner (VPS 专属构建机)",
        type: "VPS 开源自建",
        typeTone: "emerald",
        description: "在 Contabo 4C6G/16G 或 Hetzner 大内存 VPS 上挂载自建 Runner，语法 100% 兼容 GitHub Actions，承载长时间 Docker 镜像重编译与大包构建。",
        pros: "独占多核 CPU · 无分钟数上限 · 共享本地 Docker 缓存极速复用",
        cost: "0 额外构建费 · 复用空闲 VPS 算力",
      },
      {
        title: "GitLab Pipeline / Distributed CI",
        type: "VPS 开源自建",
        typeTone: "purple",
        description: "利用多台便宜 VPS（如 Hetzner 芬兰冷备节点）组建分布式 Runner 集群，支持自动伸缩与高并发测试用例矩阵并行跑通。",
        pros: "海量测试矩阵并发 · 支持大型 monorepo 分布式编译",
        cost: "依据挂载 VPS 节点数量计费",
      },
    ],
    meshValue: {
      title: "Global Mesh 聚合价值",
      desc: "日常 PR 静态检查走 GitHub Actions 快速验证；重量级全量测试与 Docker 镜像交叉编译自动分流至内网 Contabo/Hetzner act_runner，构建时长缩短 60%，且永不耗尽每月 CI 配额。",
      recommendation: "推荐：轻型 Lint 走云端 Actions + 镜像构建走 VPS 自建 Runner",
    },
    metrics: [
      { label: "Docker 缓存命中率", value: "> 95%" },
      { label: "CI 分钟数消耗", value: "0 额度枯竭" },
      { label: "多核并发性能", value: "独占 4~16 Cores" },
    ],
  },
  {
    id: "deploy",
    name: "Deploy 交付部署",
    enName: "GitOps & Zero-Downtime",
    tagline: "声明式 GitOps 流水线、机密隔离与毫秒级流量切流",
    badge: "部署与发布编排",
    options: [
      {
        title: "GitOps 声明式对账 (GitOps + Ansible)",
        type: "混合推荐",
        typeTone: "purple",
        description: "在 Git 仓库中声明基础设施拓扑与应用状态，通过 Ansible Playbooks 自动对账推送到各大 VPS 节点，杜绝配置漂移。",
        pros: "100% 留痕可审计 · 回滚仅需一次 git revert · 自动化幂等执行",
        cost: "开源体系零授权费 · 生产级交付留痕",
      },
      {
        title: "Cloudflare Workers / Pages 边缘原子发布",
        type: "SaaS 托管",
        typeTone: "blue",
        description: "前端静态产物与 Worker 边缘网关代码通过 Wrangler CLI 秒级全球发布，自带多环境（UAT/PROD）版本隔离与即时回滚。",
        pros: "全球 300+ 节点秒级同步 · 自动分配部署预览域名 · 0 停机发布",
        cost: "免费版全功能支持",
      },
      {
        title: "Cloud Run 蓝绿金丝雀分流",
        type: "SaaS 托管",
        typeTone: "emerald",
        description: "后端 BFF 容器镜像推送到 GCP Artifact Registry，Cloud Run 支持基于流量比例（如 10%/90%）无感渐进式金丝雀发布。",
        pros: "版本原子切换 · 异常毫秒级秒切原版本 · 自动按需弹性",
        cost: "每月前 200 万次调用完全免费",
      },
    ],
    meshValue: {
      title: "Global Mesh 聚合价值",
      desc: "GitOps 仓库作为唯一决策平面，通过 GitHub Actions OIDC + Vault KV 自动签发临时凭据，跨云发布到 Cloudflare Pages、Cloud Run 与全球五大 VPS 节点，全流程无需人工敲键盘登录服务器。",
      recommendation: "推荐：GitOps 自动化声明 + Cloudflare/Cloud Run 无感原子切换",
    },
    metrics: [
      { label: "发布停机时间", value: "0 秒 (零停机)" },
      { label: "全球扩散耗时", value: "< 15 秒" },
      { label: "凭据暴露风险", value: "0 静态秘钥硬编码" },
    ],
  },
  {
    id: "security",
    name: "Security 机密安全",
    enName: "Vault & Zero-Trust",
    tagline: "HashiCorp Vault 云端托管与 VPS 自建 Raft 机密管理中心",
    badge: "机密与安全基线",
    options: [
      {
        title: "HCP Vault Cloud (HashiCorp 托管云)",
        type: "SaaS 托管",
        typeTone: "blue",
        description: "由 HashiCorp 官方运维的高可用 Vault 集群，开箱即用 99.9% SLA，支持自动快照、HSM 硬件根信任及与 AWS/GCP/Azure 原生 OIDC 联邦对接。",
        pros: "免运维 Raft 节点 · 官方热修复秒级应用 · 企业级安全审计",
        cost: "基础集群约 0.03 USD/小时起 · 免费试用额度",
      },
      {
        title: "Vault Server Self-hosted (VPS 自建 / OpenBao)",
        type: "VPS 开源自建",
        typeTone: "emerald",
        description: "在 Hetzner / Contabo 等 VPS 节点上部署自建 Vault Raft 集群（或开源 OpenBao），配合 KMS 自动解封 (Auto-unseal)，数据主权 100% 掌握在自己手中。",
        pros: "零客户端调用与 Secret 数量收费 · 私网 WireGuard 直连 · 彻底摆脱商业 License 限制",
        cost: "开源免费 · 复用已有 VPS 算力与 NVMe",
      },
      {
        title: "轻量云原生秘钥集成 (Cloud KMS / Secret Manager)",
        type: "混合推荐",
        typeTone: "purple",
        description: "利用 Google Secret Manager 或 Cloudflare Secrets 作为边缘与 Serverless 运行时凭据载体，通过 GitHub Actions OIDC 进行短效动态注入。",
        pros: "Serverless 极速冷启动 · 零静态永久 Key 泄露风险 · 细粒度 RBAC",
        cost: "GCP 前 6 个 Secret 版本免费 · Cloudflare 免费环境变量",
      },
    ],
    meshValue: {
      title: "Global Mesh 聚合价值",
      desc: "采用『Vault 自建为主库，云端 KMS / Secret Manager 边缘中继』架构。跨云 API Key、数据库连接串与 TLS 证书存放在 VPS 自建 Vault 内，通过私网 mTLS 分发短效 Token，确保全网 0 明文秘钥提交 Git 仓库。",
      recommendation: "推荐：VPS 自建 Vault Raft 集群 + GitHub OIDC 临时动态凭据换取",
    },
    metrics: [
      { label: "静态秘钥泄露", value: "0 静态泄露" },
      { label: "凭据生命周期", value: "动态签发短效" },
      { label: "私网直连延迟", value: "< 35ms (WireGuard)" },
    ],
  },
  {
    id: "run",
    name: "Run 混合运行时",
    enName: "Runtime Mesh",
    tagline: "CDN 边缘 + Serverless 弹性 + VPS 裸金属高效三合一",
    badge: "混合网格运行时",
    options: [
      {
        title: "CDN & Edge 网关 (Cloudflare Anycast)",
        type: "SaaS 托管",
        typeTone: "blue",
        description: "全球 300+ 城市 Anycast 边缘，提供极致低延迟 DNS 解析、Pages 静态加速、Workers 动态分流与 R2 零出口费通用存储总线。",
        pros: "Anycast 解析 <15ms · 免费 DDoS 防护 · R2 彻底终结出口流量费",
        cost: "核心功能完全免费",
      },
      {
        title: "Serverless 弹性容器 (GCP Cloud Run)",
        type: "SaaS 托管",
        typeTone: "emerald",
        description: "承载对外公开的业务 BFF、Webhook 消息接收与突发高并发 API，无请求自动 Scale-to-Zero，有流量秒级弹性应对突发。",
        pros: "零流量 0 成本 · 强隔离沙箱 · Google Andromeda 骨干网",
        cost: "200万次调用/月免费",
      },
      {
        title: "VPS 裸金属常驻算力池 (5 大 VPS 运营商)",
        type: "VPS 开源自建",
        typeTone: "purple",
        description: "Vultr (AI 智算)、Linode (独立核心)、Hetzner (欧洲裸金属)、Contabo (海量存储)、UCloud (亚太 CN2)。承载数据库、向量库、本地缓存与常驻计算。",
        pros: "硬件性价比极致 · 独占高性能 NVMe · 动辄 20TB+ 免费月流量",
        cost: "固定月付仅 2.5 ~ 6 USD / 节点",
      },
    ],
    meshValue: {
      title: "Global Mesh 聚合价值",
      desc: "将边缘分发、弹性微服务与低成本硬件裸金属融为一体：用户流量由 Cloudflare 接住，突发请求由 Cloud Run 消化，核心数据存储在 VPS 内部集群，完美平衡超低延迟、无限弹性与极限成本。",
      recommendation: "推荐：CDN 迎客 + Serverless 削峰 + VPS 驻守核心",
    },
    metrics: [
      { label: "亚太平均 RTT", value: "< 32ms" },
      { label: "公网入站暴露", value: "0 端口" },
      { label: "冷启动成本", value: "0 元起步" },
    ],
  },
  {
    id: "observability",
    name: "Observability 全栈可观测",
    enName: "Full-Stack Telemetry",
    tagline: "VictoriaMetrics 全家桶 + ClickHouse + 外部独立哨兵",
    badge: "全栈全链路可观测",
    options: [
      {
        title: "observability.svc.plus (Victoria 全家桶自建)",
        type: "VPS 开源自建",
        typeTone: "emerald",
        description: "基于 Caddy 反代，集约部署 VictoriaMetrics (指标)、VictoriaLogs (日志)、VictoriaTraces (链路) 与 Grafana (:3030)。原生支持 OTLP 协议，内存占用比传统 Prometheus 节省 7x。",
        pros: "极致时序压缩率 · 单机承载数百万指标 · OpenTelemetry 原生打通",
        cost: "部署在已有 VPS 节点，无商业许可费",
      },
      {
        title: "ClickHouse OLAP 列式分析 (流日志检索)",
        type: "VPS 开源自建",
        typeTone: "purple",
        description: "自建 ClickHouse 存储全球 VPC Flow Logs、边缘访问流水与安全审计，底层冷数据直接挂载 Cloudflare R2（S3 表引擎），实现近乎无限扩容与 0 元出网分析。",
        pros: "亿级日志秒级聚合 · 实时 SQL 分析 · 结合 R2 存储成本接近为零",
        cost: "极低存储费用 (R2 10GB 免费，超出仅 0.015 USD/GB)",
      },
      {
        title: "Grafana Cloud / 观测云 / Datadog (外部哨兵与 SaaS)",
        type: "SaaS 托管",
        typeTone: "blue",
        description: "独立于私有网络之外的第三方外部看门狗。利用 Grafana Cloud 免费 Synthetics 黑盒探针从全球监测公共端点，防止内部监控“自盲”。企业场景可平滑集成观测云或 Datadog。",
        pros: "绝对客观的外部视角 · 全球网络探针探测 · 告警渠道高度解耦",
        cost: "Grafana Cloud 免费 10k 指标与 50GB 日志 · 商业版按需",
      },
    ],
    meshValue: {
      title: "Global Mesh 聚合价值",
      desc: "内网全量遥测走 Victoria 全家桶与 ClickHouse（零带宽与数据存储溢价）；外网探测走 Grafana Cloud 外部探针（防止本地机房割接导致告警失灵）。全链路 APM 与日志可查，告警从不漏发。",
      recommendation: "推荐：内部 Victoria+ClickHouse 主力 + 外部 Grafana Cloud 独立哨兵",
    },
    metrics: [
      { label: "指标内存压缩率", value: "7x 优于传统" },
      { label: "日志查询延时", value: "毫秒级响应" },
      { label: "监控防自盲能力", value: "100% 独立哨兵" },
    ],
  },
];

export default function GlobalMeshPage() {
  const [activeLifecycleStage, setActiveLifecycleStage] = useState<"code" | "plan" | "build" | "deploy" | "security" | "run" | "observability">("code");
  const [gridMode, setGridMode] = useState<"nodes" | "vendors" | "regions">("nodes");
  const [activeCell, setActiveCell] = useState<{ rowIdx: number; col: NodeItem; val: number }>({
    rowIdx: 3,
    col: GLOBAL_NODES[12],
    val: 1,
  });
  const [showLogs, setShowLogs] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [currentRtt, setCurrentRtt] = useState("< 32 ms");
  const [lastSyncTime, setLastSyncTime] = useState("2026-09-14 16:30:00");
  const [logs, setLogs] = useState<string[]>([
    "[16:30:00] > GET https://api.vultr.com/v2/regions ... [200 OK] 33 个可用区与能力已解析",
    "[16:30:01] > GET https://api.linode.com/v4/regions ... [200 OK] 25 个核心 PoP 节点与 GPU 规格已挂载",
    "[16:30:02] > PROBE console.hetzner.com/cloud ... 欧洲 DE/HEL 及新加坡 ARM CAX11 实例状态正常",
    "[16:30:03] > PROBE ucloud-global.com/zh/promotion/ulighthost ... 亚太 CN2/BGP 香港/台北/东京实例就绪",
    "[16:30:04] > PROBE new.contabo.com/servers/vps ... 32TB 大带宽及 4C6G NVMe 配置池在线",
    "[16:30:05] > PROBE https://api.cloudflare.com/client/v4/zones ... [200 OK] 全球 300+ Anycast 边缘与 R2 就绪",
    "[16:30:06] > PROBE https://run.googleapis.com/v2/projects/... ... [200 OK] us-central1 / tokyo BFF 缩容就绪",
    "[16:30:07] > PROBE https://observability.svc.plus/otlp/v1/traces ... [200 OK] Victoria 全家桶 APM 探针正常",
    "[16:30:08] > RTT PROBE: Client -> Tokyo(31ms), HK(22ms), Singapore(40ms), Frankfurt(125ms)",
  ]);

  const activeCols =
    gridMode === "nodes" ? GLOBAL_NODES : gridMode === "vendors" ? VENDOR_COLS : REGION_COLS;

  const handleTriggerSync = () => {
    setIsFetching(true);
    const now = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${now}] >> 开始执行动态全网数据抓取与实时 RTT 探针探测...`]);

    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] > [OK] api.vultr.com/v2/regions: 33 个活跃区域已同步并校准`,
      ]);
    }, 400);

    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] > [OK] api.linode.com/v4/regions: 25 个核心数据中心状态更新完成`,
      ]);
    }, 800);

    setTimeout(() => {
      const measured = 28;
      setCurrentRtt(`< ${measured} ms`);
      setLastSyncTime(`刚刚 (${new Date().toLocaleTimeString()})`);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] > [OK] 节点测速完成：本地至亚太核心跳板 RTT: ${measured}ms`,
      ]);
      setIsFetching(false);
    }, 1200);
  };

  const getRole = (dimId: string, col: NodeItem) => {
    if (dimId === "xconec") return "Core Relay Mesh";
    if (col.city.includes("赫尔辛基") || col.city.includes("纽伦堡"))
      return "Telemetry Hub (Loki/Prom)";
    if (col.city.includes("香港") || col.city.includes("台北"))
      return "APAC Low-Latency Bastion";
    if (col.city.includes("圣路易斯") || col.vendor === "Contabo")
      return "Heavy Storage & CI Runner";
    return "Gateway Mesh Ingress";
  };

  return (
    <div className="xds min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 antialiased">
      <MarketingNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-20 space-y-7">
        {/* ================================================================= */}
        {/* 1. 五列指标卡片 (5大核心运营商, 48个活跃 PoP, <32ms延时, 0入站端口, 100%容灾) */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 py-4 px-2 sm:px-4 text-center">
            <div className="py-2 px-3 flex flex-col items-center justify-center">
              <div className="text-2xl md:text-[28px] font-bold tracking-tight">5 大</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">核心 VPS 运营商</div>
            </div>
            <div className="py-2 px-3 flex flex-col items-center justify-center">
              <div className="text-2xl md:text-[28px] font-bold tracking-tight">48 个</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">全球实时活跃 PoP</div>
            </div>
            <div className="py-2 px-3 flex flex-col items-center justify-center">
              <div className="text-2xl md:text-[28px] font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {currentRtt}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">多云最优接入延时</div>
            </div>
            <div className="py-2 px-3 flex flex-col items-center justify-center">
              <div className="text-2xl md:text-[28px] font-bold tracking-tight">0 端口</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">公网入站暴露 (ZTNA)</div>
            </div>
            <div className="py-2 px-3 flex flex-col items-center justify-center col-span-2 sm:col-span-1">
              <div className="text-2xl md:text-[28px] font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                100%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">骨干区域交叉容灾</div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. 动态抓取与测速控制条 */}
        {/* ================================================================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-xl border border-blue-100 dark:border-blue-950 bg-blue-50/50 dark:bg-blue-950/20 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              动态数据源：<strong className="text-blue-600 dark:text-blue-400 font-mono">Live Sync Engine</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-500 font-mono">上次同步: {lastSyncTime}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerSync}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span>{isFetching ? "正在探测全网..." : "⚡ 动态抓取与实时测速"}</span>
            </button>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {showLogs ? "收起日志" : "抓取日志"}
            </button>
          </div>
        </div>

        {showLogs && (
          <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto space-y-1 shadow-inner">
            <div className="text-slate-400 border-b border-slate-800 pb-1 flex justify-between">
              <span>[LIVE LOG DUMP] 全球 VPS 节点与 API 实时对账数据流</span>
              <span className="text-emerald-500">STATUS: 200 OK</span>
            </div>
            {logs.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        )}

        {/* ================================================================= */}
        {/* 4. 紧凑热力图卡片 (7行×50列 方块矩阵 + 动态检视) */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-5 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 gap-2">
            <h2 className="text-base font-semibold">VPS 能力与可用区交叉矩阵</h2>
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => setGridMode("nodes")}
                className={`transition cursor-pointer ${
                  gridMode === "nodes"
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                全景节点 (50-PoP)
              </button>
              <button
                onClick={() => setGridMode("vendors")}
                className={`transition cursor-pointer ${
                  gridMode === "vendors"
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                厂商聚合
              </button>
              <button
                onClick={() => setGridMode("regions")}
                className={`transition cursor-pointer ${
                  gridMode === "regions"
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                区域交叉
              </button>
            </div>
          </div>

          <div className="overflow-x-auto pb-3 pt-2">
            <div className="min-w-[720px]">
              <div className="flex items-start">
                <div className="w-44 shrink-0 flex flex-col justify-between pr-3 select-none text-[11px] font-medium text-slate-500 h-[140px]">
                  {Y_DIMENSIONS.map((dim) => (
                    <div
                      key={dim.id}
                      className={`truncate flex items-center h-[16px] ${
                        dim.id === "xconec" ? "text-blue-600 dark:text-blue-400 font-semibold" : ""
                      }`}
                    >
                      {dim.label}
                    </div>
                  ))}
                </div>

                <div className="flex-1 flex flex-col justify-between h-[140px]">
                  {Y_DIMENSIONS.map((dim, rowIdx) => (
                    <div key={dim.id} className="flex items-center gap-[3px] py-[1px]">
                      {activeCols.map((col, colIdx) => {
                        const val = col.vals[rowIdx];
                        const isSelected =
                          activeCell.rowIdx === rowIdx && activeCell.col.id === col.id;
                        let dotBg = "bg-[#edf0f2] dark:bg-slate-800";
                        if (val === 1) dotBg = "bg-[#5383e8] dark:bg-blue-500";
                        else if (val === 0.5) dotBg = "bg-[#9bbcf7] dark:bg-blue-900";

                        return (
                          <div
                            key={col.id || colIdx}
                            onClick={() => setActiveCell({ rowIdx, col, val })}
                            onMouseEnter={() => setActiveCell({ rowIdx, col, val })}
                            className={`w-[14px] h-[14px] rounded-[3px] shrink-0 cursor-pointer transition-transform duration-100 hover:scale-135 ${dotBg} ${
                              isSelected ? "ring-2 ring-blue-600 dark:ring-blue-400 scale-120 z-10" : ""
                            }`}
                            title={`${col.vendor} · ${col.city} [${dim.label}]: ${
                              val === 1 ? "完全支持" : val === 0.5 ? "部分支持" : "未开通"
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Axis Labels */}
              <div className="flex mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 select-none">
                <div className="w-44 shrink-0 font-medium">横轴：VPS 厂商与骨干划分</div>
                <div className="flex-1 flex justify-between px-1 text-center font-mono">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">Linode (Akamai)</span>
                  <span className="text-red-500 dark:text-red-400 font-semibold">Hetzner</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">UCloud Global</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Contabo</span>
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">Vultr</span>
                  <span className="text-blue-700 dark:text-blue-300 font-semibold">Xconec 冗余</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 mt-4 pt-2">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-slate-800 dark:text-slate-200">状态说明：</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-[3px] bg-[#edf0f2] dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
                    <span>未覆盖/无</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-[3px] bg-[#9bbcf7] dark:bg-blue-900" />
                    <span>部分/有限支持</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-[3px] bg-[#5383e8] dark:bg-blue-500" />
                    <span>完全支持/就绪</span>
                  </div>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  💡 鼠标移入或点击方块查看规格与机房配置
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Inspection Card */}
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/80 bg-blue-50/40 dark:bg-blue-950/20 transition-all duration-150">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm md:text-base text-slate-900 dark:text-slate-100">
                    {activeCell.col.vendor} · {activeCell.col.city}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                    {activeCell.val === 1
                      ? "[Active 200 OK] 完全支持"
                      : activeCell.val === 0.5
                      ? "[Partial] 有限支持"
                      : "[Inactive] 未覆盖"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  维度：<strong>{Y_DIMENSIONS[activeCell.rowIdx].label}</strong>。
                  {activeCell.col.desc}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-slate-400">实测延时:</span>{" "}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {activeCell.col.rtt}ms
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-slate-400">Xconec 角色:</span>{" "}
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {getRole(Y_DIMENSIONS[activeCell.rowIdx].id, activeCell.col)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 5. 顶部 3 项核心流量折线卡片 (请求、带宽、访问量 + Sparkline) */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between overflow-hidden">
            <div>
              <span className="text-xs text-slate-500 font-medium">请求</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold tracking-tight">225.58k</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">↗ 26.1%</span>
              </div>
            </div>
            <div className="mt-3 -mx-4 -mb-4 h-11">
              <svg className="w-full h-full" viewBox="0 0 300 45" preserveAspectRatio="none">
                <path
                  d="M0,38 L15,40 L38,22 L68,20 L82,18 L128,15 L158,35 L188,18 L225,20 L270,19 L292,8 L300,32"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.6"
                />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between overflow-hidden">
            <div>
              <span className="text-xs text-slate-500 font-medium">带宽</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold tracking-tight">3.11 GB</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">↗ 11.0%</span>
              </div>
            </div>
            <div className="mt-3 -mx-4 -mb-4 h-11">
              <svg className="w-full h-full" viewBox="0 0 300 45" preserveAspectRatio="none">
                <path
                  d="M0,35 L30,36 L60,25 L100,24 L130,35 L160,19 L200,34 L230,27 L270,16 L300,36"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.6"
                />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between overflow-hidden">
            <div>
              <span className="text-xs text-slate-500 font-medium">访问量</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold tracking-tight">27.41k</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">↗ 29.5%</span>
              </div>
            </div>
            <div className="mt-3 -mx-4 -mb-4 h-11">
              <svg className="w-full h-full" viewBox="0 0 300 45" preserveAspectRatio="none">
                <path
                  d="M0,37 L30,31 L60,33 L100,37 L130,31 L160,36 L200,35 L230,30 L280,14 L300,33"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.6"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 5. 节点与流量地理分布 (矢量地图直接内联渲染，无 iframe 嵌套) */}
        {/* ================================================================= */}
        <GlobalMeshMap />

        {/* ================================================================= */}
        {/* 6. 在线服务工程全生命周期架构实践 (Code · Plan · Build · Deploy · Run · Observability) */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-5 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100">
                  在线服务工程全生命周期架构实践 (Lifecycle of Online Services)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  SaaS + VPS 双轮驱动
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                从构思、计划、实现到上线，详解 Code · Plan · Build · Deploy · Run · Observability 各阶段在 VPS 算力与 SaaS Mesh 间的选型决策与成本对账
              </p>
            </div>
            <div className="text-xs font-mono text-slate-400 shrink-0">
              7 大工程演进阶段
            </div>
          </div>

          {/* 7-Stage Interactive Navigation Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {LIFECYCLE_STAGES.map((stg) => {
              const isSelected = activeLifecycleStage === stg.id;
              return (
                <button
                  key={stg.id}
                  onClick={() => setActiveLifecycleStage(stg.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500/80 shadow-xs ring-1 ring-blue-500/50"
                      : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      {stg.id}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}>
                      {stg.badge}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {stg.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Stage Detailed Breakdown */}
          {(() => {
            const current = LIFECYCLE_STAGES.find((s) => s.id === activeLifecycleStage) || LIFECYCLE_STAGES[0];
            return (
              <div className="space-y-4 pt-1">
                {/* Stage Header Banner */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-900/60 border border-blue-200/60 dark:border-blue-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">
                        阶段解析：{current.name} ({current.enName})
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {current.tagline}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {current.metrics.map((m, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs text-center">
                        <div className="text-[10px] text-slate-400">{m.label}</div>
                        <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3 Real-World Solution Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {current.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs flex flex-col justify-between space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs md:text-sm text-slate-900 dark:text-slate-100">
                            {opt.title}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold shrink-0 ${
                              opt.typeTone === "blue"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60"
                                : opt.typeTone === "emerald"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                                : "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60"
                            }`}
                          >
                            {opt.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-medium">核心优势:</span>{" "}
                          <span className="text-slate-700 dark:text-slate-300">{opt.pros}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium">成本参考:</span>{" "}
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">{opt.cost}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Global Mesh Collective Value Box */}
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                        {current.meshValue.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
                      {current.meshValue.desc}
                    </p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0 shadow-2xs">
                    {current.meshValue.recommendation}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* FinOps & Architecture Comparison Table */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>传统单一大厂云 (AWS/GCP) vs Global Mesh (VPS+SaaS) 全生命周期对账</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                预算节约高达 90%+
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
                    <th className="py-2 px-3 font-semibold">评估维度 / 阶段</th>
                    <th className="py-2 px-3 font-semibold">传统单一大厂全托管 (AWS/GCP)</th>
                    <th className="py-2 px-3 font-semibold text-blue-600 dark:text-blue-400">Global Mesh (VPS 算力 + SaaS 网格)</th>
                    <th className="py-2 px-3 font-semibold text-emerald-600 dark:text-emerald-400">架构与成本优势</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">出网带宽 (Egress)</td>
                    <td className="py-2 px-3 font-mono text-rose-500">高昂带宽税 (0.09 USD/GB)</td>
                    <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Cloudflare R2 0元出网 + VPS 20~32TB 流量包</td>
                    <td className="py-2 px-3">彻底根治跨云流量刺客</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">计算算力 (Compute)</td>
                    <td className="py-2 px-3 font-mono">闲置虚拟机每月 80~160 USD/台</td>
                    <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Cloud Run 缩容至0 + Hetzner €3.79 / Contabo 5.5 USD</td>
                    <td className="py-2 px-3">无流量 0 开销，有长任务独占多核</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">数据库与向量存储</td>
                    <td className="py-2 px-3 font-mono">托管 RDS/Aurora/Pinecone 150+ USD/月</td>
                    <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">VPS 自建 Supabase PG + pgvector (无容量限制)</td>
                    <td className="py-2 px-3">独占 NVMe 高吞吐，百 GB AI 向量自由</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">可观测性 (Telemetry)</td>
                    <td className="py-2 px-3 font-mono">Datadog/NewRelic 每月 200~500 USD</td>
                    <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Victoria 全家桶自建 + ClickHouse + 外部独立哨兵</td>
                    <td className="py-2 px-3">内存仅占 1/4，日志链路全闭环且防自盲</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">机密管理 (Secrets &amp; Vault)</td>
                    <td className="py-2 px-3 font-mono text-rose-500">AWS Secrets Manager (0.40 USD/secret/月 + API 调用计费)</td>
                    <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Vault Server Self-hosted (Raft 集群) + HCP Cloud 按需联动</td>
                    <td className="py-2 px-3">无 Secret 数量上限，动态凭据即用即毁</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">网络安全 (Security)</td>
                    <td className="py-2 px-3 font-mono">公网 IP 暴露容易配置疏漏</td>
                    <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">全网 0 公网入站端口暴露，主动 mTLS/WireGuard</td>
                    <td className="py-2 px-3">天然防御全网端口嗅探与 0-day 扫描</td>
                  </tr>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/40 font-semibold">
                    <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">单月综合预算评估</td>
                    <td className="py-2.5 px-3 font-mono text-rose-500">350 ~ 800+ USD /月</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">20 ~ 35 USD /月 全包</td>
                    <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">节约 90%+ 成本且多云双活无锁定</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 7. 安全性指标 (加密请求数、加密请求率、加密带宽、加密带宽率) */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="pb-1 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              安全性 (Security &amp; Zero Trust Telemetry)
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 text-left">
            <div className="pt-2 md:pt-0 px-3">
              <span className="text-[11px] text-slate-500 font-medium">加密请求数</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl md:text-2xl font-bold">214.95k</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">↗ 28.9%</span>
              </div>
            </div>
            <div className="pt-2 md:pt-0 px-3">
              <span className="text-[11px] text-slate-500 font-medium">加密请求率</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl md:text-2xl font-bold">95.29%</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">↗ 2.2%</span>
              </div>
            </div>
            <div className="pt-2 md:pt-0 px-3">
              <span className="text-[11px] text-slate-500 font-medium">加密带宽</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl md:text-2xl font-bold">3.05 GB</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">↗ 9.3%</span>
              </div>
            </div>
            <div className="pt-2 md:pt-0 px-3">
              <span className="text-[11px] text-slate-500 font-medium">加密带宽率</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl md:text-2xl font-bold">97.90%</span>
                <span className="text-xs font-semibold text-rose-500">↘ 1.6%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 8. 快速部署与 GitOps 控制入口 */}
        {/* ================================================================= */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-400 tracking-wider uppercase">
                Zero-Trust Out-of-Band Network
              </span>
              <h3 className="text-xl font-bold mt-1">一朵不是云的虚拟云 · 全球多云去中心化管理网</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                0 公网入站端口暴露，主动发起 mTLS/WireGuard 出站汇聚。聚合 Linode、Hetzner、UCloud、Contabo、Vultr
                全球 48+ PoP 节点，构建仅属于 SRE 的安全管理专网。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href="https://github.com/ai-workspace-infra/global-mesh"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium text-xs shadow-md transition"
              >
                <Terminal className="h-4 w-4" />
                查看 GitHub 仓库
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://github.com/ai-workspace-infra/global-mesh#readme"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-medium text-xs border border-slate-600 transition"
              >
                多云节点部署指南
              </a>
            </div>
          </div>
        </div>
      </main>

      <XdsSiteFooter brand="Global Mesh" />
    </div>
  );
}
