"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bot,
  Boxes,
  Cable,
  Cpu,
  FileOutput,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";
import {
  loadHomepageHeroAsset,
  resolveHomepageHeroImage,
  type HomepageHeroAsset,
} from "@/components/marketing/homeHeroAsset";

const NODE_ICONS: Record<
  "models" | "agents" | "tools" | "workspace" | "artifacts",
  LucideIcon
> = {
  models: Cpu,
  agents: Bot,
  tools: Cable,
  workspace: Boxes,
  artifacts: FileOutput,
};

const NODE_POSITIONS = {
  models: "left-1/2 top-0 -translate-x-1/2",
  agents: "left-0 top-1/2 -translate-y-1/2",
  tools: "right-0 top-1/2 -translate-y-1/2",
  workspace: "bottom-0 left-8",
  artifacts: "bottom-0 right-8",
} as const;

function WorkspaceNode({
  node,
}: {
  node: {
    key: "models" | "agents" | "tools" | "workspace" | "artifacts";
    label: string;
    items: string[];
  };
}) {
  const Icon = NODE_ICONS[node.key];

  return (
    <div
      className={`absolute z-20 hidden w-36 rounded-2xl border border-slate-900/10 bg-white/95 p-3 shadow-[0_12px_35px_rgba(15,23,42,0.12)] backdrop-blur-sm lg:block ${NODE_POSITIONS[node.key]}`}
      title={node.items.join(" · ")}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        {node.label}
      </div>
      <p className="mt-2 line-clamp-2 text-[0.65rem] leading-4 text-slate-500">
        {node.items.join(" · ")}
      </p>
    </div>
  );
}

export default function HeroSection() {
  const { language } = useLanguage();
  const content = homeMarketingContent[language] || homeMarketingContent.zh || homeMarketingContent.en;
  const hero = content?.hero || homeMarketingContent.zh?.hero;
  const visual = hero?.visual || homeMarketingContent.zh?.hero?.visual;
  const [asset, setAsset] = useState<HomepageHeroAsset>({});

  useEffect(() => {
    let active = true;
    loadHomepageHeroAsset(language).then((nextAsset) => {
      if (active) {
        setAsset(nextAsset);
      }
    });
    return () => {
      active = false;
    };
  }, [language]);

  const imageUrl =
    (asset.imageUrl ??
      (visual?.imageBasePath
        ? resolveHomepageHeroImage(visual.imageBasePath, asset.version)
        : "")) ||
    visual?.imageUrl ||
    "";
  const visualTitle = asset.title ?? visual?.title ?? "";
  const visualSubtitle = asset.subtitle ?? visual?.subtitle ?? "";
  const visualEyebrow = asset.eyebrow ?? visual?.eyebrow ?? "";
  const connectionNodes = visual?.connectionNodes ?? [];
  const productPills = visual?.productPills ?? [];

  return (
    <section
      className={`${marketingTheme.section.container} pb-16 pt-14 sm:pb-20 sm:pt-20 lg:pt-24`}
    >
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
            {hero.eyebrow}
          </div>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.5rem]">
            {hero.title.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {hero.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={hero.primaryCta.href}
              className={marketingTheme.cta.primary}
            >
              {hero.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={hero.secondaryCta.href}
              className={marketingTheme.cta.secondary}
            >
              {hero.secondaryCta.label}
            </Link>
          </div>
        </div>

        <figure className="mx-auto w-full max-w-[42rem]">
          <div className="relative px-0 py-0 lg:px-10 lg:py-10">
            {connectionNodes.map((node) => (
              <WorkspaceNode key={node.key} node={node} />
            ))}
            <ArrowDown
              className="pointer-events-none absolute left-1/2 top-5 hidden h-5 w-5 -translate-x-1/2 text-primary/35 lg:block"
              aria-hidden
            />
            <ArrowRight
              className="pointer-events-none absolute left-28 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-primary/35 lg:block"
              aria-hidden
            />
            <ArrowLeft
              className="pointer-events-none absolute right-28 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-primary/35 lg:block"
              aria-hidden
            />
            <ArrowDown
              className="pointer-events-none absolute bottom-5 left-1/2 hidden h-5 w-5 -translate-x-1/2 rotate-180 text-primary/35 lg:block"
              aria-hidden
            />
            <div className="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-slate-50 shadow-[0_28px_90px_rgba(15,23,42,0.12)]">
              <img
                src={encodeURI(imageUrl)}
                alt={visual.alt}
                width={1536}
                height={1024}
                className="aspect-[3/2] h-auto w-full object-cover"
              />
            </div>
          </div>
          <figcaption className="mt-5 flex items-start gap-3 px-2">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {visualEyebrow}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {visualTitle}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {visualSubtitle}
              </p>
              {productPills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {productPills.map((pill) => (
                    <span
                      key={pill}
                      className="rounded-full border border-slate-900/10 bg-slate-50 px-2.5 py-1 text-[0.65rem] font-semibold text-slate-600"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
