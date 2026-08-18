"use client";

import { Monitor, Smartphone, SquareStack } from "lucide-react";

import Carousel from "@/components/marketing/Carousel";
import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";
import { useLanguage } from "@/i18n/LanguageProvider";

const EDITION_ICONS = [Monitor, SquareStack, Smartphone];

export default function EditionsCarouselSection() {
  const { language } = useLanguage();
  const content = homeMarketingContent[language];
  const slides = content.hero.slides ?? [];

  return (
    <section
      aria-labelledby="editions-title"
      id="product-demo"
      className={`${marketingTheme.section.container} py-16 sm:py-24`}
    >
      <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
        <div>
          <p className={marketingTheme.heading.eyebrow}>
            {content.editions.eyebrow}
          </p>
          <h2
            id="editions-title"
            className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl"
          >
            {content.editions.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            {content.editions.description}
          </p>

          <div className="mt-8 grid grid-cols-3 gap-2">
            {slides.map((slide, index) => {
              const Icon = EDITION_ICONS[index] ?? Monitor;
              const label = slide.alt?.split(" ").slice(0, 2).join(" ");
              return (
                <div
                  key={slide.src}
                  className="rounded-2xl border border-slate-900/10 bg-white p-3 text-center shadow-sm"
                >
                  <Icon className="mx-auto h-5 w-5 text-primary" aria-hidden />
                  <span className="mt-2 block text-xs font-semibold text-slate-700">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-slate-100 p-2 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-3">
          <div className="aspect-[16/10] overflow-hidden rounded-[1.5rem]">
            <Carousel images={slides} autoSlideInterval={6000} />
          </div>
        </div>
      </div>
    </section>
  );
}
