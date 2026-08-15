"use client";

import { marketingTheme } from "@/components/marketing/theme";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  KeyRound,
  Layers,
  Power,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { WebsiteWizardPayload } from "@/lib/docsServiceClient";

interface ProductWizardProps {
  wizard: WebsiteWizardPayload;
  language?: string;
}

const STEP_ICONS = [Download, KeyRound, Power, Layers, Settings, Sparkles, Zap];

export default function ProductWizard({
  wizard,
  language = "zh",
}: ProductWizardProps) {
  if (!wizard || !wizard.steps || wizard.steps.length === 0) {
    return null;
  }

  const isEn = language === "en";

  return (
    <section className={`${marketingTheme.section.container} mt-20 sm:mt-28`}>
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {wizard.title}
        </h2>
        {wizard.description && (
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            {wizard.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {wizard.steps.map((s, idx) => {
          const StepIcon = STEP_ICONS[idx % STEP_ICONS.length] || CheckCircle2;
          return (
            <div
              key={idx}
              className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-200 group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                    STEP {s.step || idx + 1}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  {s.description}
                </p>
              </div>

              {s.platforms && (
                <div className="pt-3 border-t border-slate-100 mt-2">
                  <p className="text-xs text-indigo-600 font-medium leading-relaxed">
                    {s.platforms}
                  </p>
                </div>
              )}

              {s.link && (
                <div className="mt-3">
                  <Link
                    href={s.link}
                    className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    {isEn ? "Go to Link" : "前往了解"}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
