"use client";

import BoundaryLink from "@/components/common/BoundaryLink";
import { Github } from "@/components/icons/brand";
import { ArrowRight, Building2, Mail, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import {
  COMPANY_LEGAL_NAME,
  COMPANY_GITHUB_URL,
  COMPANY_SUPPORT_EMAIL,
} from "@/lib/company";

export default function BuiltByBadge() {
  const { language } = useLanguage();
  const isChinese = language === "zh";

  return (
    <section
      data-testid="built-by-xwork-section"
      aria-label="Company Identity"
      className="mx-auto my-12 w-full max-w-6xl px-4 sm:px-6 lg:px-8"
    >
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {isChinese ? "公司信息" : "Company"}
                </span>
                <span className="text-xs text-slate-500">
                  © 2026 {COMPANY_LEGAL_NAME}
                </span>
              </div>
              <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {isChinese ? "由 " : "Built by "}
                <BoundaryLink
                  href="/about"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {COMPANY_LEGAL_NAME}
                </BoundaryLink>
                {isChinese ? " 开发与运营" : ""}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {isChinese
                  ? "连接模型、智能体、工具与数据，构建下一代开放、安全且云中立的 AI 工作空间。"
                  : "Connecting models, agents, tools, and data into open, secure, cloud-neutral AI workspaces."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <BoundaryLink
              href="/about"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {isChinese ? "关于我们" : "About Us"}
            </BoundaryLink>
            <BoundaryLink
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              {isChinese ? "联系我们" : "Contact"}
            </BoundaryLink>
            <a
              href={COMPANY_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
              GitHub
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
