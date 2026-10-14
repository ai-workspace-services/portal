import BoundaryLink from "@/components/common/BoundaryLink";
import { ArrowRight, Gift, Wallet } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { ReferralContent } from "@/lib/referral-content";

type ReferralPromoSectionProps = {
  content: ReferralContent;
  compact?: boolean;
};

/** A small, reusable campaign entry point for the homepage and XConnect page. */
export default function ReferralPromoSection({
  content,
  compact = false,
}: ReferralPromoSectionProps) {
  const { language } = useLanguage();
  const copy = content[language] ?? content.zh;
  const [cashback, extension] = copy.rewards.items;

  return (
    <section
      aria-labelledby="referral-promo-title"
      className={compact ? "px-4 py-14 sm:px-6 sm:py-20" : "px-4 py-16 sm:px-6 sm:py-24"}
    >
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-blue-200/80 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_52%,#eef2ff_100%)] p-6 shadow-[0_20px_60px_rgba(37,99,235,0.12)] sm:p-10 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
              {copy.hero.eyebrow}
            </p>
            <h2
              id="referral-promo-title"
              className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
            >
              {copy.hero.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              {copy.hero.subtitle}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {copy.hero.campaignWindow}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <BoundaryLink
                href={copy.hero.primaryCta.href}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
              >
                {copy.hero.primaryCta.label}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </BoundaryLink>
              <BoundaryLink
                href={copy.hero.secondaryCta.href}
                className="inline-flex items-center rounded-full border border-blue-200 bg-white/80 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-white"
              >
                {copy.hero.secondaryCta.label}
              </BoundaryLink>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-blue-100 bg-white/85 p-5">
              <Wallet className="h-5 w-5 text-blue-600" aria-hidden />
              <h3 className="mt-3 text-base font-semibold text-slate-950">
                {cashback.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{cashback.description}</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-white/85 p-5">
              <Gift className="h-5 w-5 text-indigo-600" aria-hidden />
              <h3 className="mt-3 text-base font-semibold text-slate-950">
                {extension.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{extension.description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
