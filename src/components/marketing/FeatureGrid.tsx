"use client";

import { Layers, Globe, ShieldCheck, Zap, type LucideIcon } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";

const ICONS: Record<string, LucideIcon> = {
  layers: Layers,
  globe: Globe,
  shield: ShieldCheck,
  zap: Zap,
};

export default function FeatureGrid() {
  const { language } = useLanguage();
  const { featureGrid } = homeMarketingContent[language];

  return (
    <section className={marketingTheme.section.container}>
      <div className={`${marketingTheme.card.muted} grid gap-6 p-8 sm:grid-cols-2 lg:grid-cols-4 lg:p-10`}>
        {featureGrid.map((feature) => {
          const Icon = ICONS[feature.icon] ?? Layers;
          return (
            <div key={feature.title}>
              <div className={marketingTheme.iconBadge.base}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
