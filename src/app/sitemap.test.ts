import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/docsServiceClient", () => ({
  getBlogList: vi.fn(async () => ({
    page: 1,
    totalPages: 1,
    posts: [{ slug: "new/article", date: "2026-10-06" }],
  })),
  getDocCollections: vi.fn(async () => [
    { slug: "xworkmate", versions: [{ slug: "start" }] },
  ]),
}));

import sitemap from "./sitemap";

describe("generated public sitemap", () => {
  it("includes overview, canonical products, company resources and content details without accounts", async () => {
    const entries = await sitemap();
    const urls = entries.map(({ url }) => url);
    for (const route of [
      "/products",
      "/products/xworkmate",
      "/products/cloud-hub",
      "/contact",
      "/prices",
      "/blogs/new/article",
      "/docs/xworkmate/start",
    ])
      expect(urls).toContain(`https://xworktech.com${route}`);
    expect(new Set(urls).size).toBe(urls.length);
    expect(
      urls.some((url) => /\/(login|register|panel|api)(\/|$)/.test(url)),
    ).toBe(false);
  });
});
