import type { MetadataRoute } from "next";

import {
  publicDiscovery,
  publicProductRoutes,
} from "@/data/content/public-discovery";
import { COMPANY_SITE_URL } from "@/lib/company";
import { getBlogList, getDocCollections } from "@/lib/docsServiceClient";
import { catalogEntries, collectBlogPages } from "@/lib/public-sitemap";

// Runtime credentials for content-service are not necessarily present during
// the image build. Never bake an empty build-time catalog into the sitemap.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = [
    "/",
    ...publicDiscovery.resources.map(({ href }) => href),
    ...publicProductRoutes,
  ];
  const entries: MetadataRoute.Sitemap = [...new Set(paths)].map((route) => ({
    url: `${COMPANY_SITE_URL}${route}`,
  }));
  // Content archives stay in content-service, not in the Portal image.
  const [posts, collections] = await Promise.all([
    collectBlogPages((page) =>
      getBlogList({ page, pageSize: 100, lang: "default" }),
    ).catch((error) => {
      console.warn("Sitemap blog catalog unavailable", error);
      return [];
    }),
    Promise.all([getDocCollections("zh"), getDocCollections("en")])
      .then((results) => results.flat())
      .catch((error) => {
        console.warn("Sitemap documentation catalog unavailable", error);
        return [];
      }),
  ]);
  entries.push(...catalogEntries(COMPANY_SITE_URL, posts, collections));
  return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
}
