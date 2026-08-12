"use client";

import {
  Cable,
  Check,
  ListChecks,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";

import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";
import { useLanguage } from "@/i18n/LanguageProvider";

const CAPABILITY_ICONS: Record<"plan" | "connect" | "deliver", LucideIcon> = {
  plan: ListChecks,
  connect: Cable,
  deliver: PackageCheck,
};

const CAPABILITY_STYLES = {
  plan: "bg-blue-50 text-blue-700 ring-blue-100",
  connect: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  deliver: "bg-cyan-50 text-cyan-700 ring-cyan-100",
} as const;

export default function CoreCapabilitiesSection() {
  const { language } = useLanguage();
  const content = homeMarketingContent[language].coreCapabilities;

  return (
    <section
      aria-labelledby="core-capabilities-title"
      className={`${marketingTheme.section.container} pb-16 sm:pb-24`}
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className={marketingTheme.heading.eyebrow}>{content.eyebrow}</p>
        <h2
          id="core-capabilities-title"
          className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl"
        >
          {content.title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          {content.description}
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {content.items.map((capability, index) => {
          const Icon = CAPABILITY_ICONS[capability.key];

          return (
            <article
              key={capability.key}
              className="flex min-h-[22rem] flex-col rounded-3xl border border-slate-900/10 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.06)] transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${CAPABILITY_STYLES[capability.key]}`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <span className="text-xs font-semibold tabular-nums text-slate-400">
                  0{index + 1}
                </span>
              </div>

              <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {capability.label}
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-slate-950">
                {capability.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {capability.description}
              </p>

              <ul className="mt-auto space-y-3 pt-8">
                {capability.evidence.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-sm font-medium text-slate-700"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
