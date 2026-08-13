import { type ProductConfig } from "./registry";

const xconnect: ProductConfig = {
  slug: "xconnect",
  name: "XConnect",
  title: "XConnect — AI Workspace Connector",
  title_en: "XConnect — AI Workspace Connector",
  tagline_zh: "面向 AI 工作空间的连接器，支持 AI 加速与实时协作。",
  tagline_en:
    "The connector for AI workspaces, with AI acceleration and real-time collaboration.",
  ogImage: "https://www.svc.plus/assets/og/xconnect.png",
  repoUrl: "https://github.com/ai-workspace-xstream",
  docsQuickstart: "https://github.com/ai-workspace-xstream#readme",
  docsApi: "https://github.com/ai-workspace-xstream/tree/main/docs",
  docsIssues: "https://github.com/ai-workspace-xstream/issues",
  blogUrl: "https://www.svc.plus/blogs",
  videosUrl: "https://www.svc.plus/videos",
  downloadUrl: "https://github.com/ai-workspace-xstream/releases",
  editions: {
    selfhost: [
      {
        label: "GitHub 仓库",
        href: "https://github.com/ai-workspace-xstream",
        external: true,
      },
      {
        label: "部署指南",
        href: "https://github.com/ai-workspace-xstream#deployment",
        external: true,
      },
    ],
    managed: [
      {
        label: "联系咨询",
        href: "https://www.svc.plus/contact",
        external: true,
      },
    ],
    paygo: [
      {
        label: "价格与账单",
        href: "/panel/subscription/pricing",
      },
    ],
    saas: [
      {
        label: "注册与订阅",
        href: "/panel/subscription/",
      },
    ],
  },
};

export default xconnect;
