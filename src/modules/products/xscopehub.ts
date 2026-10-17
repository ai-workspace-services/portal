import { type ProductConfig } from "./registry";

const xscopehub: ProductConfig = {
  slug: "xscopehub",
  name: "XScopeHub",
  title: "XScopeHub — 云原生可观测性控制台",
  title_en: "XScopeHub — Cloud Observability Hub",
  tagline_zh: "统一指标、日志、链路追踪，一站式智能告警。",
  tagline_en:
    "Unified metrics, logs, and traces with intelligent alerting in one hub.",
  ogImage: "https://xworktech.com/assets/og/xscopehub.png",
  repoUrl: "https://github.com/Cloud-Neutral/XScopeHub",
  docsQuickstart: "https://xworktech.com/docs",
  docsApi: "https://xworktech.com/docs",
  docsIssues: "https://github.com/Cloud-Neutral/XScopeHub/issues",
  blogUrl: "https://xworktech.com/blogs",
  videosUrl: "https://xworktech.com/docs",
  downloadUrl: "https://xworktech.com/download",
  editions: {
    selfhost: [
      {
        label: "部署包下载",
        href: "/download",
      },
      {
        label: "Helm Chart",
        href: "https://github.com/Cloud-Neutral/XScopeHub/tree/main/deploy/helm",
        external: true,
      },
    ],
    managed: [
      {
        label: "预约演示",
        href: "/contact",
      },
    ],
    paygo: [
      {
        label: "弹性计费",
        href: "/prices",
      },
    ],
    saas: [
      {
        label: "立即订阅",
        href: "/panel/subscription",
      },
    ],
  },
};

export default xscopehub;
