"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { homeMarketingContent } from "@/components/marketing/content";
import HeroWorkspacePreview from "@/components/marketing/HeroWorkspacePreview";
import { marketingTheme } from "@/components/marketing/theme";
import { useLanguage } from "@/i18n/LanguageProvider";

export default function HeroSection() {
  const { language } = useLanguage();
  const content = homeMarketingContent[language] ?? homeMarketingContent.zh;
  const hero = content.hero;

  return (
    <section className="relative isolate overflow-hidden border-b border-indigo-100/70 bg-[#fcfcff]">
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.045)_1px,transparent_1px)] bg-[size:2.75rem_2.75rem] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      <div aria-hidden className="absolute left-1/2 top-0 h-[42rem] w-[48rem] -translate-x-1/4 rounded-full bg-[radial-gradient(circle,_rgba(146,137,255,0.19),_transparent_67%)] blur-3xl" />

      <div className={`${marketingTheme.section.container} relative grid min-h-[calc(100vh-4rem)] items-center gap-7 pb-14 pt-16 sm:pb-20 sm:pt-20 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-12 lg:py-20 xl:gap-16`}>
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">{hero.eyebrow}</p>
          <h1 className="mt-5 text-[2.85rem] font-semibold leading-[1.06] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[4.35rem] xl:text-[4.8rem]">
            {hero.title.map((line) => <span key={line} className="block">{line}</span>)}
          </h1>
          <p className="mt-5 text-xl font-semibold leading-8 tracking-[-0.025em] text-slate-800 sm:text-2xl sm:leading-9">{hero.line}</p>
          {hero.tagline ? <p className="mt-3 text-base font-medium text-indigo-600 sm:text-lg">{hero.tagline}</p> : null}
          {hero.subtitle ? <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">{hero.subtitle}</p> : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={hero.primaryCta.href} className={`${marketingTheme.cta.primary} min-w-40 px-6 py-3.5 text-base shadow-[0_14px_30px_rgba(79,70,229,0.22)]`}>
              {hero.primaryCta.label}<ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href={hero.secondaryCta.href} className={`${marketingTheme.cta.secondary} min-w-40 px-6 py-3.5 text-base`}>
              {hero.secondaryCta.label}
            </Link>
          </div>
        </div>
        <HeroWorkspacePreview />
      </div>
    </section>
  );
}
