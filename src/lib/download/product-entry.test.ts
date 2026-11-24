import { describe, expect, it } from "vitest";
import { prioritizeDownloadProduct } from "./product-entry";
import type { DownloadCatalogProduct } from "./catalog";

const catalog = [
  { id: "xconnect-app" },
  { id: "xconnect-one" },
  { id: "xworkmate-app" },
  { id: "open-platform-solutions" },
] as DownloadCatalogProduct[];
describe("product download entry", () => {
  it("selects XConnect-APP via direct id or legacy alias while preserving order", () => {
    expect(
      prioritizeDownloadProduct(catalog, "xconnect-app").map((entry) => entry.id),
    ).toEqual(["xconnect-app", "xconnect-one", "xworkmate-app", "open-platform-solutions"]);
    expect(
      prioritizeDownloadProduct(catalog, "xconnect").map((entry) => entry.id),
    ).toEqual(["xconnect-app", "xconnect-one", "xworkmate-app", "open-platform-solutions"]);
    expect(
      prioritizeDownloadProduct(catalog, "xworkmate").map((entry) => entry.id),
    ).toEqual(["xworkmate-app", "xconnect-app", "xconnect-one", "open-platform-solutions"]);
    expect(
      prioritizeDownloadProduct(catalog, "xconnect-one").map((entry) => entry.id),
    ).toEqual(["xconnect-one", "xconnect-app", "xworkmate-app", "open-platform-solutions"]);
  });
  it("keeps defaults for missing, invalid or repeated query values", () => {
    for (const value of [undefined, "unknown", ["xconnect", "xworkmate"]]) {
      expect(prioritizeDownloadProduct(catalog, value)).toBe(catalog);
    }
  });
});
