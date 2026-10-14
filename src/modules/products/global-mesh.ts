import { cloudHubCopy } from "@/lib/cloud-hub-copy";
import { type ProductConfig } from "./registry";

const globalMesh: ProductConfig = {
  slug: "global-mesh",
  name: cloudHubCopy.zh.name,
  title: cloudHubCopy.zh.productTitle,
  title_en: cloudHubCopy.en.productTitle,
  tagline_zh:
    "基于全球 5 大 VPS 运营商交叉覆盖与 Xconec 零信任体系构筑的全球非业务带外管理网络。",
  tagline_en:
    "Decentralized multi-cloud VPS mesh with Zero-Trust out-of-band management overlay powered by Xconec.",
  ogImage: "https://xworktech.com/assets/og/global-mesh.png",
  repoUrl: "https://github.com/ai-workspace-infra/global-mesh",
  docsQuickstart: "https://github.com/ai-workspace-infra/global-mesh#readme",
  docsApi: "https://github.com/ai-workspace-infra/global-mesh/tree/main/docs",
  docsIssues: "https://github.com/ai-workspace-infra/global-mesh/issues",
  blogUrl: "https://xworktech.com/blogs",
  videosUrl: "https://xworktech.com/docs",
  downloadUrl: "https://github.com/ai-workspace-infra/global-mesh/releases",
  editions: {
    selfhost: [
      {
        label: "GitHub 源码仓库",
        href: "https://github.com/ai-workspace-infra/global-mesh",
        external: true,
      },
      {
        label: "多云节点部署指南",
        href: "https://github.com/ai-workspace-infra/global-mesh#readme",
        external: true,
      },
    ],
    managed: [
      {
        label: "企业专网咨询",
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
        label: "控制台入口",
        href: "/panel/cloud-hub",
      },
    ],
  },
};

export default globalMesh;
