"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";

export default function FinalCta() {
  const { language } = useLanguage();
  const { finalCta } = homeMarketingContent[language];

  return (
    <section className={`${marketingTheme.section.container} pb-16 sm:pb-20`}>
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-900/8 bg-slate-50 p-10 text-center">
        <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">
          {finalCta.title}
        </h3>
        <p className="max-w-md text-sm leading-relaxed text-slate-500">
          {finalCta.description}
        </p>
        <Link href={finalCta.cta.href} className={marketingTheme.cta.primary}>
          {finalCta.cta.label}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
