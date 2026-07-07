"use client";

import Link from "next/link";
import { ArrowRight, Cloud, Eye, RefreshCw, ShieldCheck, type LucideIcon } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";

const ICONS: Record<string, LucideIcon> = {
  refresh: RefreshCw,
  cloud: Cloud,
  eye: Eye,
  shield: ShieldCheck,
};

export default function ProductGrid() {
  const { language } = useLanguage();
  const { productGrid } = homeMarketingContent[language];

  return (
    <section className={`${marketingTheme.section.container} ${marketingTheme.section.spacingY}`}>
      <div className="text-center">
        <h2 className={marketingTheme.heading.section}>{productGrid.title}</h2>
        <p className={`${marketingTheme.heading.sectionSubtitle} mx-auto max-w-xl`}>
          {productGrid.subtitle}
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {productGrid.items.map((item) => {
          const Icon = ICONS[item.icon] ?? Cloud;
          return (
            <div
              key={item.name}
              className={`${marketingTheme.card.base} ${marketingTheme.card.hover} p-6`}
            >
              <div className={marketingTheme.iconBadge.base}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {item.name}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {item.description}
              </p>
              <Link
                href={item.href}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                {item.learnMore}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
