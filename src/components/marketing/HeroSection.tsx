"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";
import { useLanguage } from "@/i18n/LanguageProvider";

type AiBrand = {
  name: string;
  logo: string;
};

const aiBrands: AiBrand[] = [
  { name: "OpenAI", logo: "/marketing/ai-logos/openai.svg" },
  { name: "Codex", logo: "/marketing/ai-logos/codex-color.svg" },
  { name: "Claude Code", logo: "/marketing/ai-logos/claude-color.svg" },
  { name: "Gemini", logo: "/marketing/ai-logos/gemini-color.svg" },
  { name: "Grok", logo: "/marketing/ai-logos/grok.svg" },
  { name: "DeepSeek", logo: "/marketing/ai-logos/deepseek-color.svg" },
  { name: "GLM", logo: "/marketing/ai-logos/glm-official.svg" },
  { name: "MiniMax", logo: "/marketing/ai-logos/minimax-color.svg" },
  { name: "Kimi", logo: "/marketing/ai-logos/kimi-official.png" },
  { name: "Qwen", logo: "/marketing/ai-logos/qwen-color.svg" },
  { name: "Mistral", logo: "/marketing/ai-logos/mistral-color.svg" },
];

function AiLogoRow({ label }: { label: string }) {
  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-primary">
        <Sparkles className="h-4 w-4" aria-hidden />
        {label}
      </div>
      <div className="-mx-6 overflow-x-auto px-6 pb-1 sm:mx-0 sm:px-0">
        <ul className="mx-auto flex min-w-max items-center justify-center gap-5 sm:gap-6" aria-label={label}>
          {aiBrands.map((brand) => (
            <li key={brand.name}>
              <Image
                src={brand.logo}
                alt={brand.name}
                width={48}
                height={48}
                className="h-9 w-9 object-contain transition duration-200 hover:scale-110 sm:h-12 sm:w-12"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const { language } = useLanguage();
  const content =
    homeMarketingContent[language] ||
    homeMarketingContent.zh ||
    homeMarketingContent.en;
  const hero = content.hero;

  return (
    <section className="relative overflow-hidden border-b border-slate-100 bg-white">
      <div
        className={`${marketingTheme.section.container} relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-start pb-16 pt-20 text-center sm:pb-20 sm:pt-28 lg:pt-32`}
      >
        <AiLogoRow label={hero.logoLabel} />

        <div className="mt-8 max-w-5xl sm:mt-9">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
            {hero.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.04] tracking-[-0.05em] text-slate-950 sm:text-6xl lg:text-[5.35rem]">
            {hero.title.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-xl sm:leading-8">
            {hero.subtitle}
          </p>
        </div>

        <div className="mt-7 flex flex-col items-center">
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={hero.primaryCta.href}
              className={`${marketingTheme.cta.primary} min-w-40 px-7 py-3.5 text-base shadow-[0_12px_30px_rgba(37,99,235,0.22)]`}
            >
              {hero.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={hero.secondaryCta.href}
              className={`${marketingTheme.cta.secondary} min-w-40 px-7 py-3.5 text-base`}
            >
              {hero.secondaryCta.label}
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-400">{hero.trialNote}</p>
        </div>
      </div>
    </section>
  );
}
