"use client";

import { Activity, Globe, ShieldCheck, Zap, type LucideIcon } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";

const ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  activity: Activity,
  shield: ShieldCheck,
  zap: Zap,
};

export default function BenefitList() {
  const { language } = useLanguage();
  const { benefitList } = homeMarketingContent[language];

  return (
    <section className={`${marketingTheme.section.container} ${marketingTheme.section.spacingY} space-y-10`}>
      {benefitList.map((benefit, index) => {
        const Icon = ICONS[benefit.icon] ?? Globe;
        const reversed = index % 2 === 1;
        return (
          <div
            key={benefit.title}
            className={`grid items-center gap-8 sm:grid-cols-2 ${reversed ? "sm:[&>*:first-child]:order-2" : ""}`}
          >
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-primary/5">
              <div className="absolute h-40 w-40 rounded-full border border-primary/15" aria-hidden />
              <div className="absolute h-28 w-28 rounded-full border border-primary/15" aria-hidden />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Icon className="h-9 w-9 text-primary" aria-hidden />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">
                {benefit.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
                {benefit.description}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
