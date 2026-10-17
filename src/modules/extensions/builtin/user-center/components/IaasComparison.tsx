"use client";

import React from "react";
import { BookOpen, Download, Search } from "lucide-react";

type Category = "计算" | "网络" | "存储";
type Cloud = "AWS" | "GCP" | "Azure";
type IaasRow = {
  category: Category;
  title: string;
  english: string;
  scenario: string;
  AWS: string;
  GCP: string;
  Azure: string;
  note: string;
  tags: string[];
  sources: string[];
};

const SOURCES: Record<string, string> = {
  awsCompute: "https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-type-names.html",
  gcpCompute: "https://docs.cloud.google.com/compute/docs/machine-resource",
  azureCompute: "https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview",
  awsNetwork: "https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html",
  gcpNetwork: "https://docs.cloud.google.com/vpc/docs/vpc",
  azureNetwork: "https://learn.microsoft.com/en-us/azure/virtual-network/concepts-and-best-practices",
  awsStorage: "https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html",
  gcpStorage: "https://docs.cloud.google.com/compute/docs/disks",
  azureStorage: "https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types",
};

const DATA: IaasRow[] = [
  { category: "计算", title: "突发与轻量计算", english: "Burstable / shared-core", scenario: "开发测试、低占用服务、跳板机", AWS: "T3 / T3a / T4g｜基线 CPU + 积分突发", GCP: "E2 shared-core｜e2-micro / small / medium", Azure: "B 系列｜基线 CPU + 积分突发", note: "E2 共享核机制不同于 AWS T / Azure B 积分；GCP T2A / T2D 不是积分突发型。", tags: ["应用与服务", "基础设施运维"], sources: ["awsCompute", "gcpCompute", "azureCompute"] },
  { category: "计算", title: "通用均衡", english: "General purpose", scenario: "Web、API 与业务应用", AWS: "M 系列｜M7i / M7a / M7g", GCP: "N2 / N2D / N4 / C3 / C4｜通用型", Azure: "D 系列｜Dsv5 / Dasv5 / Dpsv6", note: "AWS M ≈ Azure D；GCP C3/C4 官方归通用型。按代际、内存比例和网络配额对齐。", tags: ["应用与服务", "基础设施运维"], sources: ["awsCompute", "gcpCompute", "azureCompute"] },
  { category: "计算", title: "计算密集", english: "Compute intensive", scenario: "编译、编码与批处理", AWS: "C 系列｜C7i / C7a / C7g", GCP: "C2 / C2D；highcpu 配置", Azure: "F 系列｜Fsv2", note: "highcpu 是部分机器系列的资源比例配置；CPU 型号、频率和指令集需要实测。", tags: ["应用与服务", "AI 与高性能计算"], sources: ["awsCompute", "gcpCompute", "azureCompute"] },
  { category: "计算", title: "内存密集", english: "Memory intensive", scenario: "数据库、缓存、内存分析", AWS: "R 系列｜较高内存 / vCPU 比", GCP: "N2 / N2D / N4 highmem", Azure: "E 系列｜Esv5 / Easv5", note: "GCP highmem 是 AWS R 的用途候选；按容量、内存带宽、NUMA 和数据库实测验证。", tags: ["数据库与数据", "应用与服务"], sources: ["awsCompute", "gcpCompute", "azureCompute"] },
  { category: "计算", title: "GPU 与加速计算", english: "Accelerated compute", scenario: "AI 推理、训练与图形渲染", AWS: "G / P；Inf / Trn｜GPU 与专用 AI 芯片", GCP: "G2 / A2 / A3 / A4｜GPU 加速", Azure: "NC / ND / NV｜训练与可视化", note: "按 GPU 型号、显存、互联、驱动与框架匹配；Inf / Trn 不能直接替换通用 NVIDIA GPU。", tags: ["AI 与高性能计算"], sources: ["awsCompute", "gcpCompute", "azureCompute"] },
  { category: "网络", title: "私有网络与子网", english: "VPC / VNet / subnet", scenario: "地址规划、隔离与故障域", AWS: "VPC / Subnet｜VPC 区域级；子网单 AZ", GCP: "VPC / Subnetwork｜VPC 全局；子网区域级", Azure: "VNet / Subnet｜VNet 区域级；子网可跨 AZ", note: "三家网络与子网作用域不同；迁移时重新设计 CIDR、路由和跨区故障边界。", tags: ["基础设施运维", "应用与服务"], sources: ["awsNetwork", "gcpNetwork", "azureNetwork"] },
  { category: "网络", title: "流量过滤", english: "Security groups / firewall", scenario: "最小访问与东西向控制", AWS: "Security Group / NACL｜资源级 / 子网级", GCP: "VPC firewall rules｜控制 VM 流量", Azure: "NSG / Azure Firewall｜子网或 NIC 过滤", note: "规则不能逐条等价搬迁；核对默认规则、优先级、状态性和实际作用点。", tags: ["基础设施运维"], sources: ["awsNetwork", "gcpNetwork", "azureNetwork"] },
  { category: "网络", title: "负载均衡", english: "Load balancing", scenario: "L4 转发与 L7 应用入口", AWS: "ALB / NLB｜应用层与网络层", GCP: "Application / Network LB｜代理或直通", Azure: "Application Gateway / Load Balancer", note: "对齐 L4/L7、全局/区域、TLS、源 IP、健康检查和流量费用。", tags: ["应用与服务", "基础设施运维"], sources: ["awsNetwork", "gcpNetwork", "azureNetwork"] },
  { category: "网络", title: "公网出站", english: "Outbound NAT", scenario: "私有工作负载访问公网", AWS: "NAT Gateway｜托管地址转换", GCP: "Cloud NAT｜托管出站 NAT", Azure: "NAT Gateway｜显式出站连接", note: "NAT 不提供公网主动入站；按端口、连接数、可用域和流量处理费用规划。", tags: ["应用与服务", "基础设施运维"], sources: ["awsNetwork", "gcpNetwork", "azureNetwork"] },
  { category: "网络", title: "混合云连接", english: "VPN / dedicated connectivity", scenario: "数据中心、多云与分支接入", AWS: "Site-to-Site VPN / Direct Connect", GCP: "Cloud VPN / Cloud Interconnect", Azure: "VPN Gateway / ExpressRoute", note: "专用线路不自动等于端到端加密；验收 BGP、冗余链路、带宽和 SLA 条件。", tags: ["基础设施运维"], sources: ["awsNetwork", "gcpNetwork", "azureNetwork"] },
  { category: "存储", title: "通用块存储", english: "General-purpose block", scenario: "系统盘、应用数据与数据库", AWS: "EBS gp3 / gp2｜gp3 可独立配置性能", GCP: "Hyperdisk Balanced / PD Balanced", Azure: "Premium SSD / Premium SSD v2", note: "比较容量、IOPS、吞吐、时延与 VM 限制；具体型号是否支持启动盘需要核验。", tags: ["应用与服务", "数据库与数据", "基础设施运维"], sources: ["awsStorage", "gcpStorage", "azureStorage"] },
  { category: "存储", title: "高性能块存储", english: "High-performance block", scenario: "高 IOPS、低延迟数据库", AWS: "EBS io2 Block Express｜预置 IOPS SSD", GCP: "Hyperdisk Extreme｜高性能块存储", Azure: "Ultra Disk / Premium SSD v2", note: "单卷、VM 与挂载路径共同限制性能；IOPS 与 MiB/s 分列，验证尾延迟。", tags: ["数据库与数据"], sources: ["awsStorage", "gcpStorage", "azureStorage"] },
  { category: "存储", title: "共享文件存储", english: "Shared file storage", scenario: "共享目录与文件协议应用", AWS: "EFS / FSx｜按 NFS、SMB 等协议选择", GCP: "Filestore / NetApp Volumes", Azure: "Azure Files / Azure NetApp Files", note: "协议和层级支持不同；验证 NFS/SMB、锁语义、权限、多客户端和吞吐模型。", tags: ["应用与服务", "数据库与数据"], sources: ["awsStorage", "gcpStorage", "azureStorage"] },
  { category: "存储", title: "对象存储", english: "Object storage", scenario: "备份、数据湖与静态对象", AWS: "Amazon S3｜对象 API 与多种存储类别", GCP: "Cloud Storage｜存储类别与生命周期", Azure: "Blob Storage｜热、冷与归档层", note: "对象 API 不等同 POSIX；计入请求、取回、最低保留期限和出口费用。", tags: ["应用与服务", "数据库与数据", "基础设施运维"], sources: ["awsStorage", "gcpStorage", "azureStorage"] },
];

const categoryMeta: Record<Category, { english: string; description: string }> = {
  计算: { english: "COMPUTE", description: "从 T / M / C / R 到 Arm 与 GPU，按负载定位候选实例。" },
  网络: { english: "NETWORK", description: "比较网络作用域、流量控制、互联与入口出口能力。" },
  存储: { english: "STORAGE", description: "区分块、文件、对象与本地存储，统一容量与性能口径。" },
};

function cell(value: string) {
  const [name, description] = value.split("｜");
  return <><strong>{name}</strong><p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p></>;
}

export default function IaasComparison() {
  const [category, setCategory] = React.useState<Category>("计算");
  const [query, setQuery] = React.useState("");
  const [tag, setTag] = React.useState("全部场景");
  const [providers, setProviders] = React.useState<Cloud[]>(["AWS", "GCP", "Azure"]);
  const [selected, setSelected] = React.useState<IaasRow | null>(null);
  const rows = DATA.filter((row) => row.category === category && (tag === "全部场景" || row.tags.includes(tag)) && `${row.title} ${row.english} ${row.scenario} ${row.note} ${row.AWS} ${row.GCP} ${row.Azure}`.toLowerCase().includes(query.toLowerCase()));

  const exportCsv = () => {
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const lines = [["领域", "能力", ...providers, "选型提示", "核验日期"], ...rows.map((row) => [row.category, row.title, ...providers.map((provider) => row[provider]), row.note, "2026-10-15"])];
    const blob = new Blob(["\uFEFF", lines.map((line) => line.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "cloud-hub-iaas.csv"; link.click(); URL.revokeObjectURL(url);
  };

  return <section className="space-y-4" aria-labelledby="iaas-comparison-title">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-2"><BookOpen className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" /><div><h2 id="iaas-comparison-title" className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">{"多云 IaaS 对照查询"}</h2><p className="text-xs text-slate-500 dark:text-slate-400">计算 / 网络 / 存储 · 官方资料核验 2026.10.15</p></div></div>
      <button type="button" onClick={exportCsv} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><Download className="h-3.5 w-3.5" />导出当前 CSV</button>
    </div>
    <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/70">{(Object.keys(categoryMeta) as Category[]).map((item) => <button type="button" key={item} onClick={() => { setCategory(item); setTag("全部场景"); }} aria-current={category === item ? "page" : undefined} className={`min-w-[120px] flex-1 rounded-lg px-3 py-2 text-left transition ${category === item ? "bg-white text-blue-700 shadow-xs dark:bg-slate-800 dark:text-blue-400" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"}`}><span className="block text-sm font-semibold">{item}</span><span className="text-eyebrow uppercase tracking-wider opacity-70">{categoryMeta[item].english} · {DATA.filter((row) => row.category === item).length} 类</span></button>)}</div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center"><label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input aria-label="搜索 IaaS 能力" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 T、M、R、VPC、gp3、数据库…" className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label><label className="flex items-center gap-2 text-xs text-slate-500">工作负载<select value={tag} onChange={(event) => setTag(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">{["全部场景", "应用与服务", "数据库与数据", "AI 与高性能计算", "基础设施运维"].map((value) => <option key={value}>{value}</option>)}</select></label></div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 text-xs dark:border-slate-800"><div className="flex gap-1.5">{(["AWS", "GCP", "Azure"] as Cloud[]).map((provider) => <button type="button" key={provider} aria-pressed={providers.includes(provider)} onClick={() => setProviders((current) => current.includes(provider) ? current.length > 1 ? current.filter((item) => item !== provider) : current : [...current, provider])} className={`rounded-md border px-2.5 py-1 ${providers.includes(provider) ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400" : "border-slate-200 text-slate-400 dark:border-slate-700"}`}>{provider}</button>)}</div><span className="text-slate-500">{rows.length} 类能力 · {providers.length} 家云厂商</span><button type="button" className="ml-auto text-blue-600 hover:underline" onClick={() => { setQuery(""); setTag("全部场景"); setProviders(["AWS", "GCP", "Azure"]); }}>重置筛选</button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[920px] table-fixed text-left text-xs"><thead className="bg-slate-50 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400"><tr><th className="w-[19%] px-4 py-3 font-semibold">能力 / 适用场景</th>{providers.map((provider) => <th key={provider} className="px-4 py-3 font-semibold">{provider === "GCP" ? "Google Cloud" : provider}</th>)}<th className="w-[23%] px-4 py-3 font-semibold">选型提示</th></tr></thead><tbody>{rows.map((row) => <tr key={row.title} className="border-t border-slate-200 align-top hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/30"><th className="px-4 py-4 font-normal"><button type="button" onClick={() => setSelected(row)} className="text-left font-semibold text-slate-800 hover:text-blue-600 dark:text-slate-100">{row.title}</button><div className="text-eyebrow text-slate-400">{row.english}</div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.scenario}</p></th>{providers.map((provider) => <td key={provider} className="px-4 py-4">{cell(row[provider])}</td>)}<td className="px-4 py-4"><p className="leading-relaxed text-slate-500 dark:text-slate-400">{row.note}</p><button type="button" onClick={() => setSelected(row)} className="mt-2 text-blue-600 hover:underline">详情与来源</button></td></tr>)}</tbody></table></div>{rows.length === 0 && <div className="p-10 text-center text-sm text-slate-500">没有匹配的资源，请清空搜索或切换场景。</div>}
    </div>
    <p className="text-eyebrow text-slate-500 dark:text-slate-400">用途近似 ≠ 规格等价。最终按目标区域、性能、可用性和完整成本验证；此区块展示公开能力，未加载账户资源或实时价格。</p>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><div role="dialog" aria-modal="true" aria-labelledby="iaas-detail-title" className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><div><h3 id="iaas-detail-title" className="text-lg font-semibold text-slate-900 dark:text-white">{selected.title}</h3><p className="text-xs text-slate-500">{selected.scenario}</p></div><button type="button" autoFocus onClick={() => setSelected(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:text-slate-200">关闭</button></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{providers.map((provider) => <div key={provider} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">{provider}</h4><p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{selected[provider].replace("｜", " — ")}</p></div>)}</div><p className="mt-4 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">{selected.note}</p><h4 className="mt-5 text-sm font-semibold text-slate-800 dark:text-slate-100">官方来源</h4><div className="mt-2 space-y-1">{selected.sources.map((source) => <a key={source} href={SOURCES[source]} target="_blank" rel="noreferrer" className="block text-xs text-blue-600 hover:underline">{SOURCES[source]}</a>)}</div><p className="mt-4 text-eyebrow text-slate-400">核验：2026-10-15 · 用途近似映射 · 非性能等价认证</p></div></div>}
  </section>;
}
