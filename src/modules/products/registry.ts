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
};

export type StripeBillingMode = "payment" | "subscription";



export const PRODUCT_LIST: ProductConfig[] = [xconnect, xscopehub, xcloudflow];

export const PRODUCT_MAP = new Map<string, ProductConfig>(
  PRODUCT_LIST.map((product) => [product.slug, product]),
);

export const getAllSlugs = (): string[] =>
  PRODUCT_LIST.map((product) => product.slug);
