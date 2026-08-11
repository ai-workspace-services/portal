"use client";

import {
  Cable,
  KeyRound,
  LockKeyhole,
  ServerCog,
  type LucideIcon,
} from "lucide-react";

import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";
import { useLanguage } from "@/i18n/LanguageProvider";

const CONTROL_ICONS: Record<
  "security" | "permissions" | "connections" | "deployment",
  LucideIcon
> = {
  security: LockKeyhole,
  permissions: KeyRound,
  connections: Cable,
  deployment: ServerCog,
};

export default function ControlPlaneSection() {
  const { language } = useLanguage();
  const content = homeMarketingContent[language].controls;

  return (
    <section
      aria-labelledby="control-plane-title"
      className={`${marketingTheme.section.container} py-16 sm:py-24`}
    >
      <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
        <div>
          <p className={marketingTheme.heading.eyebrow}>{content.eyebrow}</p>
          <h2
            id="control-plane-title"
            className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl"
          >
            {content.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            {content.description}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {content.items.map((item) => {
            const Icon = CONTROL_ICONS[item.key];
            return (
              <article
                key={item.key}
                className="rounded-3xl border border-slate-900/10 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.02em] text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
                <p className="mt-5 border-t border-slate-100 pt-4 text-xs font-semibold leading-5 text-primary">
                  {item.evidence}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
