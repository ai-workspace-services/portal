import "server-only";

import { buildInternalServiceHeaders } from "@/server/internalServiceAuth";
import { getContentLanguage, type ContentLanguage } from "@server/contentLanguage";
import { getDocsServiceBaseUrl } from "@server/serviceConfig";

// Cache tags let a single revalidation invalidate a whole content family
// instead of a page at a time.
export const CONTENT_CACHE_TAGS = {
  all: "content",
  docs: "content:docs",
  blogs: "content:blogs",
  products: "content:products",
  website: "content:website",
} as const;

// The content service rebuilds its snapshot from git on a timer
// (DOCS_RELOAD_INTERVAL, 5m by default), so revalidating faster than that only
// buys extra requests, not fresher content. `CONTENT_REVALIDATE_SECONDS` keeps
// the two intervals aligned from one place; `0` restores uncached fetches.
const REVALIDATE_SECONDS = readRevalidateSeconds();

function readRevalidateSeconds(): number {
  const raw = Number.parseInt((process.env.CONTENT_REVALIDATE_SECONDS || "").trim(), 10);
  if (Number.isFinite(raw) && raw >= 0) return raw;
  return 300;
}

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

async function detectLanguage(): Promise<ContentLanguage> {
  return getContentLanguage();
}

type RequestOptions = {
  /** Cache tags to attach, on top of the always-present `content` tag. */
  tags?: string[];
  /** Override the shared revalidation window, in seconds. */
  revalidate?: number;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getDocsServiceBaseUrl();
  const revalidate = options.revalidate ?? REVALIDATE_SECONDS;
  const response = await fetch(`${baseUrl}${path}`, {
    ...(revalidate > 0
      ? { next: { revalidate, tags: [CONTENT_CACHE_TAGS.all, ...(options.tags ?? [])] } }
      : { cache: "no-store" as const }),
    headers: buildInternalServiceHeaders({
      Accept: "application/json",
    }),
  });

  if (!response.ok) {
    throw new Error(`docs service request failed: ${response.status} ${path}`);
  }

  return (await response.json()) as T;
}

export async function getDocsHome(
  langOverride?: ContentLanguage,
): Promise<DocsHomePayload> {
  const lang = langOverride || (await detectLanguage());
  return request<DocsHomePayload>(`/api/v1/docs/home?lang=${lang}`, {
    tags: [CONTENT_CACHE_TAGS.docs],
  });
}

export async function getDocCollections(
  langOverride?: ContentLanguage,
): Promise<DocCollectionPayload[]> {
  const lang = langOverride || (await detectLanguage());
  return request<DocCollectionPayload[]>(`/api/v1/docs/collections?lang=${lang}`, {
    tags: [CONTENT_CACHE_TAGS.docs],
  });
}

export async function getDocPage(
  collection: string,
  slug: string,
  langOverride?: ContentLanguage,
): Promise<DocPagePayload> {
  const lang = langOverride || (await detectLanguage());
  return request<DocPagePayload>(`/api/v1/docs/pages/${collection}/${slug}?lang=${lang}`, {
    tags: [CONTENT_CACHE_TAGS.docs],
  });
}

export async function searchDocs(
  query: string,
  limit = 10,
  langOverride?: ContentLanguage,
): Promise<DocSearchHitPayload[]> {
  const lang = langOverride || (await detectLanguage());
  const search = new URLSearchParams({
    lang,
    query,
    limit: String(limit),
  });
  // Search keys are unbounded and already only reachable from a dynamic API
  // route, so caching them would fill the store without ever being reused.
  return request<DocSearchHitPayload[]>(`/api/v1/docs/search?${search.toString()}`, {
    revalidate: 0,
  });
}

export async function getBlogList(params?: {
  page?: number;
  pageSize?: number;
  category?: string;
  query?: string;
  lang?: ContentLanguage;
}): Promise<BlogListPayload> {
  const lang = params?.lang || (await detectLanguage());
  const search = new URLSearchParams();
  search.set("lang", lang);
  search.set("page", String(params?.page ?? 1));
  search.set("pageSize", String(params?.pageSize ?? 10));
  if (params?.category) search.set("category", params.category);
  if (params?.query) search.set("query", params.query);
  return request<BlogListPayload>(`/api/v1/blogs?${search.toString()}`, {
    // A free-text query is per visitor; only the browsable listings are cached.
    ...(params?.query ? { revalidate: 0 } : { tags: [CONTENT_CACHE_TAGS.blogs] }),
  });
}

export async function getBlogPost(
  slug: string,
  langOverride?: ContentLanguage,
): Promise<BlogPostPayload> {
  const lang = langOverride || (await detectLanguage());
  return request<BlogPostPayload>(`/api/v1/blogs/${slug}?lang=${lang}`, {
    tags: [CONTENT_CACHE_TAGS.blogs],
  });
}

export async function getLatestBlogPosts(
  limit = 7,
  langOverride?: ContentLanguage,
): Promise<BlogPostPayload[]> {
  const lang = langOverride || (await detectLanguage());
  return request<BlogPostPayload[]>(`/api/v1/home/latest-blogs?lang=${lang}&limit=${limit}`, {
    tags: [CONTENT_CACHE_TAGS.blogs],
  });
}

export async function getProducts(
  langOverride?: ContentLanguage,
): Promise<WebsiteProductSummaryPayload[]> {
  const lang = langOverride || (await detectLanguage());
  try {
    return await request<WebsiteProductSummaryPayload[]>(`/api/v1/products?lang=${lang}`, {
      tags: [CONTENT_CACHE_TAGS.products],
    });
  } catch (error) {
    console.warn("Failed to fetch products from content-service", error);
    return [];
  }
}

export async function getProduct(
  slug: string,
  langOverride?: ContentLanguage,
): Promise<WebsiteProductPayload | null> {
  const lang = langOverride || (await detectLanguage());
  try {
    return await request<WebsiteProductPayload>(`/api/v1/products/${slug}?lang=${lang}`, {
      tags: [CONTENT_CACHE_TAGS.products],
    });
  } catch (error) {
    console.warn(`Failed to fetch product ${slug} from content-service`, error);
    return null;
  }
}

export async function getWebsiteHomepage(
  langOverride?: ContentLanguage,
): Promise<any | null> {
  const lang = langOverride || (await detectLanguage());
  try {
    return await request<any>(`/api/v1/website/homepage?lang=${lang}`, {
      tags: [CONTENT_CACHE_TAGS.website],
    });
  } catch (error) {
    console.warn("Failed to fetch homepage marketing from content-service", error);
    return null;
  }
}

