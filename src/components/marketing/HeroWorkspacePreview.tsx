"use client";

import {
  Bot,
  Boxes,
  Network,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

/**
 * 节点只保留图标 + 名称。辅助描述曾经挤在六边形里，靠上、靠下都会撞上
 * 斜边被 clip-path 裁掉；名称单独放在最宽的中段才稳。三个文案字段留成
 * 可选，样式还在，将来要加回来不用改结构。
 */
type Product = { title: string; note: string; Icon: LucideIcon };
type Capability = { label: string; note: string; icon: LucideIcon };

const copy: Record<
  "zh" | "en",
  { products: Record<string, Product>; capabilities: Capability[] }
> = {
  zh: {
    products: {
      workmate: {
        title: "XWorkmate",
        note: "多种形态 · 个人 · 团队 · 组织",
        Icon: X,
      },
      connect: {
        title: "XConnect",
        note: "连接能力 · 安全 · 私有 · 全球覆盖",
        Icon: Network,
      },
      workspace: {
        title: "AI 工作空间",
        note: "上下文 · 记忆 · 协作 · 执行",
        Icon: Users,
      },
      platform: {
        title: "Open Platform",
        note: "开放平台 · 云中立 · 开放 · 可扩展",
        Icon: Boxes,
      },
    },
    capabilities: [
      { label: "Models", note: "模型", icon: Boxes },
      { label: "Agents", note: "智能体", icon: Bot },
      { label: "Tools", note: "工具", icon: Wrench },
    ],
  },
  en: {
    products: {
      workmate: {
        title: "XWorkmate",
        note: "Every context · Personal · Team · Organization",
        Icon: X,
      },
      connect: {
        title: "XConnect",
        note: "Connectivity · Secure · Private · Global",
        Icon: Network,
      },
      workspace: {
        title: "AI Workspace",
        note: "Context · Memory · Collaboration · Execution",
        Icon: Users,
      },
      platform: {
        title: "Open Platform",
        note: "Open foundation · Cloud-neutral · Open · Extensible",
        Icon: Boxes,
      },
    },
    capabilities: [
      { label: "Models", note: "Model catalogue", icon: Boxes },
      { label: "Agents", note: "Autonomous agents", icon: Bot },
      { label: "Tools", note: "Tool calls", icon: Wrench },
    ],
  },
};

/**
 * 注释必须挂在 shell 上、六边形外面：clip-path 会把子元素一起裁掉，
 * 放进 <article> 里一浮出就被切掉。
 */
function ProductHex({
  product,
  featured = false,
}: {
  product: Product;
  featured?: boolean;
}) {
  const { Icon } = product;
  return (
    <div className="hero-node">
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
      </article>
      <span className="hero-node-note">{product.note}</span>
    </div>
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
    <div className={`hero-node hero-capability-slot ${position}`}>
      <div className="hero-capability">
        <Icon className="hero-capability-icon" aria-hidden="true" />
        <span>{item.label}</span>
      </div>
      <span className="hero-node-note">{item.note}</span>
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
      /* role="img" 让内部文字不再被读屏播报，注释又只在 hover 时可见，
         所以完整描述必须收进 aria-label，否则这部分信息对 AT 丢失。 */
      aria-label={[
        language === "zh"
          ? "XWorkmate 产品与 AI 能力关系图。"
          : "XWorkmate product and AI capability map.",
        ...[
          products.connect,
          centerProduct,
          rightProduct,
          products.platform,
        ].map((p) => `${p.title}：${p.note}`),
        capabilities.map((c) => `${c.label}（${c.note}）`).join("、"),
      ].join(" ")}
    >
      {/* 六条辐条按 60° 等分，角度是唯一的差异，长度与起点完全一致。 */}
      <div className="hero-network-lines" aria-hidden="true">
        {[-30, -90, -150, -210, -270, -330].map((deg) => (
          <span
            key={deg}
            className="hero-line"
            style={{ "--hero-spoke": `${deg}deg` } as React.CSSProperties}
          />
        ))}
      </div>
      <CapabilityNode item={capabilities[0]} position="hero-capability-top" />
      <CapabilityNode
        item={capabilities[1]}
        position="hero-capability-lower-left"
      />
      <CapabilityNode
        item={capabilities[2]}
        position="hero-capability-lower-right"
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
