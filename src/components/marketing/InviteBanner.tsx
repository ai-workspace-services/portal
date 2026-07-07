"use client";

import { useState } from "react";
import { Check, Copy, Gift, Link2 } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";

export default function InviteBanner() {
  const { language } = useLanguage();
  const { inviteBanner } = homeMarketingContent[language];
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteBanner.inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — no-op.
    }
  }

  return (
    <section className={marketingTheme.section.container}>
      <div className={`${marketingTheme.darkPanel.base} flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between lg:p-10`}>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
            <Link2 className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{inviteBanner.title}</h3>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-300">
              {inviteBanner.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-white/5 p-1.5 pl-4">
          <span className="min-w-0 flex-1 truncate text-sm text-slate-300 sm:min-w-[220px]">
            {inviteBanner.inviteUrl}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <Copy className="h-4 w-4" aria-hidden />
            )}
            {copied ? inviteBanner.copiedLabel : inviteBanner.copyLabel}
          </button>
        </div>

        <Gift className="hidden h-16 w-16 text-primary/60 lg:block" aria-hidden />
      </div>
    </section>
  );
}
