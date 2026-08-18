"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";
import { useLanguage } from "@/i18n/LanguageProvider";

export default function ProofSection() {
  const { language } = useLanguage();
  const content = homeMarketingContent[language].proof;

  return (
    <section
      aria-labelledby="proof-title"
      className="border-y border-slate-900/8 bg-slate-50/80"
    >
      <div className={`${marketingTheme.section.container} py-16 sm:py-24`}>
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
          <div>
            <p className={marketingTheme.heading.eyebrow}>{content.eyebrow}</p>
            <h2
              id="proof-title"
              className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl"
            >
              {content.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              {content.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {content.facts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-3xl border border-slate-900/10 bg-white p-6 shadow-sm"
              >
                <p className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  {fact.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {fact.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-slate-900/10 pt-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
            {language === "zh"
              ? "查看真实产品入口"
              : "Inspect the real product surfaces"}
          </p>
          {content.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-[var(--color-primary-hover)]"
            >
              {link.label}
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
