export interface TopologyLayer {
  level: string;
  name: string;
  enName: string;
  tagline: string;
  color: string;
  badgeColor: string;
  csDetails?: {
    title: string;
    env: string;
    features: string[];
    flow: string;
    auth: string;
  };
  bsDetails?: {
    title: string;
    env: string;
    features: string[];
    flow: string;
    auth: string;
  };
  sharedDetails?: {
    title: string;
    components: { label: string; desc: string }[];
    authControl?: string;
  };
}

export const TOPOLOGY_LAYERS: TopologyLayer[] = [
  {
    level: "第 1 层",
    name: "终端接入层",
    enName: "Client Tier",
    tagline: "原生多端与现代浏览器双向接入，支持本地持久化状态与硬件级私钥加密",
    color: "from-blue-500/10 to-indigo-500/10 border-blue-500/30",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    csDetails: {
      title: "C/S 原生多端生态",
      env: "macOS · Windows · Linux · iOS · Android (Flutter / Tauri / Rust)",
      features: [
        "原生多端运行时，支持本地 SQLite / DuckDB 离线缓存与海量数据本地索引",
        "长连接 WireGuard / mTLS 双向通道直通网关，无需重复握手，操作零抖动",
        "客户端更新包与增量热补丁经由 Cloudflare R2 存储分发 (0 出网流量费)",
      ],
      flow: "长任务 / 本地数据处理 ➔ 预设隧道网关 (第 4 层) / API 控制面 (第 3 层)",
      auth: "OS Keychain / Secure Enclave 硬件加密私钥，预配短效 WireGuard 密钥对，毫秒级指纹/生物识别解锁",
    },
    bsDetails: {
      title: "B/S 现代浏览器生态",
      env: "Chrome · Safari · Edge · Firefox (Next.js React SPA/SSR / WASM)",
      features: [
        "零安装即用，现代浏览器沙箱隔离，IndexedDB / LocalStorage 轻量状态存储",
        "标准 HTTPS / WSS 协议交互，受 CORS 与浏览器安全策略保护",
        "首屏 HTML / JS / CSS 静态资源由 Cloudflare 300+ 边缘节点全域就近秒级加速",
      ],
      flow: "用户交互 ➔ Cloudflare 300+ Anycast PoPs (第 2 层) ➔ Cloud Run BFF (第 3 层)",
      auth: "HttpOnly + Secure + SameSite Cookies，内存态 Access Token (防 XSS 窃取)，PKCE 动态挑战验签",
    },
  },
  {
    level: "第 2 层",
    name: "边缘调度与分发层",
    enName: "Edge Ingress Tier · Cloudflare 300+ Anycast PoPs",
    tagline: "全球 Anycast BGP 统一接入，WAF/DDoS 安全防护与 0 出网费分发总线",
    color: "from-orange-500/10 to-amber-500/10 border-orange-500/30",
    badgeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    sharedDetails: {
      title: "Cloudflare Anycast 边缘护城河",
      components: [
        { label: "BGP Anycast DNS", desc: "全球 300+ 城市就近解析，毫秒级网络链路寻优与跨洲智能故障切流" },
        { label: "L3/L4/L7 弹性防护", desc: "原生清洗 Terabit 级 DDoS 洪水，WAF 动态防恶意嗅探与 CC 攻击" },
        { label: "Cloudflare R2 存储总线", desc: "S3 兼容对象存储，0 出网流量税 (0 USD/GB)，为全网多端提供超低成本静态资源分发" },
        { label: "边缘规则 Workers", desc: "轻量级 Edge Logic 处理灰度分流、用户地理位置识别与静态重写" },
      ],
      authControl: "Anycast DDoS/WAF 过滤恶意嗅探，双向 mTLS 证书校验，Cloudflare Access 针对管理平面执行 ZTNA 策略判定",
    },
  },
  {
    level: "第 3 层",
    name: "弹性业务控制面",
    enName: "Control Plane Tier · GCP Cloud Run Serverless",
    tagline: "Scale-to-Zero 弹性业务控制面与 API Gateway，0 闲置费用高韧性调度",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/30",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    sharedDetails: {
      title: "Serverless 业务接入中枢与身份网关 (BFF)",
      components: [
        { label: "无服务器容器实例", desc: "Next.js API Routes / Golang 微服务容器化运行，毫秒级冷启动，自动伸缩至 0" },
        { label: "Supabase Auth 鉴权中枢", desc: "统一校验 JWT 签名与 RBAC 权限，确保所有请求在进入算力层前完成强安全认证" },
        { label: "智能请求调度派发", desc: "短平快 CRUD 请求就近直接处理；长时间计算、异步排队转交第 4 层常驻算力" },
        { label: "机密隔离", desc: "通过 GCP Secret Manager / Vault 获取临时凭据，实例无静态密钥落盘风险" },
      ],
      authControl: "统一校验 JWT 签名与 RBAC 权限，签发短效 Scoped Token，阻断未授权流量下沉至算力层",
    },
  },
  {
    level: "第 4 层",
    name: "常驻算力与隧道网关",
    enName: "Bare-Metal Mesh · 5 大 VPS 运营商 48+ PoPs",
    tagline: "全网 0 入站端口暴露，主动 mTLS/WireGuard 虚拟专网汇聚多云高密度算力",
    color: "from-purple-500/10 to-indigo-500/10 border-purple-500/30",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    sharedDetails: {
      title: "跨云虚拟专网覆盖网 (WireGuard 10.240.0.0/16)",
      components: [
        { label: "Vultr AI 智算", desc: "NVIDIA GH200 / H100 裸金属算力池，承接 AI 嵌入向量生成与复杂推理" },
        { label: "Linode Akamai", desc: "东京/新加坡 Tier-1 骨干，运行核心 API Gateway 与自建 Kubernetes 集群" },
        { label: "Contabo 存储集群", desc: "4C6G NVMe 仅 5.5 USD/月，承载 32TB 流量包的大容量文件处理与异步任务队列" },
        { label: "Hetzner 欧洲枢纽", desc: "德国/芬兰绿能机房，承接全天候日志索引、数据清洗与重型 ETL 流水线" },
        { label: "UCloud 亚太专线", desc: "香港/台北/东京 CN2 BGP 专线，提供境内外运维管理超低延迟反向跳板" },
      ],
      authControl: "算力 VPS 封闭全量公网入站端口 (0 Ingress Ports)，仅允许带内白名单 Peer 建立 ChaCha20-Poly1305 加密隧道",
    },
  },
  {
    level: "第 5 层",
    name: "核心持久化与分析层",
    enName: "Data & Telemetry Gravity · 稳态核心",
    tagline: "数据与遥测引力中心，无容量上限的自建存储与独立第三方外部监控哨兵",
    color: "from-rose-500/10 to-pink-500/10 border-rose-500/30",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    sharedDetails: {
      title: "数据稳态基石与立体可观测性闭环",
      components: [
        { label: "Supabase PG + pgvector", desc: "VPS 自建双机热备，支持百 GB 向量检索，无公有云 RDS 的阶梯容量加价" },
        { label: "Cloudflare R2 对象存储", desc: "全量生产附件、构建产物、安装包与冷数据归档，0 出网流量费永久免除带宽账单" },
        { label: "HashiCorp Vault 动态机密", desc: "自建 Raft 高可用集群，动态签发临时凭据，租赁失效自动作废，从源头根除泄露" },
        { label: "VictoriaMetrics + ClickHouse", desc: "高压缩比指标与日志归档，内存消耗仅传统方案 1/4，日志查询毫秒级响应" },
        { label: "外部独立哨兵 (observability.svc.plus)", desc: "部署于独立基础设施，对全网 PoP 实施黑盒探针检测，彻底避免内部监控自盲" },
      ],
      authControl: "Vault Raft 集群签发动态数据库凭据 (TTL 租约，用后即焚)，Supabase Row Level Security (RLS) 行级物理隔离",
    },
  },
];

export const CS_VS_BS_MATRIX = [
  {
    dim: "传输与网络协议",
    cs: "原生 TCP / UDP / WireGuard 双向加密流，长连接免频繁握手",
    bs: "标准 HTTPS / WSS / HTTP3，受浏览器沙箱与同源策略管控",
    advantage: "C/S 在实时数据流与后台同步场景具有更低抖动与更长会话生命周期",
  },
  {
    dim: "首屏加载与资源分发",
    cs: "本地客户端秒级秒启，版本安装包与增量热补丁走 R2 (0 出口流量费)",
    bs: "首屏 HTML/JS/CSS 依赖边缘 CDN 加速，受网络冷加载延时影响",
    advantage: "C/S 具备确定性离线渲染能力；B/S 具备零安装触达与快速灰度发布优势",
  },
  {
    dim: "离线能力与本地缓存",
    cs: "内置 SQLite / DuckDB，支持本地百 MB 级甚至 GB 级离线缓存与分析",
    bs: "依赖浏览器 IndexedDB / CacheStorage，受浏览器存储配额与清理策略限制",
    advantage: "C/S 原生应用在弱网、断网或重计算本地化处理时优势压倒性明显",
  },
  {
    dim: "身份凭据与本地安全",
    cs: "可调用 OS Keychain / Windows Credential Manager / Secure Enclave 硬件加密",
    bs: "依赖 HttpOnly Cookies / SessionStorage，受浏览器 XSS / CSRF 防御机制约束",
    advantage: "C/S 可实现高安全级别的硬件级私钥存储与免密生物识别快速解锁",
  },
  {
    dim: "客户端算力与资源利用",
    cs: "可充分调用用户端多核 CPU、本地 GPU / NPU 硬件加速与内存",
    bs: "受 JavaScript 单线程主循环与 WebAssembly 沙箱资源上限约束",
    advantage: "C/S 能承担重型客户端计算（如音视频编解码、本地大模型嵌入推理），极大地减轻云端算力负担",
  },
  {
    dim: "遥测与链路追踪探针",
    cs: "集成 OTel C++ / Rust / Dart 原生 SDK，支持本地落盘暂存并在网络恢复后异步重试",
    bs: "集成 OTel Web SDK，上报依赖浏览器 Beacon API 或 XHR，页面关闭可能发生偶发丢包",
    advantage: "C/S 遥测数据更加完整，全量崩溃堆栈直达私有可观测中枢",
  },
];

export interface LifecycleOption {
  title: string;
  type: "SaaS 托管" | "VPS 开源自建" | "混合推荐";
  typeTone: "blue" | "emerald" | "purple";
  description: string;
  pros: string;
  cost: string;
}

export interface LifecycleStage {
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

export const LIFECYCLE_STAGES: LifecycleStage[] = [
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

export const ZERO_TRUST_DEFENSE_ITEMS = [
  {
    title: "0 端口公网入站暴露",
    metric: "0 Ingress Ports",
    desc: "所有算力 VPS 封闭全量公网入站端口，全部通过主动发起的 mTLS/WireGuard 握手汇聚入网，免疫公网端口扫描与 0-Day 嗅探。",
  },
  {
    title: "0 静态永久机密落盘",
    metric: "0 Static Secrets",
    desc: "所有控制面与工作节点通过 Vault / Secret Manager 按需申请租约制动态临时凭据，用后即销，彻底杜绝凭据泄漏。",
  },
  {
    title: "100% 私网覆盖网隧道",
    metric: "10.240.0.0/16 Mesh",
    desc: "跨 5 大 VPS 运营商的 48+ 节点统一汇聚入 10.240.0.0/16 虚拟覆盖网络，端到端 ChaCha20-Poly1305 强加密传输。",
  },
  {
    title: "毫秒级 Anycast 故障自愈",
    metric: "< 1s BGP Failover",
    desc: "基于 Cloudflare Anycast BGP 路由矩阵，任一区域 PoP 异常时流量在 1 秒内智能分流至就近健康节点，业务端无感知。",
  },
];

export const FINOPS_TABLE_ROWS = [
  {
    dimension: "出网带宽 (Egress)",
    legacy: "高昂带宽税 (0.09 USD/GB)",
    mesh: "Cloudflare R2 0元出网 + VPS 20~32TB 流量包",
    advantage: "彻底根治跨云流量刺客",
  },
  {
    dimension: "计算算力 (Compute)",
    legacy: "闲置虚拟机每月 80~160 USD/台",
    mesh: "Cloud Run 缩容至0 + Hetzner €3.79 / Contabo 5.5 USD",
    advantage: "无流量 0 开销，有长任务独占多核",
  },
  {
    dimension: "数据库与向量存储",
    legacy: "托管 RDS/Aurora/Pinecone 150+ USD/月",
    mesh: "VPS 自建 Supabase PG + pgvector (无容量限制)",
    advantage: "独占 NVMe 高吞吐，百 GB AI 向量自由",
  },
  {
    dimension: "可观测性 (Telemetry)",
    legacy: "Datadog/NewRelic 每月 200~500 USD",
    mesh: "Victoria 全家桶自建 + ClickHouse + 外部独立哨兵",
    advantage: "内存仅占 1/4，日志链路全闭环且防自盲",
  },
  {
    dimension: "机密管理 (Secrets & Vault)",
    legacy: "AWS Secrets Manager (0.40 USD/secret/月 + API 调用计费)",
    mesh: "Vault Server Self-hosted (Raft 集群) + HCP Cloud 按需联动",
    advantage: "无 Secret 数量上限，动态凭据即用即毁",
  },
  {
    dimension: "网络安全 (Security)",
    legacy: "公网 IP 暴露容易配置疏漏",
    mesh: "全网 0 公网入站端口暴露，主动 mTLS/WireGuard",
    advantage: "天然防御全网端口嗅探与 0-day 扫描",
  },
];

export interface AppTopologyTierSummary {
  id: string;
  level: string;
  name: string;
  enName: string;
  color: string;
  badge: string;
  keyTech: string;
  authMechanism: string;
}

export const APP_TOPOLOGY_TIER_SUMMARIES: AppTopologyTierSummary[] = [
  {
    id: "tier-1",
    level: "第 1 层",
    name: "终端接入层",
    enName: "Client Tier",
    color: "#3b82f6",
    badge: "双轨原生/浏览器",
    keyTech: "Flutter · Tauri · Rust · Next.js React · WASM",
    authMechanism: "Secure Enclave 硬件私钥 / HttpOnly Token + PKCE",
  },
  {
    id: "tier-2",
    level: "第 2 层",
    name: "边缘调度与分发",
    enName: "Edge Ingress Tier",
    color: "#f97316",
    badge: "0元出网分发",
    keyTech: "Cloudflare 300+ Anycast PoPs · R2 · WAF · Workers",
    authMechanism: "Anycast BGP 防御 · WAF 规则清洗 · 双向 mTLS 证书",
  },
  {
    id: "tier-3",
    level: "第 3 层",
    name: "弹性业务控制面",
    enName: "Control Plane Tier",
    color: "#10b981",
    badge: "Scale-to-Zero",
    keyTech: "GCP Cloud Run Serverless BFF · 容器微服务",
    authMechanism: "Supabase Auth 统一鉴权 · 动态 Scoped Token 签发",
  },
  {
    id: "tier-4",
    level: "第 4 层",
    name: "常驻算力网格",
    enName: "Bare-Metal Compute",
    color: "#8b5cf6",
    badge: "0 端口暴露专网",
    keyTech: "5 大 VPS 运营商 48+ PoPs · WireGuard (10.240.0.0/16)",
    authMechanism: "0 端口入站暴露 · 主动握手互联 · 覆盖网粒度 ACL",
  },
  {
    id: "tier-5",
    level: "第 5 层",
    name: "双轨数据与遥测",
    enName: "Data & Telemetry Tier",
    color: "#06b6d4",
    badge: "双轨存储架构",
    keyTech: "Supabase PG · ClickHouse · VictoriaMetrics · R2",
    authMechanism: "PostgreSQL 行级安全隔离 (RLS) · Vault 动态租约凭据",
  },
];

export interface LifecycleClosedLoopStage {
  id: string;
  no: number;
  name: string;
  enName: string;
  badge: string;
  standard: string;
  branchRule: string;
  authRule: string;
  deliverable: string;
}

export const LIFECYCLE_CLOSED_LOOP_STAGES: LifecycleClosedLoopStage[] = [
  {
    id: "code",
    no: 1,
    name: "CODE 编码与分支",
    enName: "Branch & Worktree",
    badge: "Trunk-Based",
    standard: "独立 Worktree 隔离纪律 · 严禁直接向 main 或 release/* 推送",
    branchRule: "从 main 派生 feature/* 或 bugfix/* 分支",
    authRule: "本地机密隔离：OS Keychain / 租约制 Vault OIDC",
    deliverable: "单一职责原子 Commit (引用 Issue 编号)",
  },
  {
    id: "plan",
    no: 2,
    name: "PLAN 需求与溯源",
    enName: "Issue as Source of Truth",
    badge: "Source of Truth",
    standard: "Issue 是唯一权威需求事实来源 · 无 Issue 严禁开工",
    branchRule: "分支名强制绑定 Issue 编号 (如 feature/123-mesh)",
    authRule: "双向可导航证据链：Issue ➔ PR ➔ CI ➔ Deploy ➔ Tag",
    deliverable: "具备可机器判定验收标准的结构化 Issue 任务单",
  },
  {
    id: "build",
    no: 3,
    name: "BUILD 构建与门禁",
    enName: "CI Gate & Immunity",
    badge: "CI Gate (SIT)",
    standard: "构建产物环境无关性 · pull_request 自动路由 SIT 环境验证",
    branchRule: "PR 门禁自动化拦截：Lint / 单元测试 / 敏感词 / 假绿检测",
    authRule: "退出码 0 必须附带可断言证据 · 阻断假绿逃逸",
    deliverable: "不可变容器镜像 (Immutable Image Digest) 与打包产物",
  },
  {
    id: "deploy",
    no: 4,
    name: "DEPLOY 部署与不可变 Tag",
    enName: "Release Tags & Gating",
    badge: "Immutable Tags",
    standard: "不可变发版语义：UAT 日常快照 vs PROD 严格语义化版本",
    branchRule: "UAT: uat-daily-build-*-rN · PROD: vMAJOR.MINOR.PATCH",
    authRule: "后端优先门禁 (Backend-First)：后端全绿前严禁发布前端",
    deliverable: "已签名的不可变 GitHub Release 资产与部署审计凭证",
  },
  {
    id: "security",
    no: 5,
    name: "SECURITY 零信任与凭据",
    enName: "Zero-Production-Fallback",
    badge: "Zero-Production-Fallback",
    standard: "零生产兜底原则：任何非生产环境严禁将生产端点/密钥作为兜底值",
    branchRule: "缺省配置必须遵循 Safe Local Loopback 或 Fail-Fast 断言失败",
    authRule: "GitHub OIDC ➔ Vault JWT 动态短效 Token (严格三元组绑定)",
    deliverable: "Vault 租约制临时凭证与静态配置零泄漏审计日志",
  },
  {
    id: "run",
    no: 6,
    name: "RUN 生产运行与调度",
    enName: "Multi-Cloud Bare-Metal Mesh",
    badge: "0 Ingress Ports",
    standard: "多云中立 5 VPS 裸金属网格 + Serverless 弹性控制面协同",
    branchRule: "全网 0 入站端口暴露 · WireGuard 覆盖网 (10.240.0.0/16) 专网互联",
    authRule: "mTLS 双向身份鉴权通道 · Scale-to-Zero 闲置零开销",
    deliverable: "秒级故障自愈的多云双活高韧性分布式生产环境",
  },
  {
    id: "observability",
    no: 7,
    name: "OBSERVE 全栈遥测与闭环",
    enName: "Closed-Loop Feedback",
    badge: "360° Closed Loop",
    standard: "360° 运维闭环：APM 告警/缺陷自动回写需求源头 Issue 证据链",
    branchRule: "Victoria 全家桶 (指标) + ClickHouse (日志) + 外部独立哨兵探针",
    authRule: "SLO 告警与异常堆栈直达中枢 ➔ 触发工单 ➔ 启动下轮循环",
    deliverable: "全链路分布式链路 Trace 与实时 SLO 对账报告",
  },
];

export interface LifecycleFlowNode {
  id: string;
  x: number;
  y: number;
  label: string;
  sub: string;
  tag: string;
  tone: "blue" | "emerald" | "purple" | "amber" | "cyan";
  type: "start" | "branch" | "gate" | "trunk" | "snapshot" | "release" | "deploy" | "run" | "observe" | "loop";
  stageId: string;
  description: string;
}

export const LIFECYCLE_FLOW_NODES: LifecycleFlowNode[] = [
  {
    id: "issue",
    x: 90,
    y: 80,
    label: "1. 需求事实源",
    sub: "Issue / Linear",
    tag: "Truth",
    tone: "blue",
    type: "start",
    stageId: "plan",
    description: "需求唯一事实来源：必须明确目标、机器可判定验收标准与影响范围，无 Issue 不开工。",
  },
  {
    id: "branch",
    x: 250,
    y: 80,
    label: "2. 独立 Worktree 分支",
    sub: "feature/* / bugfix/*",
    tag: "Branch",
    tone: "blue",
    type: "branch",
    stageId: "code",
    description: "严格执行 Worktree 隔离纪律，本地 main 仅作集成镜像，分支名携带 Issue 编号。",
  },
  {
    id: "pr_gate",
    x: 410,
    y: 80,
    label: "3. PR 门禁 (SIT)",
    sub: "pull_request 自动化",
    tag: "CI Gate",
    tone: "emerald",
    type: "gate",
    stageId: "build",
    description: "pull_request 自动路由 SIT 环境，并行执行代码静态分析、单元测试、敏感词与假绿拦截。",
  },
  {
    id: "trunk",
    x: 570,
    y: 80,
    label: "4. 主干集成 (main)",
    sub: "Squash Merge",
    tag: "Trunk",
    tone: "blue",
    type: "trunk",
    stageId: "code",
    description: "PR 审查通过后 Squash-Merge 入 main 主干，保证主干每一提交均具备独立可构建性。",
  },
  {
    id: "uat_tag",
    x: 730,
    y: 80,
    label: "5. UAT 不可变快照",
    sub: "uat-daily-build-*-rN",
    tag: "Snapshot",
    tone: "amber",
    type: "snapshot",
    stageId: "deploy",
    description: "发布前生成跨仓库对齐的不可变日常快照 Tag，严禁删除、覆盖或使用 mutable ref。",
  },
  {
    id: "uat_deploy",
    x: 890,
    y: 80,
    label: "6. UAT 自动对账部署",
    sub: "Serverless + CDN",
    tag: "Deploy",
    tone: "amber",
    type: "deploy",
    stageId: "deploy",
    description: "自动路由至 UAT 验证环境，完成跨仓不可变快照对账与功能回归验证。",
  },
  {
    id: "prod_tag",
    x: 890,
    y: 260,
    label: "7. PROD 正式发布 Tag",
    sub: "vMAJOR.MINOR.PATCH",
    tag: "Release",
    tone: "purple",
    type: "release",
    stageId: "deploy",
    description: "从 release/vX.Y 检出 SemVer 严格不可变版本，后端优先门禁就绪后触发全网发布。",
  },
  {
    id: "prod_run",
    x: 680,
    y: 260,
    label: "8. 多云网格生产运行",
    sub: "5 VPS Mesh (0 端口)",
    tag: "Runtime",
    tone: "purple",
    type: "run",
    stageId: "run",
    description: "全网 0 入站端口暴露，WireGuard 虚拟覆盖网 (10.240.0.0/16) 与 Serverless BFF 弹性协同。",
  },
  {
    id: "observe",
    x: 470,
    y: 260,
    label: "9. 全栈可观测哨兵",
    sub: "Victoria + ClickHouse",
    tag: "APM/SLO",
    tone: "cyan",
    type: "observe",
    stageId: "observability",
    description: "时序指标、分布式 Tracing 与海量日志无死角遥测，外部独立哨兵探针防止监控自盲。",
  },
  {
    id: "closed_loop",
    x: 260,
    y: 260,
    label: "10. 闭环证据回写",
    sub: "告警 ➔ Issue 自动回写",
    tag: "Closed-Loop",
    tone: "emerald",
    type: "loop",
    stageId: "observability",
    description: "生产告警与巡检缺陷自动回写需求源头 Issue 证据链，形成 360° 全生命周期闭环演进！",
  },
];

export interface SaasMeshNode {
  id: string;
  name: string;
  provider: string;
  role: string;
  color: string;
  x: number;
  y: number;
  tech: string;
  advantage: string;
}

export const SAAS_MESH_NODES: SaasMeshNode[] = [
  {
    id: "cloudflare",
    name: "Cloudflare Anycast 边缘",
    provider: "Cloudflare",
    role: "L3-L7 WAF & 0元出网分发",
    color: "#f97316",
    x: 140,
    y: 120,
    tech: "300+ Edge PoPs · BGP DNS · R2",
    advantage: "R2 0元出网 · 毫秒级边缘加速",
  },
  {
    id: "cloudrun",
    name: "GCP Cloud Run 无服务器",
    provider: "Google Cloud",
    role: "Serverless 业务接入控制面",
    color: "#3b82f6",
    x: 480,
    y: 120,
    tech: "Scale-to-Zero · OIDC 租约",
    advantage: "0 流量 0 闲置开销 · 毫秒级冷启",
  },
  {
    id: "wireguard",
    name: "WireGuard 零信任网格",
    provider: "5 VPS Mesh",
    role: "0 端口入站暴露虚拟覆盖网",
    color: "#8b5cf6",
    x: 820,
    y: 120,
    tech: "10.240.0.0/16 · ChaCha20",
    advantage: "全网 0 入站暴露 · 免疫扫描",
  },
  {
    id: "supabase",
    name: "Supabase PG 双轨存储",
    provider: "Supabase & VPS",
    role: "业务强一致数据 & 向量检索",
    color: "#10b981",
    x: 320,
    y: 310,
    tech: "PostgreSQL · pgvector · RLS",
    advantage: "行级安全隔离 · 独占 NVMe",
  },
  {
    id: "observability",
    name: "Victoria 全栈遥测哨兵",
    provider: "VictoriaMetrics",
    role: "时序指标、链路与日志中枢",
    color: "#06b6d4",
    x: 660,
    y: 310,
    tech: "VictoriaMetrics · ClickHouse",
    advantage: "7x 内存压缩 · 告警防自盲",
  },
];
