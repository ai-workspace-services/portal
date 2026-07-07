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
          <div className="absolute inset-6 rounded-[2.5rem] bg-primary/5" aria-hidden />
          <div className="absolute left-2 top-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-900/8 bg-white shadow-sm">
            <ShieldCheck className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <div className="absolute right-2 top-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-900/8 bg-white shadow-sm">
            <Cloud className="h-9 w-9 text-primary" aria-hidden />
          </div>
          <div className="absolute bottom-8 left-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-900/8 bg-white shadow-sm">
            <Server className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-14 w-14 text-primary" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
