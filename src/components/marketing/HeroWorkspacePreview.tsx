"use client";

import {
  Bot,
  Boxes,
  Database,
  Network,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

type Product = {
  title: string;
  label: string;
  description: string;
  /** 描述下方的补充行；只有 Open Platform 用得上，设计稿里它是独立一行。 */
  caption?: string;
  Icon: LucideIcon;
};
type Capability = { label: string; sublabel: string; icon: LucideIcon };

const copy: Record<
  "zh" | "en",
  { products: Record<string, Product>; capabilities: Capability[] }
> = {
  zh: {
    products: {
      workmate: {
        title: "XWorkmate",
        label: "多种形态",
        description: "个人 · 团队 · 组织",
        Icon: X,
      },
      connect: {
        title: "XConnect",
        label: "连接能力",
        description: "安全 · 私有 · 全球覆盖",
        Icon: Network,
      },
      workspace: {
        title: "AI 工作空间",
        label: "",
        description: "上下文 · 记忆 · 协作 · 执行",
        Icon: Users,
      },
      platform: {
        title: "Open Platform",
        label: "开放平台",
        description: "基础设施与服务",
        caption: "云中立 · 开放 · 可扩展",
        Icon: Boxes,
      },
    },
    capabilities: [
      { label: "Models", sublabel: "模型", icon: Boxes },
      { label: "Agents", sublabel: "智能体", icon: Bot },
      { label: "Tools", sublabel: "工具", icon: Wrench },
      { label: "Data", sublabel: "数据", icon: Database },
    ],
  },
  en: {
    products: {
      workmate: {
        title: "XWorkmate",
        label: "Every context",
        description: "Personal · Team · Organization",
        Icon: X,
      },
      connect: {
        title: "XConnect",
        label: "Connectivity",
        description: "Secure · Private · Global",
        Icon: Network,
      },
      workspace: {
        title: "AI Workspace",
        label: "",
        description: "Context · Memory · Collaboration · Execution",
        Icon: Users,
      },
      platform: {
        title: "Open Platform",
        label: "Open foundation",
        description: "Infrastructure & services",
        caption: "Cloud-neutral · Open · Extensible",
        Icon: Boxes,
      },
    },
    capabilities: [
      { label: "Models", sublabel: "", icon: Boxes },
      { label: "Agents", sublabel: "", icon: Bot },
      { label: "Tools", sublabel: "", icon: Wrench },
      { label: "Data", sublabel: "", icon: Database },
    ],
  },
};

function ProductHex({
  product,
  featured = false,
}: {
  product: Product;
  featured?: boolean;
}) {
  const { Icon } = product;
  return (
    <article
      className={`hero-product ${featured ? "hero-product-featured" : ""}`}
    >
      <Icon
        className="hero-product-icon"
        strokeWidth={featured ? 3 : 2}
        aria-hidden="true"
      />
      {/* 图内标签不是文档层级，用 h2 会和首屏 h1 抢大纲。 */}
      <p className="hero-product-title">{product.title}</p>
      {product.label ? (
        <p className="hero-product-label">{product.label}</p>
      ) : null}
      <p className="hero-product-description">{product.description}</p>
      {product.caption ? (
        <p className="hero-product-caption">{product.caption}</p>
      ) : null}
    </article>
  );
}

function CapabilityNode({
  item,
  position,
}: {
  item: Capability;
  position: string;
}) {
  const Icon = item.icon;
  return (
    <div className={`hero-capability ${position}`}>
      <Icon className="hero-capability-icon" aria-hidden="true" />
      <span>{item.label}</span>
      {item.sublabel ? <small>{item.sublabel}</small> : null}
    </div>
  );
}

export default function HeroWorkspacePreview() {
  const { language } = useLanguage();
  const { products, capabilities } = copy[language];
  const centerProduct = { ...products.workspace, Icon: products.workmate.Icon };
  const rightProduct = { ...products.workmate, Icon: products.workspace.Icon };
  return (
    <div
      className="hero-network"
      role="img"
      aria-label={
        language === "zh"
          ? "XWorkmate 产品与 AI 能力关系图"
          : "XWorkmate product and AI capability map"
      }
    >
      <div className="hero-network-lines" aria-hidden="true">
        <span className="hero-line hero-line-up" />
        <span className="hero-line hero-line-down" />
        <span className="hero-line hero-line-left" />
        <span className="hero-line hero-line-right" />
      </div>
      <CapabilityNode item={capabilities[0]} position="hero-capability-top" />
      <CapabilityNode item={capabilities[1]} position="hero-capability-left" />
      <CapabilityNode item={capabilities[2]} position="hero-capability-right" />
      <CapabilityNode
        item={capabilities[3]}
        position="hero-capability-bottom"
      />
      <div className="hero-product-connect">
        <ProductHex product={products.connect} />
      </div>
      <div className="hero-product-workspace">
        <ProductHex product={rightProduct} />
      </div>
      <div className="hero-product-center">
        <ProductHex product={centerProduct} featured />
      </div>
      <div className="hero-product-platform">
        <ProductHex product={products.platform} />
      </div>
    </div>
  );
}
