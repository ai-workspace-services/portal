// Copy for the public marketing homepage ("/").
//
// The portal is served from two domains that share the same routes, layout,
// and UI:
//   - xworkmate.com -> "xworkmate" brand (XWorkmate, product brand)
//   - svc.plus      -> "platform"  brand (SVC+, platform brand)
//
// Each brand keeps the exact same content shape so every marketing component
// renders identically — only the copy differs per brand and per language.
// Kept separate from the shared i18n/translations.ts namespace (marketing.home)
// because that namespace is already consumed by unrelated components
// (ProductMatrix, ContactPanel, HeroBanner, etc.) — editing homepage copy here
// can never break those.
export const homeMarketingContentData = {
  // ---------------------------------------------------------------------------
  // XWorkmate — product brand (xworkmate.com)
  // Positioning: "AI Workspace for Real Work" (NOT "AI Chat")
  // Keywords: Work · Connect · Control
  // ---------------------------------------------------------------------------
  xworkmate: {
    zh: {
      brand: {
        name: "XWorkmate",
        tagline: "Human + Agent Shared Workspace",
      },
      nav: {
        dropdowns: [
          {
            label: "产品与服务",
            columns: [
              {
                label: "Workspace",
                description: "智能体与记忆协同，人类与 AI 共享的工作空间",
                href: "/products/xworkmate",
              },
              {
                label: "Connect",
                description: "稳定、安全的 AI 连接能力",
                href: "/products/xstream",
              },
            ],
          },
          {
            label: "资源中心",
            columns: [
              {
                label: "文档中心",
                description: "产品指南与使用文档",
                href: "/docs",
              },
              {
                label: "技术博客",
                description: "行业洞察与产品动态",
                href: "/blogs",
              },
              {
                label: "下载中心",
                description: "客户端产品与工具",
                href: "/download",
              },
              {
                label: "支持中心",
                description: "帮助、常见问题与联系",
                href: "/support",
              },
              {
                label: "社区讨论",
                description: "交流经验与最佳实践",
                href: "/support/discussions",
              },
            ],
          },
        ],
        links: [
          {
            label: "定价",
            href: "/prices",
          },
          {
            label: "关于我们",
            href: "/about",
          },
        ],
        login: "登录",
        enterConsole: "进入控制台",
        logout: "退出登录",
      },
      hero: {
        title: ["Work · Connect · Control", "AI 工作空间，为真实工作而生"],
        subtitle:
          "不是又一个 AI 聊天框。把对话、任务、工具与记忆整合进一个共享工作空间，让人类与智能体协作，持续产出真正可交付的工作成果。",
        primaryCta: {
          label: "进入控制台",
          href: "/panel",
        },
        secondaryCta: {
          label: "查看定价",
          href: "/prices",
        },
        visual: {
          eyebrow: "主视觉插画占位符",
          title: "此处放置 XWorkmate 的连线拓扑图/卡片图片",
          subtitle: "这些内容可由 S3 上的版本化资源动态覆盖，支持按发布批次平滑切换。",
          imageBasePath: "/marketing/home-hero",
        },
        slides: [
          {
            src: "/marketing/xworkmate-suite-hero.png",
            width: 1920,
            height: 1080,
          },
          {
            src: "/marketing/xworkmate/已生成图像 1.png",
            width: 1920,
            height: 1080,
          },
        ],
      },
      featureGrid: [
        {
          icon: "layers",
          title: "统一工作空间",
          description: "对话、任务、工具与记忆集中一处，所有上下文随手可取。",
        },
        {
          icon: "globe",
          title: "智能体协作",
          description: "人类与智能体分工协作，重复性工作交给 Agent，你专注判断与决策。",
        },
        {
          icon: "shield",
          title: "安全可控",
          description: "每一步操作都可观测、可授权、可回溯，工作成果尽在掌握。",
        },
        {
          icon: "zap",
          title: "弹性扩展",
          description: "按需接入模型与工具，从个人到团队平滑扩展。",
        },
      ],
      productGrid: {
        title: "一个工作空间，覆盖全程",
        subtitle: "Workspace 与 Connect 协同，让 AI 从工具变成真正的工作伙伴。",
        items: [
          {
            icon: "refresh",
            name: "Workspace",
            description:
              "人类与智能体共享的工作空间。整合对话、任务、工具与长期记忆（Agent + Memory），持续产出可交付的工作成果。",
            href: "/products/xworkmate",
            learnMore: "了解更多",
            slides: [
              {
                src: "/marketing/xworkmate/已生成图像 1.png",
                width: 1920,
                height: 1080,
              },
              {
                src: "/marketing/xworkmate/已生成图像 2.png",
                width: 1920,
                height: 1080,
              },
              {
                src: "/marketing/xworkmate/已生成图像 3.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
          {
            icon: "eye",
            name: "Connect",
            description:
              "为工作空间提供稳定、安全的 AI 连接能力，随时访问全球模型与工具。",
            href: "/products/xstream",
            learnMore: "了解更多",
            slides: [
              {
                src: "/marketing/xstream/homepage.png",
                width: 1920,
                height: 1080,
              },
              {
                src: "/marketing/xstream/panel.png",
                width: 1920,
                height: 1080,
              },
              {
                src: "/marketing/xstream/pricing.png",
                width: 1920,
                height: 1080,
              },
              {
                src: "/marketing/xstream/product.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
        ],
      },
      statsBar: [
        {
          icon: "users",
          value: "Agent",
          label: "把重复、耗时的任务交给智能体，自动执行并交付结果。",
        },
        {
          icon: "refresh",
          value: "Memory",
          label: "上下文与经验长期留存，AI 越用越懂你的工作方式。",
        },
        {
          icon: "globe",
          value: "Connect",
          label: "稳定安全的连接能力，随时访问全球 AI 服务。",
        },
      ],
      benefitList: [
        {
          icon: "globe",
          title: "开放连接，随取随用",
          description: "不绑定任何模型与厂商，自由接入你需要的模型、工具与数据源。",
        },
        {
          icon: "activity",
          title: "从对话到交付",
          description: "任务可跟踪、结果可验证，工作从想法一路推进到可交付的成果。",
        },
        {
          icon: "shield",
          title: "可控可信",
          description: "权限、审计与可观测贯穿全程，AI 的每一步都听你的。",
        },
        {
          icon: "zap",
          title: "上手即用",
          description: "无需复杂配置，分钟级接入，立即开始真实工作。",
        },
      ],
      inviteBanner: {
        title: "邀请好友，探索更多可能",
        description: "分享您的专属邀请链接，好友注册后您将获得 30 天使用时长奖励。",
        inviteUrl: "https://console.svc.plus/invite/ABC123",
        copyLabel: "复制链接",
        copiedLabel: "已复制",
      },
      pricingTeaser: {
        title: "透明定价，按需选择",
        description: "简单透明的计费方式，无需隐蔽费用。选择适合您的方案，按需使用，轻松上手。",
        priceLabel: "$0",
        priceSuffix: "起",
        features: ["按需订阅", "按量计费", "随时升级或取消"],
        cta: {
          label: "查看定价详情",
          href: "/prices",
        },
      },
      finalCta: {
        title: "立即开始",
        description: "登录控制台，把 AI 变成真正的工作伙伴。",
        cta: {
          label: "进入控制台",
          href: "/panel",
        },
      },
    },
    en: {
      brand: {
        name: "XWorkmate",
        tagline: "Human + Agent Shared Workspace",
      },
      nav: {
        dropdowns: [
          {
            label: "Products & Services",
            columns: [
              {
                label: "Workspace",
                description: "A shared workspace where humans and agents work together",
                href: "/products/xworkmate",
              },
              {
                label: "Connect",
                description: "Stable and secure AI connectivity",
                href: "/products/xstream",
              },
            ],
          },
          {
            label: "Resources",
            columns: [
              {
                label: "Documentation",
                description: "Product & usage guides",
                href: "/docs",
              },
              {
                label: "Tech Blog",
                description: "Industry insights & product updates",
                href: "/blogs",
              },
              {
                label: "Download Center",
                description: "Client apps & tools",
                href: "/download",
              },
              {
                label: "Support Center",
                description: "Help, FAQs & contact",
                href: "/support",
              },
              {
                label: "Community",
                description: "Share tips & best practices",
                href: "/support/discussions",
              },
            ],
          },
        ],
        links: [
          {
            label: "Pricing",
            href: "/prices",
          },
          {
            label: "About Us",
            href: "/about",
          },
        ],
        login: "Log in",
        enterConsole: "Enter Console",
        logout: "Sign out",
      },
      hero: {
        title: ["Work · Connect · Control", "AI Workspace for Real Work"],
        subtitle:
          "Not another AI chat box. Bring conversations, tasks, tools, and memory into one shared workspace where humans and agents collaborate to ship real, deliverable work.",
        primaryCta: {
          label: "Enter Console",
          href: "/panel",
        },
        secondaryCta: {
          label: "View Pricing",
          href: "/prices",
        },
        visual: {
          eyebrow: "Hero visual placeholder",
          title: "XWorkmate topology diagram or card artwork goes here",
          subtitle: "This area can be swapped from versioned S3 assets without changing the page layout.",
          imageBasePath: "/marketing/home-hero",
        },
        slides: [
          {
            src: "/marketing/xworkmate-suite-hero.png",
            width: 1920,
            height: 1080,
          },
          {
            src: "/marketing/xworkmate/已生成图像 1.png",
            width: 1920,
            height: 1080,
          },
        ],
      },
      featureGrid: [
        {
          icon: "layers",
          title: "Unified Workspace",
          description: "Conversations, tasks, tools, and memory in one place — every context at hand.",
        },
        {
          icon: "globe",
          title: "Agent Collaboration",
          description: "Humans and agents divide the work: agents handle the repetitive, you own the decisions.",
        },
        {
          icon: "shield",
          title: "Secure & Controlled",
          description: "Every step observable, authorizable, and auditable — your work stays yours.",
        },
        {
          icon: "zap",
          title: "Elastic Scale",
          description: "Plug in models and tools on demand, and scale smoothly from solo to team.",
        },
      ],
      productGrid: {
        title: "One Workspace, End to End",
        subtitle: "Workspace and Connect together turn AI from a tool into a real working partner.",
        items: [
          {
            icon: "refresh",
            name: "Workspace",
            description:
              "A shared workspace for humans and agents. Conversations, tasks, tools, and long-term memory (Agent + Memory) come together to ship deliverable work.",
            href: "/products/xworkmate",
            learnMore: "Learn more",
            slides: [
              {
                src: "/marketing/xworkmate/已生成图像 1.png",
                width: 1920,
                height: 1080,
              },
              {
                src: "/marketing/xworkmate/已生成图像 2.png",
                width: 1920,
                height: 1080,
              },
              {
                src: "/marketing/xworkmate/已生成图像 3.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
          {
            icon: "eye",
            name: "Connect",
            description:
              "Stable, secure AI connectivity for your workspace — reach global models and tools anytime.",
            href: "/products/xstream",
            learnMore: "Learn more",
            slides: [
              {
                src: "/marketing/xstream/homepage.png",
                width: 1920,
                height: 1080,
              },
              {
                src: "/marketing/xstream/panel.png",
                width: 1920,
                height: 1080,
              },
              {
                src: "/marketing/xstream/pricing.png",
                width: 1920,
                height: 1080,
              },
              {
                src: "/marketing/xstream/product.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
        ],
      },
      statsBar: [
        {
          icon: "users",
          value: "Agent",
          label: "Hand repetitive, time-consuming tasks to agents that execute and deliver.",
        },
        {
          icon: "refresh",
          value: "Memory",
          label: "Context and experience persist — AI that learns how you work.",
        },
        {
          icon: "globe",
          value: "Connect",
          label: "Stable, secure access to global AI services at any time.",
        },
      ],
      benefitList: [
        {
          icon: "globe",
          title: "Open by default, connect anything",
          description: "Not locked to any model or vendor — freely connect the models, tools, and data sources you need.",
        },
        {
          icon: "activity",
          title: "From conversation to delivery",
          description: "Tasks are trackable and results verifiable — push work from idea to deliverable.",
        },
        {
          icon: "shield",
          title: "Controlled and trustworthy",
          description: "Permissions, audit, and observability throughout — every AI action is yours to govern.",
        },
        {
          icon: "zap",
          title: "Ready in minutes",
          description: "No complex setup — connect in minutes and start doing real work.",
        },
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
        cta: {
          label: "View pricing details",
          href: "/prices",
        },
      },
      finalCta: {
        title: "Get started today",
        description: "Sign in and turn AI into a real working partner.",
        cta: {
          label: "Enter Console",
          href: "/panel",
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // SVC+ — platform brand (svc.plus)
  // Positioning: "Open Platform for AI-native Infrastructure" (NOT "Cloud Service")
  // Keywords: Deploy · Connect · Operate
  // ---------------------------------------------------------------------------
  platform: {
    zh: {
      brand: {
        name: "SVC+",
        tagline: "AI 原生基础设施开放平台",
      },
      nav: {
        dropdowns: [
          {
            label: "产品与服务",
            columns: [
              {
                label: "AI Workspace",
                description: "让 AI 真正参与你的工作，而不是停留在对话中",
                href: "/products/xworkmate",
              },
              {
                label: "Platform & Infrastructure",
                description: "为 AI 工作负载提供可控、可扩展的基础支撑",
                href: "/products/open-platform",
              },
              {
                label: "AI Connectivity",
                description: "为 AI 工作负载提供稳定、安全的连接能力",
                href: "/products/xstream",
              },
            ],
          },
          {
            label: "资源中心",
            columns: [
              {
                label: "文档中心",
                description: "产品指南与使用文档",
                href: "/docs",
              },
              {
                label: "技术博客",
                description: "行业洞察与产品动态",
                href: "/blogs",
              },
              {
                label: "下载中心",
                description: "客户端产品与工具",
                href: "/download",
              },
              {
                label: "支持中心",
                description: "帮助、常见问题与联系",
                href: "/support",
              },
              {
                label: "社区讨论",
                description: "交流经验与最佳实践",
                href: "/support/discussions",
              },
            ],
          },
        ],
        links: [
          {
            label: "定价",
            href: "/prices",
          },
          {
            label: "关于我们",
            href: "/about",
          },
        ],
        login: "登录",
        enterConsole: "进入控制台",
        logout: "退出登录",
      },
      hero: {
        title: ["Deploy · Connect · Operate", "AI 原生基础设施开放平台"],
        subtitle:
          "从控制台、网关到 API、计费与账户，一站式开放平台。支持托管与自建部署，让 AI 基础设施的部署、连接与运营尽在掌控。",
        primaryCta: {
          label: "进入控制台",
          href: "/panel",
        },
        secondaryCta: {
          label: "查看定价",
          href: "/prices",
        },
        visual: {
          eyebrow: "主视觉插画占位符",
          title: "此处放置 SVC+ / Open Platform 的连线拓扑图/卡片图片",
          subtitle: "这些内容可由 S3 上的版本化资源动态覆盖，支持按发布批次平滑切换。",
          imageBasePath: "/marketing/home-hero",
        },
        slides: [
          {
            src: "/marketing/xworkmate-suite-hero.png",
            width: 1920,
            height: 1080,
          },
          {
            src: "/marketing/xworkmate/已生成图像 1.png",
            width: 1920,
            height: 1080,
          },
          {
            src: "/marketing/xstream/homepage.png",
            width: 1920,
            height: 1080,
          },
        ],
      },
      featureGrid: [
        {
          icon: "layers",
          title: "统一控制面",
          description: "Console 集中管理网关、API、计费与账户，全局状态一目了然。",
        },
        {
          icon: "globe",
          title: "开放标准",
          description: "开放 API 与标准协议，无缝对接你现有的系统与工具链。",
        },
        {
          icon: "shield",
          title: "安全可靠",
          description: "端到端安全与审计机制，保障 AI 基础设施稳定、合规运行。",
        },
        {
          icon: "zap",
          title: "弹性伸缩",
          description: "按需部署、自动扩容，从单机到集群平滑演进。",
        },
      ],
      productGrid: {
        title: "一个平台，六大支柱",
        subtitle: "覆盖 AI 基础设施的完整生命周期：部署、连接、运营。",
        items: [
          {
            icon: "console",
            name: "Console",
            description: "统一控制台，集中管理所有资源、策略与运营视图。",
            href: "/panel",
            learnMore: "进入控制台",
            slides: [
              {
                src: "/marketing/xworkmate-suite-hero.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
          {
            icon: "gateway",
            name: "Gateway",
            description: "智能网关，统一入口、流量治理与策略下发。",
            href: "/docs",
            learnMore: "查看文档",
            slides: [
              {
                src: "/marketing/xstream/homepage.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
          {
            icon: "api",
            name: "API",
            description: "开放 API 与标准协议，与你的工具链无缝集成。",
            href: "/docs",
            learnMore: "查看文档",
            slides: [
              {
                src: "/marketing/Open-Platform/unified-open-control-plane.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
          {
            icon: "billing",
            name: "Billing",
            description: "透明计费，按量付费、随时升级或取消。",
            href: "/prices",
            learnMore: "查看定价",
            slides: [
              {
                src: "/marketing/Open-Platform/secure-delivery-lifecycle.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
          {
            icon: "accounts",
            name: "Accounts",
            description: "统一账户与权限体系，多角色、多团队安全协作。",
            href: "/panel",
            learnMore: "进入控制台",
            slides: [
              {
                src: "/marketing/Open-Platform/four-trusted-foundations.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
          {
            icon: "deploy",
            name: "Deployment",
            description: "托管或自建，灵活部署你的 AI 基础设施。",
            href: "/products/open-platform",
            learnMore: "了解更多",
            slides: [
              {
                src: "/marketing/xworkmate/已生成图像 2.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
        ],
      },
      statsBar: [
        {
          icon: "zap",
          value: "Deploy",
          label: "托管或自建，分钟级完成部署与集成。",
        },
        {
          icon: "globe",
          value: "Connect",
          label: "开放连接，与你的生态无缝集成。",
        },
        {
          icon: "shield",
          value: "Operate",
          label: "全链路可观测，基础设施运营尽在掌控。",
        },
      ],
      benefitList: [
        {
          icon: "globe",
          title: "开放平台，生态自由",
          description: "开放 API 与标准协议，不被任何厂商锁定，自由集成你的工具链。",
        },
        {
          icon: "activity",
          title: "全链路可观测",
          description: "从部署、连接到运行全程可观测，实时洞察每一项关键指标。",
        },
        {
          icon: "shield",
          title: "安全合规，始终在线",
          description: "多层安全与审计机制，保障基础设施稳定、合规、持续可用。",
        },
        {
          icon: "zap",
          title: "按需伸缩，成本可控",
          description: "按量计费、弹性扩展，基础设施成本始终与业务同步。",
        },
      ],
      inviteBanner: {
        title: "邀请好友，探索更多可能",
        description: "分享您的专属邀请链接，好友注册后您将获得 30 天使用时长奖励。",
        inviteUrl: "https://console.svc.plus/invite/ABC123",
        copyLabel: "复制链接",
        copiedLabel: "已复制",
      },
      pricingTeaser: {
        title: "透明定价，按需选择",
        description: "简单透明的计费方式，无需隐蔽费用。选择适合您的方案，按需使用，轻松上手。",
        priceLabel: "$0",
        priceSuffix: "起",
        features: ["按需订阅", "按量计费", "随时升级或取消"],
        cta: {
          label: "查看定价详情",
          href: "/prices",
        },
      },
      finalCta: {
        title: "立即开始",
        description: "登录控制台，开始部署你的 AI 原生基础设施。",
        cta: {
          label: "进入控制台",
          href: "/panel",
        },
      },
    },
    en: {
      brand: {
        name: "SVC+",
        tagline: "Open Platform for AI-native Infrastructure",
      },
      nav: {
        dropdowns: [
          {
            label: "Products & Services",
            columns: [
              {
                label: "AI Workspace",
                description: "Make AI a true part of your workflow",
                href: "/products/xworkmate",
              },
              {
                label: "Platform & Infrastructure",
                description: "Controlled, scalable foundations for AI workloads",
                href: "/products/open-platform",
              },
              {
                label: "AI Connectivity",
                description: "Stable and secure access for AI workloads",
                href: "/products/xstream",
              },
            ],
          },
          {
            label: "Resources",
            columns: [
              {
                label: "Documentation",
                description: "Product & usage guides",
                href: "/docs",
              },
              {
                label: "Tech Blog",
                description: "Industry insights & product updates",
                href: "/blogs",
              },
              {
                label: "Download Center",
                description: "Client apps & tools",
                href: "/download",
              },
              {
                label: "Support Center",
                description: "Help, FAQs & contact",
                href: "/support",
              },
              {
                label: "Community",
                description: "Share tips & best practices",
                href: "/support/discussions",
              },
            ],
          },
        ],
        links: [
          {
            label: "Pricing",
            href: "/prices",
          },
          {
            label: "About Us",
            href: "/about",
          },
        ],
        login: "Log in",
        enterConsole: "Enter Console",
        logout: "Sign out",
      },
      hero: {
        title: ["Deploy · Connect · Operate", "Open Platform for AI-native Infrastructure"],
        subtitle:
          "From console, gateway, and API to billing, accounts, and deployment — one open platform for AI-native infrastructure. Deploy anywhere, connect everything, operate with confidence.",
        primaryCta: {
          label: "Enter Console",
          href: "/panel",
        },
        secondaryCta: {
          label: "View Pricing",
          href: "/prices",
        },
        visual: {
          eyebrow: "Hero visual placeholder",
          title: "SVC+ / Open Platform topology diagram or card artwork goes here",
          subtitle: "This area can be swapped from versioned S3 assets without changing the page layout.",
          imageBasePath: "/marketing/home-hero",
        },
        slides: [
          {
            src: "/marketing/xworkmate-suite-hero.png",
            width: 1920,
            height: 1080,
          },
          {
            src: "/marketing/xworkmate/已生成图像 1.png",
            width: 1920,
            height: 1080,
          },
          {
            src: "/marketing/xstream/homepage.png",
            width: 1920,
            height: 1080,
          },
        ],
      },
      featureGrid: [
        {
          icon: "layers",
          title: "Unified Control Plane",
          description: "Console manages gateway, API, billing, and accounts — full visibility at a glance.",
        },
        {
          icon: "globe",
          title: "Open Standards",
          description: "Open APIs and standard protocols integrate seamlessly with your existing stack.",
        },
        {
          icon: "shield",
          title: "Secure & Reliable",
          description: "End-to-end security and auditing keep AI infrastructure stable and compliant.",
        },
        {
          icon: "zap",
          title: "Elastic Scaling",
          description: "Deploy on demand, scale automatically, and evolve from single node to cluster.",
        },
      ],
      productGrid: {
        title: "One Platform, Six Pillars",
        subtitle: "The full lifecycle of AI-native infrastructure: deploy, connect, operate.",
        items: [
          {
            icon: "console",
            name: "Console",
            description: "A unified console to manage resources, policies, and operations.",
            href: "/panel",
            learnMore: "Open Console",
            slides: [
              {
                src: "/marketing/xworkmate-suite-hero.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
          {
            icon: "gateway",
            name: "Gateway",
            description: "An intelligent gateway for unified ingress, traffic, and policy.",
            href: "/docs",
            learnMore: "View Docs",
            slides: [
              {
                src: "/marketing/xstream/homepage.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
          {
            icon: "api",
            name: "API",
            description: "Open APIs and standard protocols that integrate with your toolchain.",
            href: "/docs",
            learnMore: "View Docs",
            slides: [
              {
                src: "/marketing/Open-Platform/unified-open-control-plane.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
          {
            icon: "billing",
            name: "Billing",
            description: "Transparent billing — pay as you go, upgrade or cancel anytime.",
            href: "/prices",
            learnMore: "View Pricing",
            slides: [
              {
                src: "/marketing/Open-Platform/secure-delivery-lifecycle.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
          {
            icon: "accounts",
            name: "Accounts",
            description: "Unified accounts and permissions for secure multi-role, multi-team collaboration.",
            href: "/panel",
            learnMore: "Open Console",
            slides: [
              {
                src: "/marketing/Open-Platform/four-trusted-foundations.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
          {
            icon: "deploy",
            name: "Deployment",
            description: "Managed or self-hosted — deploy your AI infrastructure your way.",
            href: "/products/open-platform",
            learnMore: "Learn more",
            slides: [
              {
                src: "/marketing/xworkmate/已生成图像 2.png",
                width: 1920,
                height: 1080,
              },
            ],
          },
        ],
      },
      statsBar: [
        {
          icon: "zap",
          value: "Deploy",
          label: "Managed or self-hosted — deployed and integrated in minutes.",
        },
        {
          icon: "globe",
          value: "Connect",
          label: "Open connectivity that integrates seamlessly with your ecosystem.",
        },
        {
          icon: "shield",
          value: "Operate",
          label: "Full-chain observability — infrastructure operations under control.",
        },
      ],
      benefitList: [
        {
          icon: "globe",
          title: "Open platform, free ecosystem",
          description: "Open APIs and standard protocols, no vendor lock-in — integrate your toolchain freely.",
        },
        {
          icon: "activity",
          title: "Observable end to end",
          description: "From deploy to connect to run, every key metric is visible in real time.",
        },
        {
          icon: "shield",
          title: "Compliant and always on",
          description: "Multi-layered security and auditing keep infrastructure stable, compliant, and available.",
        },
        {
          icon: "zap",
          title: "Scale on demand, control costs",
          description: "Pay as you go with elastic scaling — infrastructure cost tracks your business.",
        },
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
        cta: {
          label: "View pricing details",
          href: "/prices",
        },
      },
      finalCta: {
        title: "Get started today",
        description: "Sign in to the console and start deploying your AI-native infrastructure.",
        cta: {
          label: "Enter Console",
          href: "/panel",
        },
      },
    },
  },
};
