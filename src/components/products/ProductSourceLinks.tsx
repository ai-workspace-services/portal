"use client";

/**
 * 产品页「源码与下载」区块：列出该产品的公开 GitHub 仓库与 Release 制品入口，
 * 数据源为 src/lib/company.ts 的 PRODUCT_SOURCES。没有登记的产品不渲染。
 */

import { Download } from "lucide-react";

import { Github } from "@/components/icons/brand";
import { publicDiscovery } from "@/data/content/public-discovery";

import {
  XdsCard,
  XdsCardBody,
  XdsCardHead,
  XdsSectionHead,
} from "@/components/ui/xds";
import { COMPANY_LEGAL_NAME, PRODUCT_SOURCES } from "@/lib/company";

interface ProductSourceLinksProps {
  slug: string;
  language?: string;
}

export default function ProductSourceLinks({
  slug,
  language = "zh",
}: ProductSourceLinksProps) {
  const sources = PRODUCT_SOURCES[slug];
  if (!sources) return null;
  const isEn = language === "en";
  const locale = isEn ? "en" : "zh";
  const product = publicDiscovery.products.find((item) => item.slug === slug);

  return (
    <section id="source-and-downloads" style={{ paddingTop: 64 }}>
      <div className="xds-container">
        <XdsSectionHead
          eyebrow={isEn ? "Open source" : "开源"}
          title={isEn ? "Source code & downloads" : "源码与下载"}
          lead={
            isEn
              ? `Built and published by ${COMPANY_LEGAL_NAME}. Every download is a GitHub Release built from the public repository.`
              : `由 ${COMPANY_LEGAL_NAME} 开发与发布。所有下载均为公开仓库构建的 GitHub Release 制品。`
          }
        />
        <div
          style={{
            display: "grid",
            gap: "var(--sp-5)",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          }}
        >
          <XdsCard>
            <XdsCardHead title={isEn ? "GitHub repositories" : "GitHub 仓库"} />
            <XdsCardBody>
              {sources.organization ? (
                <a
                  className="xds-link-arrow"
                  href={sources.organization.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginBottom: 12 }}
                >
                  <Github className="h-4 w-4" aria-hidden="true" />{" "}
                  {isEn
                    ? "ai-workspace-infra organization"
                    : "ai-workspace-infra 组织"}
                </a>
              ) : null}
              <ul style={{ display: "grid", gap: 10 }}>
                {sources.repositories.map((item) => (
                  <li key={item.href}>
                    <a
                      className="xds-link-arrow"
                      href={item.href}
                      rel="noopener"
                    >
                      <Github className="h-4 w-4" aria-hidden="true" />{" "}
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              {product ? (
                <details style={{ marginTop: "var(--sp-5)" }}>
                  <summary className="cursor-pointer">
                    {publicDiscovery.sections.what[locale]}
                  </summary>
                  <dl className="mt-3 space-y-3">
                    {(
                      [
                        ["what", product.description[locale]],
                        ["problem", product.problem[locale]],
                        ["how", product.how[locale]],
                        ["availability", publicDiscovery.availability[locale]],
                        ["pricing", publicDiscovery.pricing[locale]],
                      ] as const
                    ).map(([key, value]) => (
                      <div key={key}>
                        <dt className="font-semibold">
                          {publicDiscovery.sections[key][locale]}
                        </dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <a
                    className="xds-link-arrow mt-3"
                    href={`/products/${slug}${isEn ? ".en" : ""}.md`}
                    type="text/markdown"
                  >
                    Markdown
                  </a>
                </details>
              ) : null}
            </XdsCardBody>
          </XdsCard>
          {sources.downloads.length > 0 ? (
            <XdsCard>
              <XdsCardHead
                title={isEn ? "Downloads" : "下载"}
                description={
                  isEn ? "Latest GitHub Release" : "最新 GitHub Release"
                }
              />
              <XdsCardBody>
                <ul style={{ display: "grid", gap: 10 }}>
                  {sources.downloads.map((item) => (
                    <li key={item.href}>
                      <a
                        className="xds-link-arrow"
                        href={item.href}
                        rel="noopener"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />{" "}
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </XdsCardBody>
            </XdsCard>
          ) : null}
        </div>
      </div>
    </section>
  );
}
