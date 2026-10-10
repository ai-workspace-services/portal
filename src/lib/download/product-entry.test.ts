import { describe, expect, it } from "vitest";
import { prioritizeDownloadProduct } from "./product-entry";
import type { DownloadCatalogProduct } from "./catalog";

const catalog = [
  { id: "xworkmate" },
  { id: "xconnect" },
] as DownloadCatalogProduct[];
describe("product download entry", () => {
  it("selects XConnect while preserving the original catalog", () => {
    expect(
      prioritizeDownloadProduct(catalog, "xconnect").map((entry) => entry.id),
    ).toEqual(["xconnect", "xworkmate"]);
    expect(catalog[0].id).toBe("xworkmate");
  });
  it("keeps defaults for missing, invalid or repeated query values", () => {
    for (const value of [undefined, "unknown", ["xconnect", "xworkmate"]]) {
      expect(prioritizeDownloadProduct(catalog, value)).toBe(catalog);
    }
  });
});
