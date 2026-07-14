"use client";

import { Globe, ShieldCheck, Users, Zap, RefreshCw, Eye, type LucideIcon } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";

const ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  users: Users,
  shield: ShieldCheck,
  zap: Zap,
  refresh: RefreshCw,
  eye: Eye,
};

export default function StatsBar() {
  const { language } = useLanguage();
  const { statsBar } = homeMarketingContent[language];

  return (
    <section className={marketingTheme.section.container}>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {statsBar.map((stat) => {
          const Icon = ICONS[stat.icon] ?? Globe;
          return (
            <div key={stat.label} className="flex flex-col items-center text-center sm:items-start sm:text-left rounded-2xl border border-slate-900/8 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className={marketingTheme.iconBadge.base}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="mt-4 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {stat.value}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
