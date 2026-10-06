import type { MetadataRoute } from "next";

import type {
  BlogListPayload,
  BlogPostPayload,
  DocCollectionPayload,
} from "./docsServiceClient";

export async function collectBlogPages(
  loadPage: (page: number) => Promise<BlogListPayload>,
): Promise<BlogPostPayload[]> {
  const first = await loadPage(1);
  if (
    !Number.isInteger(first.totalPages) ||
    first.totalPages < 0 ||
    first.totalPages > 500
  )
    throw new Error("Invalid sitemap blog pagination");
  const posts = [...first.posts];
  for (let page = 2; page <= first.totalPages; page++) {
    const result = await loadPage(page);
    if (result.page !== page || !result.posts.length)
      throw new Error("Incomplete sitemap blog pagination");
    posts.push(...result.posts);
  }
  return posts;
}

export function publicSlugPath(slug: string): string {
  const parts = slug.split("/");
  if (parts.some((part) => !part || part === "." || part === ".."))
    throw new Error("Invalid public content slug");
  return parts.map(encodeURIComponent).join("/");
}

function validDate(raw?: string): Date | undefined {
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

export function catalogEntries(
  origin: string,
  posts: BlogPostPayload[],
  collections: DocCollectionPayload[],
): MetadataRoute.Sitemap {
  return [
    ...posts.map((post) => ({
      url: `${origin}/blogs/${publicSlugPath(post.slug)}`,
      lastModified: validDate(post.date),
    })),
    ...collections.flatMap((collection) =>
      collection.versions.map((version) => ({
        url: `${origin}/docs/${publicSlugPath(collection.slug)}/${publicSlugPath(version.slug)}`,
        lastModified: validDate(version.updatedAt ?? collection.updatedAt),
      })),
    ),
  ];
}
