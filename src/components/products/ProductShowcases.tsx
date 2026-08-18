"use client";

/**
 * 产品页图文展示 —— Micro SaaS 模版
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版
 *
 * 保留左右交替的版式与 icon 映射，去掉模糊光晕和 shadow-2xl：
 * 规范里深度由边框强度表达，平面元素不投影。
 * 数据契约不变（WebsiteShowcasePayload）。
 */

import {
  Activity,
  Bot,
  Cpu,
  Globe,
  Layers,
  Lock,
  Monitor,
  Network,
  Shield,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WebsiteShowcasePayload } from "@/lib/docsServiceClient";
import ProductShotFrame from "./ProductShotFrame";

interface ProductShowcasesProps {
  showcases: WebsiteShowcasePayload[];
}

const ICONS: Record<string, LucideIcon> = {
  bot: Bot,
  network: Network,
  monitor: Monitor,
  shield: Shield,
  "shield-check": ShieldCheck,
  activity: Activity,
  layers: Layers,
  lock: Lock,
  zap: Zap,
  globe: Globe,
  cpu: Cpu,
};

export default function ProductShowcases({ showcases }: ProductShowcasesProps) {
  if (!showcases?.length) {
    return null;
  }

  return (
    <section
      className="xds-section-sm"
      style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div className="xds-container xds-showcases">
        {showcases.map((showcase, idx) => {
          const Icon = (showcase.icon && ICONS[showcase.icon]) || Shield;
          return (
            <div
              key={`${showcase.title}-${idx}`}
              className={`xds-showcase${showcase.reverse ? " xds-is-reverse" : ""}`}
            >
              <div className="xds-showcase-copy">
                <div className="xds-feat-ico">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h2 className="xds-t-h2">{showcase.title}</h2>
                <p className="xds-t-lead">{showcase.description}</p>
              </div>
              <div className="xds-showcase-media">
                <ProductShotFrame src={showcase.image} alt={showcase.title} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
