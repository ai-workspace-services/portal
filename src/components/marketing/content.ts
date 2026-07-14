// Copy for the public marketing homepage ("/"). Kept separate from the
// shared i18n/translations.ts namespace (marketing.home) because that
// namespace is already consumed by unrelated components (ProductMatrix,
// ContactPanel, HeroBanner, etc.) — editing homepage copy here can never
// break those.
import type { Language } from "@/i18n/LanguageProvider";

export type NavLinkItem = {
  label: string;
  description: string;
  href: string;
};

export type NavDropdown = {
  label: string;
  columns: NavLinkItem[];
};

export type HomeMarketingContent = {
  brand: {
    name: string;
    tagline: string;
  };
  nav: {
    dropdowns: NavDropdown[];
    links: { label: string; href: string }[];
    login: string;
    enterConsole: string;
    logout: string;
  };
  hero: {
    title: string[];
    subtitle: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    visual: {
      eyebrow: string;
      title: string;
      subtitle: string;
      imageBasePath: string;
    };
    slides?: { src: string; width?: number; height?: number }[];
  };
  featureGrid: {
    icon: "layers" | "globe" | "shield" | "zap";
    title: string;
    description: string;
  }[];
  productGrid: {
    title: string;
    subtitle: string;
    items: {
      icon: "refresh" | "cloud" | "eye" | "shield";
      name: string;
      description: string;
      href: string;
      learnMore: string;
      slides?: { src: string; width?: number; height?: number }[];
    }[];
  };
  statsBar: {
    icon: "globe" | "users" | "shield" | "zap";
    value: string;
    label: string;
  }[];
  benefitList: {
    icon: "globe" | "activity" | "shield" | "zap";
    title: string;
    description: string;
  }[];
  inviteBanner: {
    title: string;
    description: string;
    inviteUrl: string;
    copyLabel: string;
    copiedLabel: string;
  };
  pricingTeaser: {
    title: string;
    description: string;
    priceLabel: string;
    priceSuffix: string;
    features: string[];
    cta: { label: string; href: string };
  };
  finalCta: {
    title: string;
    description: string;
    cta: { label: string; href: string };
  };
};

import generatedContent from "@/data/content/home-marketing.json";

export const homeMarketingContent: Record<Language, HomeMarketingContent> = generatedContent as unknown as Record<Language, HomeMarketingContent>;
