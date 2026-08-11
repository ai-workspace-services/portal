"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";
import {
  loadHomepageHeroAsset,
  resolveHomepageHeroImage,
  type HomepageHeroAsset,
} from "@/components/marketing/homeHeroAsset";

export default function HeroSection() {
  const { language } = useLanguage();
  const { hero } = homeMarketingContent[language];
  const [asset, setAsset] = useState<HomepageHeroAsset>({});

  useEffect(() => {
    let active = true;
    loadHomepageHeroAsset(language).then((nextAsset) => {
      if (active) {
        setAsset(nextAsset);
      }
    });
    return () => {
      active = false;
    };
  }, [language]);

  const visual = hero.visual;
  const imageUrl =
    (asset.imageUrl ??
      resolveHomepageHeroImage(visual.imageBasePath, asset.version)) ||
    visual.imageUrl;
  const visualTitle = asset.title ?? visual.title;
  const visualSubtitle = asset.subtitle ?? visual.subtitle;
  const visualEyebrow = asset.eyebrow ?? visual.eyebrow;

  return (
    <section
      className={`${marketingTheme.section.container} pb-16 pt-14 sm:pb-20 sm:pt-20 lg:pt-24`}
    >
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
            {hero.eyebrow}
          </div>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.5rem]">
            {hero.title.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {hero.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={hero.primaryCta.href}
              className={marketingTheme.cta.primary}
            >
              {hero.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={hero.secondaryCta.href}
              className={marketingTheme.cta.secondary}
            >
              {hero.secondaryCta.label}
            </Link>
          </div>
        </div>

        <figure className="mx-auto w-full max-w-[42rem]">
          <div className="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-slate-50 shadow-[0_28px_90px_rgba(15,23,42,0.12)]">
            <img
              src={encodeURI(imageUrl)}
              alt={visual.alt}
              width={1536}
              height={1024}
              className="aspect-[3/2] h-auto w-full object-cover"
            />
          </div>
          <figcaption className="mt-5 flex items-start gap-3 px-2">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {visualEyebrow}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {visualTitle}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {visualSubtitle}
              </p>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
