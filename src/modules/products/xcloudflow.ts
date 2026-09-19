import { type ProductConfig } from "./registry";

const xcloudflow: ProductConfig = {
  slug: "xcloudflow",
  name: "XCloudFlow",
  title: "XCloudFlow — 多云工作流与自动化平台",
  title_en: "XCloudFlow — Multi-cloud Workflow Automation",
  tagline_zh: "统一调度跨云资源，内置 AI 协作与合规审计。",
  tagline_en:
    "Coordinate multi-cloud workloads with AI assistance and governance built in.",
  ogImage: "https://xworktech.com/assets/og/xcloudflow.png",
  repoUrl: "https://github.com/Cloud-Neutral/XCloudFlow",
  docsQuickstart: "https://xworktech.com/docs",
  docsApi: "https://xworktech.com/docs",
  docsIssues: "https://github.com/Cloud-Neutral/XCloudFlow/issues",
  blogUrl: "https://xworktech.com/blogs",
  videosUrl: "https://xworktech.com/docs",
  downloadUrl: "https://xworktech.com/download",
  editions: {
    selfhost: [
      {
        label: "Terraform 模块",
        href: "https://github.com/Cloud-Neutral/XCloudFlow/tree/main/deploy/terraform",
        external: true,
      },
      {
        label: "离线安装包",
        href: "/download",
      },
    ],
    managed: [
      {
        label: "专业托管",
        href: "/contact",
      },
    ],
    paygo: [
      {
        label: "按量计费",
        href: "/prices",
      },
    ],
    saas: [
      {
        label: "团队订阅",
        href: "/panel/subscription",
      },
    ],
  },
};

export default xcloudflow;
