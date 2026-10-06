"use client";

import { ArrowRight, Bot, Cloud, Globe2, Network } from "lucide-react";

import BoundaryLink from "@/components/common/BoundaryLink";
import MarketingNav from "@/components/marketing/MarketingNav";
import XdsSiteFooter from "@/components/xds/XdsSiteFooter";
import { useLanguage } from "@/i18n/LanguageProvider";
import { publicDiscovery } from "@/data/content/public-discovery";

const PRODUCT_ICONS: Record<string, typeof Bot> = {
  xworkmate: Bot,
  xconnect: Network,
  "ai-workspace": Cloud,
  "open-platform": Globe2,
};

export default function ProductOverview() {
  const { language } = useLanguage();
  const isChinese = language !== "en";

  return (
    <div className="xds min-h-screen overflow-x-hidden">
      <MarketingNav />
      <main>
        <section className="border-b border-slate-200 bg-slate-950 py-20 text-white sm:py-28">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-300">
              {isChinese
                ? "XWORK TECHNOLOGIES / PRODUCTS"
                : "XWORK TECHNOLOGIES / PRODUCTS"}
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
              {isChinese ? "产品与服务" : "Products and services"}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              {isChinese
                ? "从 AI 工作空间到连接能力与开放基础设施，选择适合你工作方式的 XWork Technologies 产品。"
                : "From AI workspaces to connectivity and open infrastructure, choose the XWork Technologies product that fits your workflow."}
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-2">
              {publicDiscovery.products
                .filter((product) => product.showInOverview !== false)
                .map((product, index) => {
                  const Icon = PRODUCT_ICONS[product.slug] ?? Globe2;
                  const locale = isChinese ? "zh" : "en";
                  const title = product.title[locale];
                  const description = product.description[locale];
                  const href = `/products/${product.slug}`;

                  return (
                    <article
                      key={product.slug}
                      className={`group flex min-h-[280px] flex-col rounded-2xl border p-7 transition hover:-translate-y-1 hover:shadow-lg sm:p-9 ${
                        index === 0
                          ? "border-indigo-200 bg-indigo-50/70"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white">
                          <Icon className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          0{index + 1}
                        </span>
                      </div>
                      <h2 className="mt-7 text-2xl font-bold tracking-tight text-slate-900">
                        {product.name[locale]}
                      </h2>
                      <h3 className="mt-2 text-lg font-semibold text-indigo-700">
                        {title}
                      </h3>
                      <p className="mt-4 max-w-xl flex-1 leading-7 text-slate-600">
                        {description}
                      </p>
                      <BoundaryLink
                        href={href}
                        className="mt-7 inline-flex items-center gap-2 font-semibold text-slate-900 transition group-hover:text-indigo-700"
                      >
                        {product.cta[locale]}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </BoundaryLink>
                    </article>
                  );
                })}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-16">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                {isChinese ? "开源与下载" : "Open source and downloads"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {isChinese
                  ? "查看源码、版本和客户端制品"
                  : "Find source code, releases, and client artifacts"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <BoundaryLink
                href="/download"
                className="xds-btn xds-btn-primary"
              >
                {isChinese ? "下载中心" : "Download center"}
              </BoundaryLink>
              <BoundaryLink
                href="/github"
                className="xds-btn xds-btn-secondary"
              >
                GitHub
              </BoundaryLink>
            </div>
          </div>
        </section>
      </main>
      <XdsSiteFooter />
    </div>
  );
}
