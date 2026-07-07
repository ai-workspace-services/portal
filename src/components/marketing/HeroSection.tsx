"use client";

import Link from "next/link";
import { ArrowRight, Cloud, Server, ShieldCheck, Sparkles } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";

export default function HeroSection() {
  const { language } = useLanguage();
  const { hero } = homeMarketingContent[language];

  return (
    <section className={`${marketingTheme.section.container} pt-14 pb-10 sm:pt-20`}>
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            {hero.title.map((line) => (
              <span key={line} className="sm:block">
                {line}{" "}
              </span>
            ))}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">
            {hero.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href={hero.primaryCta.href} className={marketingTheme.cta.primary}>
              {hero.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href={hero.secondaryCta.href} className={marketingTheme.cta.secondary}>
              {hero.secondaryCta.label}
            </Link>
          </div>
        </div>

        <div className="relative mx-auto hidden aspect-square w-full max-w-md items-center justify-center sm:flex">
          <div className="absolute inset-0 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
            <Sparkles className="h-12 w-12 mb-4 opacity-50" aria-hidden />
            <span className="text-sm font-medium">
              [主视觉插画占位符]
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
