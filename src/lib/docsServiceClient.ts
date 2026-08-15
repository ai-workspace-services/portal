import "server-only";

import { headers } from "next/headers";

import { buildInternalServiceHeaders } from "@/server/internalServiceAuth";
import { getDocsServiceBaseUrl } from "@server/serviceConfig";

export type DocsHomePayload = {
  title: string;
  description: string;
  html: string;
};

export type DocVersionPayload = {
  slug: string;
  label: string;
  title: string;
  description: string;
  updatedAt?: string;
  tags: string[];
  markdown?: string;
  plaintext?: string;
  sourcePath?: string;
  editUrl?: string;
  html: string;
  toc: Array<{ level: number; title: string; anchor: string }>;
  category?: string;
  language?: string;
};

export type DocCollectionPayload = {
  slug: string;
  title: string;
  description: string;
  updatedAt?: string;
  tags: string[];
  versions: DocVersionPayload[];
  defaultVersionSlug: string;
  entryHref?: string;
  articleCount?: number;
  category?: string;
};

export type DocPagePayload = {
  collection: DocCollectionPayload;
  version: DocVersionPayload;
  breadcrumbs: Array<{ label: string; href: string }>;
};

export type DocSearchHitPayload = {
  kind: "doc";
  slug: string;
  title: string;
  excerpt: string;
  sourcePath?: string;
  plaintext?: string;
  collection?: string;
  href: string;
};

export type BlogCategoryPayload = {
  key: string;
  label: string;
};

export type BlogPostPayload = {
  slug: string;
  title: string;
  author?: string;
  date?: string;
  tags: string[];
  excerpt: string;
  html: string;
  toc: Array<{ level: number; title: string; anchor: string }>;
  category?: BlogCategoryPayload;
  language?: string;
  sourcePath: string;
  plaintext?: string;
};

export type BlogListPayload = {
  posts: BlogPostPayload[];
  categories: BlogCategoryPayload[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type WebsiteCTA = {
  label: string;
  href: string;
};

export type WebsiteHeroPayload = {
  badge: string;
  title: string;
  subtitle: string;
  cta: WebsiteCTA;
  downloadUrl?: string;
  supportedPlatforms?: string;
};

export type WebsiteWizardStepPayload = {
  step: number;
  title: string;
  description: string;
  platforms?: string;
  link?: string;
};

export type WebsiteWizardPayload = {
  title: string;
  description: string;
  steps: WebsiteWizardStepPayload[];
};

export type WebsiteShowcasePayload = {
  title: string;
  description: string;
  icon?: string;
  image: string;
  reverse?: boolean;
};

export type WebsiteProductPayload = {
  slug: string;
  language: string;
  hero: WebsiteHeroPayload;
  wizard?: WebsiteWizardPayload;
  showcases: WebsiteShowcasePayload[];
  sourcePath?: string;
  updatedAt?: string;
};

export type WebsiteProductSummaryPayload = {
  slug: string;
  title: string;
  badge: string;
  subtitle: string;
  language: string;
  href: string;
};

async function detectLanguage(): Promise<"zh" | "en"> {
  const store = await headers();
  const preferred =
    store.get("x-language") ?? store.get("accept-language") ?? "";
  return preferred.toLowerCase().includes("zh") ? "zh" : "en";
}

async function request<T>(path: string): Promise<T> {
  const baseUrl = getDocsServiceBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers: buildInternalServiceHeaders({
      Accept: "application/json",
    }),
  });

  if (!response.ok) {
    throw new Error(`docs service request failed: ${response.status} ${path}`);
  }

  return (await response.json()) as T;
}

export async function getDocsHome(): Promise<DocsHomePayload> {
  const lang = await detectLanguage();
  return request<DocsHomePayload>(`/api/v1/docs/home?lang=${lang}`);
}

export async function getDocCollections(): Promise<DocCollectionPayload[]> {
  const lang = await detectLanguage();
  return request<DocCollectionPayload[]>(
    `/api/v1/docs/collections?lang=${lang}`,
  );
}

export async function getDocPage(
  collection: string,
  slug: string,
): Promise<DocPagePayload> {
  const lang = await detectLanguage();
  return request<DocPagePayload>(
    `/api/v1/docs/pages/${collection}/${slug}?lang=${lang}`,
  );
}

export async function searchDocs(
  query: string,
  limit = 10,
): Promise<DocSearchHitPayload[]> {
  const lang = await detectLanguage();
  const search = new URLSearchParams({
    lang,
    query,
    limit: String(limit),
  });
  return request<DocSearchHitPayload[]>(
    `/api/v1/docs/search?${search.toString()}`,
  );
}

export async function getBlogList(params?: {
  page?: number;
  pageSize?: number;
  category?: string;
  query?: string;
}): Promise<BlogListPayload> {
  const lang = await detectLanguage();
  const search = new URLSearchParams();
  search.set("lang", lang);
  search.set("page", String(params?.page ?? 1));
  search.set("pageSize", String(params?.pageSize ?? 10));
  if (params?.category) search.set("category", params.category);
  if (params?.query) search.set("query", params.query);
  return request<BlogListPayload>(`/api/v1/blogs?${search.toString()}`);
}

export async function getBlogPost(slug: string): Promise<BlogPostPayload> {
  const lang = await detectLanguage();
  return request<BlogPostPayload>(`/api/v1/blogs/${slug}?lang=${lang}`);
}

export async function getLatestBlogPosts(
  limit = 7,
): Promise<BlogPostPayload[]> {
  const lang = await detectLanguage();
  return request<BlogPostPayload[]>(
    `/api/v1/home/latest-blogs?lang=${lang}&limit=${limit}`,
  );
}

export async function getProducts(
  langOverride?: "zh" | "en",
): Promise<WebsiteProductSummaryPayload[]> {
  const lang = langOverride || (await detectLanguage());
  try {
    return await request<WebsiteProductSummaryPayload[]>(
      `/api/v1/products?lang=${lang}`,
    );
  } catch (error) {
    console.warn("Failed to fetch products from content-service", error);
    return [];
  }
}

export async function getProduct(
  slug: string,
  langOverride?: "zh" | "en",
): Promise<WebsiteProductPayload | null> {
  const lang = langOverride || (await detectLanguage());
  try {
    return await request<WebsiteProductPayload>(
      `/api/v1/products/${slug}?lang=${lang}`,
    );
  } catch (error) {
    console.warn(`Failed to fetch product ${slug} from content-service`, error);
    return null;
  }
}

export async function getWebsiteHomepage(
  langOverride?: "zh" | "en",
): Promise<any | null> {
  const lang = langOverride || (await detectLanguage());
  try {
    return await request<any>(`/api/v1/website/homepage?lang=${lang}`);
  } catch (error) {
    console.warn("Failed to fetch homepage marketing from content-service", error);
    return null;
  }
}

