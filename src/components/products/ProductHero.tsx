"use client";

import { marketingTheme } from "@/components/marketing/theme";
import { ArrowRight, Download, Monitor, Zap } from "lucide-react";
import Link from "next/link";
import type { WebsiteHeroPayload } from "@/lib/docsServiceClient";

interface ProductHeroProps {
  hero: WebsiteHeroPayload;
  language?: string;
}

export default function ProductHero({ hero, language = "zh" }: ProductHeroProps) {
  const isEn = language === "en";
  const primaryHref = hero.cta?.href || "/panel";
  const isDownloadCta = primaryHref.includes("download");

  return (
    <section className={`${marketingTheme.section.container} text-center`}>
      {hero.badge && (
        <div className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-50/50 px-4 py-1.5 text-sm font-medium text-indigo-600 mb-8 shadow-sm">
          <Zap className="mr-2 h-4 w-4" />
          {hero.badge}
        </div>
      )}
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
        {hero.title}
      </h1>
      <p className="mx-auto max-w-2xl text-lg text-slate-600 mb-8 leading-relaxed">
        {hero.subtitle}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
        <Link
          href={primaryHref}
          className={`${marketingTheme.cta.primary} shadow-indigo-500/20 shadow-lg`}
        >
          {isDownloadCta && <Download className="mr-2 h-4 w-4" />}
          {hero.cta?.label || (isEn ? "Get Started" : "立即体验")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
        <Link href="/panel" className={marketingTheme.cta.secondary}>
          {isEn ? "Console Workspace" : "进入控制台"}
        </Link>
      </div>

      {hero.supportedPlatforms && (
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-medium text-slate-600 backdrop-blur-sm shadow-sm">
          <Monitor className="h-3.5 w-3.5 text-indigo-500" />
          <span>{hero.supportedPlatforms}</span>
        </div>
      )}
    </section>
  );
}
