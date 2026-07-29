import xcloudflow from "./xcloudflow";
import xconnect from "./xconnect";
import xscopehub from "./xscopehub";

export type EditionLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type Editions = {
  selfhost: EditionLink[];
  managed: EditionLink[];
  paygo: EditionLink[];
  saas: EditionLink[];
};

export type ProductConfig = {
  slug: string;
  name: string;
  title: string;
  title_en: string;
  tagline_zh: string;
  tagline_en: string;
  ogImage: string;
  repoUrl: string;
  docsQuickstart: string;
  docsApi: string;
  docsIssues: string;
  blogUrl: string;
  videosUrl: string;
  downloadUrl: string;
  editions: Editions;
  billing?: {
    paygo?: BillingPlan;
    saas?: BillingPlan;
  };
};

export type StripeBillingMode = "payment" | "subscription";

export type BillingPlan = {
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval?: string;
  planId?: string;
  stripePriceId?: string;
  mode: StripeBillingMode;
  meta?: Record<string, unknown>;
};

export function readPublicStripePrice(key: string): string {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
}

export const PRODUCT_LIST: ProductConfig[] = [xconnect, xscopehub, xcloudflow];

export const PRODUCT_MAP = new Map<string, ProductConfig>(
  PRODUCT_LIST.map((product) => [product.slug, product]),
);

export const getAllSlugs = (): string[] =>
  PRODUCT_LIST.map((product) => product.slug);
