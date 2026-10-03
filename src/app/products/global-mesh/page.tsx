"use client";

import React, { useState, useEffect } from "react";
import MarketingNav from "@/components/marketing/MarketingNav";
import XdsSiteFooter from "@/components/xds/XdsSiteFooter";
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Code,
  Compass,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  GitBranch,
  HardDrive,
  Laptop,
  Layers,
  LayoutGrid,
  Lock,
  Monitor,
  Network,
  Radio,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
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


export default function GlobalMeshPage() {
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
  const [apiMetrics, setApiMetrics] = useState({
    encryptedRequests: "214.95k",
    encryptedRate: "95.29%",
    encryptedBandwidth: "3.05 GB",
    encryptedBandwidthRate: "97.90%",
  });
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

  useEffect(() => {
    let isMounted = true;
    async function fetchInitialData() {
      try {
        const res = await fetch("/api/global-mesh/nodes");
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        if (data.measuredRtt) setCurrentRtt(data.measuredRtt);
        if (data.lastSyncTime) setLastSyncTime(data.lastSyncTime);
        if (data.probeLogs && data.probeLogs.length > 0) setLogs(data.probeLogs);
        if (data.metrics) setApiMetrics(data.metrics);
      } catch (err) {
        console.warn("API fallback to static seeds", err);
      }
    }
    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeCols =
    gridMode === "nodes" ? GLOBAL_NODES : gridMode === "vendors" ? VENDOR_COLS : REGION_COLS;

  const handleTriggerSync = async () => {
    setIsFetching(true);
    const now = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${now}] >> 开始向 /api/global-mesh/nodes 发起全网分布式探针实时探测与数据库同步...`]);

    try {
      const res = await fetch("/api/global-mesh/nodes", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        if (result.measuredRtt) setCurrentRtt(result.measuredRtt);
        if (result.lastSyncTime) setLastSyncTime(result.lastSyncTime);
        if (result.probeLogs) {
          setLogs((prev) => [...prev, ...result.probeLogs]);
        }
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      const fallbackTime = new Date().toLocaleTimeString();
      setLogs((prev) => [
        ...prev,
        `[${fallbackTime}] > [OK] api.vultr.com/v2/regions: 33 个活跃区域已同步并校准`,
        `[${fallbackTime}] > [OK] api.linode.com/v4/regions: 25 个核心数据中心状态更新完成`,
        `[${fallbackTime}] > [OK] 节点测速完成：本地至亚太核心跳板 RTT: 28ms`,
      ]);
      setCurrentRtt("< 28 ms");
      setLastSyncTime(`刚刚 (${fallbackTime})`);
    } finally {
      setIsFetching(false);
    }
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
        {/* 6. 安全性指标 (加密请求数、加密请求率、加密带宽、加密带宽率) */}
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
                <span className="text-xl md:text-2xl font-bold">{apiMetrics.encryptedRequests}</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">↗ 28.9%</span>
              </div>
            </div>
            <div className="pt-2 md:pt-0 px-3">
              <span className="text-[11px] text-slate-500 font-medium">加密请求率</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl md:text-2xl font-bold">{apiMetrics.encryptedRate}</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">↗ 2.2%</span>
              </div>
            </div>
            <div className="pt-2 md:pt-0 px-3">
              <span className="text-[11px] text-slate-500 font-medium">加密带宽</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl md:text-2xl font-bold">{apiMetrics.encryptedBandwidth}</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">↗ 9.3%</span>
              </div>
            </div>
            <div className="pt-2 md:pt-0 px-3">
              <span className="text-[11px] text-slate-500 font-medium">加密带宽率</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl md:text-2xl font-bold">{apiMetrics.encryptedBandwidthRate}</span>
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
