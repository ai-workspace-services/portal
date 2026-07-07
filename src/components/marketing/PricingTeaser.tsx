"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";

export default function PricingTeaser() {
  const { language } = useLanguage();
  const { pricingTeaser } = homeMarketingContent[language];

  return (
    <section className={marketingTheme.section.container}>
      <div className={`${marketingTheme.card.base} flex flex-col gap-8 p-8 sm:flex-row sm:items-center sm:justify-between lg:p-10`}>
        <div>
          <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {pricingTeaser.title}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            {pricingTeaser.description}
          </p>
          <Link
            href={pricingTeaser.cta.href}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            {pricingTeaser.cta.label}
          </Link>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {pricingTeaser.priceLabel}
            <span className="ml-1 text-base font-medium text-slate-400">
              {pricingTeaser.priceSuffix}
            </span>
          </div>
          <ul className="space-y-2">
            {pricingTeaser.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
