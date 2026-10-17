import { describe, expect, it, vi } from "vitest";

import type {
  BlogListPayload,
  BlogPostPayload,
  DocCollectionPayload,
} from "./docsServiceClient";
import {
  catalogEntries,
  collectBlogPages,
  publicSlugPath,
} from "./public-sitemap";

describe("public sitemap", () => {
  it("collects every page instead of truncating the blog catalog", async () => {
    const load = vi.fn(
      async (page: number) =>
        ({
          page,
          totalPages: 3,
          posts: [{ slug: `post-${page}` }],
        }) as BlogListPayload,
    );
    const posts = await collectBlogPages(load);
    expect(posts.map((post) => post.slug)).toEqual([
      "post-1",
      "post-2",
      "post-3",
    ]);
    expect(load).toHaveBeenCalledTimes(3);
  });
  it("rejects broken or unbounded pagination", async () => {
    await expect(
      collectBlogPages(async () => ({ totalPages: 501 }) as BlogListPayload),
    ).rejects.toThrow();
    await expect(
      collectBlogPages(
        async (page) =>
          ({ page, totalPages: 2, posts: [] }) as unknown as BlogListPayload,
      ),
    ).rejects.toThrow();
  });
  it("includes nested article and document routes with only valid source dates", () => {
    const entries = catalogEntries(
      "https://xworktech.com",
      [{ slug: "topic/中文", date: "invalid" } as BlogPostPayload],
      [
        {
          slug: "xworkmate",
          versions: [{ slug: "guide/start", updatedAt: "2026-10-06" }],
        } as DocCollectionPayload,
      ],
    );
    expect(entries[0].url).toBe(
      "https://xworktech.com/blogs/topic/%E4%B8%AD%E6%96%87",
    );
    expect(entries[0].lastModified).toBeUndefined();
    expect(entries[1].url).toBe(
      "https://xworktech.com/docs/xworkmate/guide/start",
    );
    expect(entries[1].lastModified).toEqual(new Date("2026-10-06"));
    expect(() => publicSlugPath("../panel")).toThrow();
  });
});
