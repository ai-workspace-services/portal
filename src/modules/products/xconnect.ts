import { type ProductConfig } from "./registry";

const xconnect: ProductConfig = {
  slug: "xconnect",
  name: "XConnect",
  title: "XConnect — AI Workspace Connector",
  title_en: "XConnect — AI Workspace Connector",
  tagline_zh: "面向 AI 工作空间的连接器，支持 AI 加速与实时协作。",
  tagline_en:
    "The connector for AI workspaces, with AI acceleration and real-time collaboration.",
  ogImage: "https://xworktech.com/assets/og/xconnect.png",
  repoUrl: "https://github.com/ai-workspace-xstream",
  docsQuickstart: "https://github.com/ai-workspace-xstream#readme",
  docsApi: "https://github.com/ai-workspace-xstream/tree/main/docs",
  docsIssues: "https://github.com/ai-workspace-xstream/issues",
  blogUrl: "https://xworktech.com/blogs",
  videosUrl: "https://xworktech.com/docs",
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
        href: "https://github.com/ai-workspace-xstream#readme",
        external: true,
      },
    ],
    managed: [
      {
        label: "联系咨询",
        href: "/contact",
      },
    ],
    paygo: [
      {
        label: "价格与方案",
        href: "/prices",
      },
    ],
    saas: [
      {
        label: "注册与试用",
        href: "/register",
      },
    ],
  },
};

export default xconnect;
