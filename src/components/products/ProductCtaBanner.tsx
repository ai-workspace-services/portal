"use client";

import { marketingTheme } from "@/components/marketing/theme";
import { Download } from "lucide-react";
import Link from "next/link";
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
    <section className={`${marketingTheme.section.container} mt-24 sm:mt-32`}>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-8 py-12 sm:px-16 sm:py-16 text-center text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight">
            {isEn
              ? `Ready to Experience ${hero.title}?`
              : `准备好体验 ${hero.title} 了吗？`}
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            {isEn
              ? "Start connecting your AI workspace, local models, and compute with zero friction."
              : "立即打通您的 AI 工作空间、模型算力与业务环境，畅享无缝的生产力加速。"}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-slate-950 shadow-md transition-all hover:bg-slate-100 hover:scale-105"
            >
              {isDownload && <Download className="h-4 w-4 text-indigo-600" />}
              {hero.cta?.label || (isEn ? "Get Started" : "立即体验")}
            </Link>
            <Link
              href="/panel"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              {isEn ? "Console Workspace" : "访问控制台"}
            </Link>
          </div>
          {hero.supportedPlatforms && (
            <p className="text-xs text-slate-400">{hero.supportedPlatforms}</p>
          )}
        </div>
      </div>
    </section>
  );
}
