// Copy for the public marketing homepage ("/"). Kept separate from the
// shared i18n/translations.ts namespace (marketing.home) because that
// namespace is already consumed by unrelated components (ProductMatrix,
// ContactPanel, HeroBanner, etc.) — editing homepage copy here can never
// break those.
import type { Language } from "@/i18n/LanguageProvider";

export type NavLinkItem = {
  label: string;
  description: string;
  href: string;
};

export type NavDropdown = {
  label: string;
  columns: NavLinkItem[];
};

export type HomeMarketingContent = {
  brand: {
    name: string;
    tagline: string;
  };
  nav: {
    dropdowns: NavDropdown[];
    links: { label: string; href: string }[];
    login: string;
    enterConsole: string;
  };
  hero: {
    title: string[];
    subtitle: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
  };
  featureGrid: {
    icon: "layers" | "globe" | "shield" | "zap";
    title: string;
    description: string;
  }[];
  productGrid: {
    title: string;
    subtitle: string;
    items: {
      icon: "refresh" | "cloud" | "eye" | "shield";
      name: string;
      description: string;
      href: string;
      learnMore: string;
    }[];
  };
  statsBar: {
    icon: "globe" | "users" | "shield" | "zap";
    value: string;
    label: string;
  }[];
  benefitList: {
    icon: "globe" | "activity" | "shield" | "zap";
    title: string;
    description: string;
  }[];
  inviteBanner: {
    title: string;
    description: string;
    inviteUrl: string;
    copyLabel: string;
    copiedLabel: string;
  };
  pricingTeaser: {
    title: string;
    description: string;
    priceLabel: string;
    priceSuffix: string;
    features: string[];
    cta: { label: string; href: string };
  };
  finalCta: {
    title: string;
    description: string;
    cta: { label: string; href: string };
  };
};

const zh: HomeMarketingContent = {
  brand: {
    name: "SVC+",
    tagline: "Cloud-Neutral",
  },
  nav: {
    dropdowns: [
      {
        label: "产品与服务",
        columns: [
          { label: "X 助手", description: "桌面工作台与 AI 助手", href: "/xworkmate" },
          { label: "产品矩阵", description: "XWorkmate 全套产品概览", href: "/xworkmate-suite" },
          { label: "云 IaC 目录", description: "多云基础设施即代码模板", href: "/cloud_iac" },
          { label: "更多服务", description: "全部产品与解决方案", href: "/services" },
        ],
      },
      {
        label: "资源中心",
        columns: [
          { label: "文档中心", description: "产品指南与使用文档", href: "/docs" },
          { label: "技术博客", description: "行业洞察与产品动态", href: "/blogs" },
          { label: "下载中心", description: "客户端产品与工具", href: "/download" },
          { label: "支持中心", description: "帮助、常见问题与联系", href: "/support" },
          { label: "社区讨论", description: "交流经验与最佳实践", href: "/support/discussions" },
        ],
      },
    ],
    links: [
      { label: "定价", href: "/prices" },
      { label: "关于我们", href: "/about" },
    ],
    login: "登录",
    enterConsole: "进入控制台",
  },
  hero: {
    title: ["统一云原生与", "网络运维，化繁为简，安全可控"],
    subtitle:
      "在单一平台上观测、调度与保护您的基础设施与应用，跨云跨地域一致体验，开放兼容，按需扩展。",
    primaryCta: { label: "进入控制台", href: "/panel" },
    secondaryCta: { label: "查看定价", href: "/prices" },
  },
  featureGrid: [
    { icon: "layers", title: "统一平台", description: "一体化运维体验，聚合网络、云资源与应用交付全生命周期。" },
    { icon: "globe", title: "开放兼容", description: "云无关、协议开放，灵活集成现有系统与生态。" },
    { icon: "shield", title: "安全可控", description: "端到端可观测与策略控制，保障业务稳定与合规。" },
    { icon: "zap", title: "弹性扩展", description: "按需使用，快速扩展，支撑业务持续增长。" },
  ],
  productGrid: {
    title: "产品与服务",
    subtitle: "模块化构建，按需组合，满足不同行业与场景需求。",
    items: [
      { icon: "refresh", name: "XStream", description: "智能流量管理与应用加速，提升体验与可靠性。", href: "/services#xstream", learnMore: "了解更多" },
      { icon: "cloud", name: "XCloudFlow", description: "云网络与连通服务，跨云跨地域安全互联。", href: "/services#xcloudflow", learnMore: "了解更多" },
      { icon: "eye", name: "XScopeHub", description: "统一可观测与告警，全面洞察系统健康状态。", href: "/services#xscopehub", learnMore: "了解更多" },
      { icon: "shield", name: "OpenClaw", description: "安全防护与合规能力，主动防御威胁与风险。", href: "/services#openclaw", learnMore: "了解更多" },
    ],
  },
  statsBar: [
    { icon: "globe", value: "50+", label: "全球可用区域" },
    { icon: "users", value: "10K+", label: "企业用户" },
    { icon: "shield", value: "99.95%", label: "平台可用性" },
    { icon: "zap", value: "20ms", label: "全球平均延迟" },
  ],
  benefitList: [
    { icon: "globe", title: "开放中立，连接无界", description: "云中立、厂商中立，支持多云与混合云环境，自由连接全球任何地方、任何应用。" },
    { icon: "activity", title: "智能运维，洞察全局", description: "从连接、流量到应用，全链路可观测，实时洞察网络与业务表现。" },
    { icon: "shield", title: "安全可靠，始终在线", description: "多层安全防护与高可用架构，保障业务连续性与数据安全，让运维更安心。" },
    { icon: "zap", title: "敏捷高效，随需扩展", description: "按需使用，分钟级开通与集成，灵活应对业务变化，提升运维效率。" },
  ],
  inviteBanner: {
    title: "邀请好友，共同成长",
    description: "复制您的专属邀请链接，邀请团队或伙伴加入。",
    inviteUrl: "https://console.svc.plus/invite/ABC123",
    copyLabel: "复制链接",
    copiedLabel: "已复制",
  },
  pricingTeaser: {
    title: "简单透明的定价",
    description: "按需订阅，灵活选择。无隐藏费用，随时可调整。",
    priceLabel: "$0",
    priceSuffix: "起",
    features: ["按需订阅", "按量计费", "随时升级或取消"],
    cta: { label: "查看定价详情", href: "/prices" },
  },
  finalCta: {
    title: "立即开始",
    description: "登录控制台，开启您的云原生网络运维之旅。",
    cta: { label: "进入控制台", href: "/panel" },
  },
};

const en: HomeMarketingContent = {
  brand: {
    name: "SVC+",
    tagline: "Cloud-Neutral",
  },
  nav: {
    dropdowns: [
      {
        label: "Products & Services",
        columns: [
          { label: "X Assistant", description: "Desktop workspace & AI assistant", href: "/xworkmate" },
          { label: "Product Suite", description: "The full XWorkmate lineup", href: "/xworkmate-suite" },
          { label: "Cloud IaC Catalog", description: "Multi-cloud infrastructure-as-code templates", href: "/cloud_iac" },
          { label: "More Services", description: "All products & solutions", href: "/services" },
        ],
      },
      {
        label: "Resources",
        columns: [
          { label: "Documentation", description: "Product & usage guides", href: "/docs" },
          { label: "Tech Blog", description: "Industry insights & product updates", href: "/blogs" },
          { label: "Download Center", description: "Client apps & tools", href: "/download" },
          { label: "Support Center", description: "Help, FAQs & contact", href: "/support" },
          { label: "Community", description: "Share tips & best practices", href: "/support/discussions" },
        ],
      },
    ],
    links: [
      { label: "Pricing", href: "/prices" },
      { label: "About Us", href: "/about" },
    ],
    login: "Log in",
    enterConsole: "Enter Console",
  },
  hero: {
    title: ["Unified Cloud-Native &", "Network Operations, Simplified"],
    subtitle:
      "Observe, orchestrate, and protect your infrastructure and applications from a single platform — consistent across clouds and regions, open by design, scales on demand.",
    primaryCta: { label: "Enter Console", href: "/panel" },
    secondaryCta: { label: "View Pricing", href: "/prices" },
  },
  featureGrid: [
    { icon: "layers", title: "Unified Platform", description: "One integrated experience spanning network, cloud resources, and the full application delivery lifecycle." },
    { icon: "globe", title: "Open & Compatible", description: "Cloud-agnostic, protocol-open, integrates flexibly with your existing systems and ecosystem." },
    { icon: "shield", title: "Secure & Controlled", description: "End-to-end observability with policy controls, keeping operations stable and compliant." },
    { icon: "zap", title: "Elastic Scale", description: "Pay for what you use, scale quickly, and support continuous business growth." },
  ],
  productGrid: {
    title: "Products & Services",
    subtitle: "Modular building blocks you can combine for any industry or scenario.",
    items: [
      { icon: "refresh", name: "XStream", description: "Smart traffic management and acceleration for a faster, more reliable experience.", href: "/services#xstream", learnMore: "Learn more" },
      { icon: "cloud", name: "XCloudFlow", description: "Cloud networking and connectivity, securely linking across clouds and regions.", href: "/services#xcloudflow", learnMore: "Learn more" },
      { icon: "eye", name: "XScopeHub", description: "Unified observability and alerting for full visibility into system health.", href: "/services#xscopehub", learnMore: "Learn more" },
      { icon: "shield", name: "OpenClaw", description: "Security and compliance capabilities that proactively defend against risk.", href: "/services#openclaw", learnMore: "Learn more" },
    ],
  },
  statsBar: [
    { icon: "globe", value: "50+", label: "Regions worldwide" },
    { icon: "users", value: "10K+", label: "Enterprise users" },
    { icon: "shield", value: "99.95%", label: "Platform availability" },
    { icon: "zap", value: "20ms", label: "Avg. global latency" },
  ],
  benefitList: [
    { icon: "globe", title: "Open & neutral, connected without limits", description: "Cloud-neutral and vendor-neutral, supporting multi-cloud and hybrid environments — connect any place, any application, anywhere." },
    { icon: "activity", title: "Smart operations, full visibility", description: "From connectivity and traffic to applications — full-chain observability with real-time insight into network and business performance." },
    { icon: "shield", title: "Secure and reliable, always on", description: "Multi-layered security and high-availability architecture safeguard continuity and data, so operations stay worry-free." },
    { icon: "zap", title: "Agile and efficient, scales on demand", description: "Pay for what you use, provision and integrate in minutes, and adapt quickly as your business changes." },
  ],
  inviteBanner: {
    title: "Invite friends, grow together",
    description: "Copy your personal invite link and bring your team or partners on board.",
    inviteUrl: "https://console.svc.plus/invite/ABC123",
    copyLabel: "Copy link",
    copiedLabel: "Copied",
  },
  pricingTeaser: {
    title: "Simple, transparent pricing",
    description: "Subscribe on demand, choose freely. No hidden fees, adjust anytime.",
    priceLabel: "$0",
    priceSuffix: "to start",
    features: ["Subscribe on demand", "Pay as you go", "Upgrade or cancel anytime"],
    cta: { label: "View pricing details", href: "/prices" },
  },
  finalCta: {
    title: "Get started today",
    description: "Sign in to the console and begin your cloud-native networking journey.",
    cta: { label: "Enter Console", href: "/panel" },
  },
};

export const homeMarketingContent: Record<Language, HomeMarketingContent> = {
  zh,
  en,
};
