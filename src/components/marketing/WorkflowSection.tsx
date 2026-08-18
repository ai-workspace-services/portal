"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";

import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";
import { useLanguage } from "@/i18n/LanguageProvider";

export default function WorkflowSection() {
  const { language } = useLanguage();
  const content = homeMarketingContent[language].workflow;

  return (
    <section
      aria-labelledby="workflow-title"
      className="border-y border-slate-900/8 bg-slate-50/80"
    >
      <div className={`${marketingTheme.section.container} py-16 sm:py-24`}>
        <div className="mx-auto max-w-3xl text-center">
          <p className={marketingTheme.heading.eyebrow}>{content.eyebrow}</p>
          <h2
            id="workflow-title"
            className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl"
          >
            {content.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            {content.description}
          </p>
        </div>

        <ol className="mt-10 grid gap-4 lg:grid-cols-4">
          {content.steps.map((step, index) => (
            <li key={step.key} className="relative">
              <article className="h-full rounded-3xl border border-slate-900/10 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {step.label}
                  </span>
                </div>
                <h3 className="mt-7 text-xl font-semibold tracking-[-0.02em] text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
                <div className="mt-6 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs font-medium leading-5 text-slate-500">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  {step.evidence}
                </div>
              </article>
              {index < content.steps.length - 1 && (
                <ArrowRight
                  className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-primary/50 lg:block"
                  aria-hidden
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
