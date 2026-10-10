import type { DownloadCatalogProduct } from "./catalog";

/** Product landing links select their client without changing the default catalog. */
export function prioritizeDownloadProduct(
  catalog: DownloadCatalogProduct[],
  requested: string | string[] | undefined,
): DownloadCatalogProduct[] {
  if (typeof requested !== "string") return catalog;
  const product = catalog.find((entry) => entry.id === requested);
  if (!product) return catalog;
  return [product, ...catalog.filter((entry) => entry.id !== requested)];
}
