"use client";

import BoundaryLink from "@/components/common/BoundaryLink";
import { ArrowRight } from "lucide-react";

import { homeMarketingContent } from "@/components/marketing/content";
import HeroWorkspacePreview from "@/components/marketing/HeroWorkspacePreview";
import { useLanguage } from "@/i18n/LanguageProvider";
import { COMPANY_LEGAL_NAME } from "@/lib/company";

function renderTitle(title: string) {
  return title.split(/(AI)/g).map((part, index) =>
    part === "AI" ? (
      <span key={`${part}-${index}`} className="hero-title-accent">
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

export default function HeroSection() {
  const { language } = useLanguage();
  const hero = (homeMarketingContent[language] ?? homeMarketingContent.zh).hero;

  return (
    <section className="hero-shell">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-glow hero-glow-primary" aria-hidden="true" />
      <div className="hero-glow hero-glow-secondary" aria-hidden="true" />
      <div className="hero-container">
        <div className="hero-copy">
          <p className="hero-eyebrow">{hero.eyebrow}</p>
          <h1 className="hero-title">
            {hero.title.map((line) => (
              <span key={line} className="hero-title-line">
                {renderTitle(line)}
              </span>
            ))}
          </h1>
          <p className="hero-tagline">{hero.tagline}</p>
          <p className="hero-description">{hero.line}</p>
          <div className="hero-actions">
            <BoundaryLink
              href={hero.primaryCta.href}
              className="hero-button hero-button-primary"
            >
              {hero.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </BoundaryLink>
            <BoundaryLink
              href={hero.secondaryCta.href}
              className="hero-button hero-button-secondary"
            >
              {hero.secondaryCta.label}
            </BoundaryLink>
          </div>
          <p className="hero-attribution" data-testid="hero-company-attribution">
            {language === "zh" ? "由 " : "Built by "}
            <BoundaryLink href="/about">{COMPANY_LEGAL_NAME}</BoundaryLink>
            {language === "zh" ? " 开发与运营" : ""}
          </p>
        </div>
        <HeroWorkspacePreview />
      </div>
    </section>
  );
}
