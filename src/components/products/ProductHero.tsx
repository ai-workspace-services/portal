"use client";

/**
 * 产品页 Hero —— Micro SaaS 模版
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版
 *
 * 数据契约不变（WebsiteHeroPayload），只换视觉：轻字重大字号、
 * 圆角收敛、平面无阴影。
 */

import { ArrowRight, Download, Monitor, Zap } from "lucide-react";
import Link from "next/link";
import type { WebsiteHeroPayload } from "@/lib/docsServiceClient";

interface ProductHeroProps {
  hero: WebsiteHeroPayload;
  language?: string;
}

export default function ProductHero({
  hero,
  language = "zh",
}: ProductHeroProps) {
  const isEn = language === "en";
  const primaryHref = hero.cta?.href || "/panel";
  const isDownloadCta = primaryHref.includes("download");

  return (
    <section className="xds-hero">
      <div className="xds-container">
        {hero.badge ? (
          <span className="xds-pill">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            {hero.badge}
          </span>
        ) : null}

        <h1 className="xds-t-display-1 xds-hero-title">{hero.title}</h1>
        <p className="xds-t-lead xds-hero-sub">{hero.subtitle}</p>

        <div className="xds-hero-cta">
          <a href={primaryHref} className="xds-btn xds-btn-primary xds-btn-lg">
            {isDownloadCta ? (
              <Download className="h-4 w-4" aria-hidden="true" />
            ) : null}
            {hero.cta?.label || (isEn ? "Get started" : "立即体验")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <a href="/panel" className="xds-btn xds-btn-secondary xds-btn-lg">
            {isEn ? "Console workspace" : "进入控制台"}
          </a>
        </div>

        {hero.supportedPlatforms ? (
          <div className="xds-platform-line">
            <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{hero.supportedPlatforms}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
