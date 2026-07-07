"use client";

import { Globe, ShieldCheck, Users, Zap, type LucideIcon } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";

const ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  users: Users,
  shield: ShieldCheck,
  zap: Zap,
};

export default function StatsBar() {
  const { language } = useLanguage();
  const { statsBar } = homeMarketingContent[language];

  return (
    <section className={marketingTheme.section.container}>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {statsBar.map((stat) => {
          const Icon = ICONS[stat.icon] ?? Globe;
          return (
            <div key={stat.label} className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <div className={marketingTheme.iconBadge.base}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {stat.value}
              </div>
              <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
