"use client";

/**
 * 产品页收尾 CTA —— Micro SaaS 模版
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版
 */

import { Download } from "lucide-react";
import BoundaryLink from "@/components/common/BoundaryLink";
import type { WebsiteHeroPayload } from "@/lib/docsServiceClient";

interface ProductCtaBannerProps {
  hero: WebsiteHeroPayload;
  language?: string;
}

export default function ProductCtaBanner({
  hero,
  language = "zh",
}: ProductCtaBannerProps) {
  const isEn = language === "en";
  const primaryHref = hero.cta?.href || "/panel";
  const isDownload = primaryHref.includes("download");

  return (
    <section style={{ paddingBottom: 80, paddingTop: 80 }}>
      <div className="xds-container">
        <div className="xds-final-cta">
          <h2 className="xds-t-display-2">
            {isEn ? "Ready in three minutes" : "3 分钟，连上全球 AI 节点"}
          </h2>
          <p
            className="xds-t-lead"
            style={{ color: "#9aa4b5", maxWidth: "34rem", margin: "12px auto 0" }}
          >
            {hero.subtitle}
          </p>
          <div className="xds-hero-cta" style={{ marginTop: 32 }}>
            <BoundaryLink href={primaryHref} className="xds-btn xds-btn-primary xds-btn-lg">
              {isDownload ? (
                <Download className="h-4 w-4" aria-hidden="true" />
              ) : null}
              {hero.cta?.label || (isEn ? "Get started" : "立即体验")}
            </BoundaryLink>
            <BoundaryLink
              href="/docs"
              className="xds-btn xds-btn-lg"
              style={{
                background: "transparent",
                borderColor: "#3d4553",
                color: "#fff",
              }}
            >
              {isEn ? "Read the docs" : "阅读文档"}
            </BoundaryLink>
          </div>
        </div>
      </div>
    </section>
  );
}
