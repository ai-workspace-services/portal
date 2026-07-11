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
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[2rem] shadow-[0_28px_90px_rgba(15,23,42,0.12)]">
            <Carousel
              images={[
                "/marketing/xworkmate/已生成图像 1.png",
                "/marketing/xworkmate/已生成图像 2.png",
                "/marketing/xworkmate/已生成图像 3.png"
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
