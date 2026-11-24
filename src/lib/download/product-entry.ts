import type { DownloadCatalogProduct } from "./catalog";

const PRODUCT_ID_ALIASES: Record<string, string> = {
  xconnect: "xconnect-app",
  xworkmate: "xworkmate-app",
  "ai-workspace": "xconnect-one",
  "ai-workspace-offline": "xconnect-one",
  "open-platform": "open-platform-solutions",
  "open-platform-offline": "open-platform-solutions",
};

/** Product landing links select their client without changing the default catalog. */
export function prioritizeDownloadProduct(
  catalog: DownloadCatalogProduct[],
  requested: string | string[] | undefined,
): DownloadCatalogProduct[] {
  if (typeof requested !== "string") return catalog;
  const resolvedId = PRODUCT_ID_ALIASES[requested] ?? requested;
  const product = catalog.find(
    (entry) => entry.id === requested || entry.id === resolvedId,
  );
  if (!product) return catalog;
  return [product, ...catalog.filter((entry) => entry.id !== product.id)];
}
