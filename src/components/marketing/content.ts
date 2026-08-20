// Copy for the public marketing homepage ("/"). Kept separate from the
// shared i18n/translations.ts namespace (marketing.home) because that
// namespace is already consumed by unrelated components (ProductMatrix,
// ContactPanel, HeroBanner, etc.) — editing homepage copy here can never
// break those.
//
// The portal serves two brands from the same routes and layout; each brand
// carries its own per-language copy set (see siteBrand.ts for how the brand
// is resolved from the hostname).
import type { Language } from "@/i18n/LanguageProvider";
import type { SiteBrand } from "@/lib/siteBrand";

export type NavLinkItem = {
  label: string;
  description: string;
  href: string;
};

export type NavDropdown = {
  label: string;
  columns: NavLinkItem[];
};

export type ProductGridItemIcon =
  | "refresh"
  | "cloud"
  | "eye"
  | "shield"
  | "console"
  | "gateway"
  | "api"
  | "billing"
  | "accounts"
  | "deploy";

export type StatsBarIcon = "globe" | "users" | "shield" | "zap" | "refresh" | "eye";

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
      icon: ProductGridItemIcon;
      name: string;
      description: string;
      href: string;
      learnMore: string;
      slides?: { src: string; width?: number; height?: number }[];
    }[];
  };
  statsBar: {
    icon: StatsBarIcon;
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

import { homeMarketingContentData } from "@/data/content/home-marketing";

export const homeMarketingContent: Record<
  SiteBrand,
  Record<Language, HomeMarketingContent>
> = homeMarketingContentData as any;
