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
import Carousel from "@/components/marketing/Carousel";

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
    asset.imageUrl ??
    resolveHomepageHeroImage(visual.imageBasePath, asset.version);
  const visualTitle = asset.title ?? visual.title;
  const visualSubtitle = asset.subtitle ?? visual.subtitle;
  const visualEyebrow = asset.eyebrow ?? visual.eyebrow;

  return (
    <section
      className={`${marketingTheme.section.container} pt-14 pb-10 sm:pt-20`}
    >
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

        <div className="relative mx-auto hidden w-full max-w-[38rem] sm:block">
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-900/8 bg-[radial-gradient(circle_at_top_left,_rgba(67,120,255,0.22),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,255,0.92))] p-5 shadow-[0_28px_90px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  {visualEyebrow}
                </div>
                <div className="mt-2 max-w-md text-lg font-semibold leading-snug text-slate-900">
                  {visualTitle}
                </div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Sparkles className="h-5 w-5" aria-hidden />
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/70 p-3">
              {imageUrl ? (
                <div className="relative aspect-[16/10] overflow-hidden rounded-[1.2rem] bg-white">
                  <Carousel
                    images={[
                      "/marketing/xworkmate/已生成图像 1.png",
                      "/marketing/xworkmate/已生成图像 2.png",
                      "/marketing/xworkmate/已生成图像 3.png",
                    ]}
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50 text-center text-slate-400">
                  <div>
                    <Sparkles
                      className="mx-auto h-10 w-10 opacity-60"
                      aria-hidden
                    />
                    <div className="mt-3 text-sm font-medium">
                      {visualTitle}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-500">
              {visualSubtitle}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
