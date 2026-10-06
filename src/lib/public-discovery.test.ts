import { describe, expect, it } from "vitest";

import {
  publicDiscovery,
  publicProductRoutes,
} from "../data/content/public-discovery";
import {
  llmsIndex,
  productMarkdown,
  validateDiscovery,
} from "./public-discovery";

describe("public discovery content", () => {
  it("validates bilingual public facts and actual product routes", () => {
    expect(() => validateDiscovery(publicDiscovery)).not.toThrow();
    for (const product of publicDiscovery.products)
      expect(publicProductRoutes).toContain(`/products/${product.slug}`);
  });
  it("rejects private resources, duplicate products and missing translations", () => {
    const privateResource = structuredClone(publicDiscovery);
    privateResource.resources[0].href = "/api/auth/session";
    expect(() => validateDiscovery(privateResource)).toThrow();
    const duplicate = structuredClone(publicDiscovery);
    duplicate.products.push(duplicate.products[0]);
    expect(() => validateDiscovery(duplicate)).toThrow();
    const untranslated = structuredClone(publicDiscovery);
    untranslated.products[0].description.en = "";
    expect(() => validateDiscovery(untranslated)).toThrow();
  });
  it("renders reproducible facts, public URLs and release pointers without trial links", () => {
    const index = llmsIndex(publicDiscovery);
    expect(index).toContain("https://xworktech.com/download");
    expect(index).toContain("https://xworktech.com/prices");
    for (const product of publicDiscovery.products) {
      for (const locale of ["zh", "en"] as const) {
        const markdown = productMarkdown(publicDiscovery, product, locale);
        expect(markdown).toContain(product.description[locale]);
        expect(markdown).toContain("https://github.com/");
        if (!product.sourceSlug) expect(markdown).toContain("/releases/latest");
        expect(markdown).not.toMatch(
          /entry=trial|\/trial|onwalk\.net|@gmail\.com/,
        );
        expect(markdown).toBe(
          productMarkdown(publicDiscovery, product, locale),
        );
      }
    }
  });
});
