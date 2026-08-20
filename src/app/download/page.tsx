// The download catalog is built from hourly manifests, not from the request.
export const revalidate = 3600;

import { notFound } from "next/navigation";

import DownloadCatalog from "@/components/download/DownloadCatalog";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getDownloadListings } from "@/lib/download/dl-index-data-artifacts";
import { getOfflinePackageListings } from "@/lib/download/dl-index-data-offline-package";
import { buildDownloadCatalog } from "@/lib/download/catalog";
import { isFeatureEnabled } from "@lib/featureToggles";

export default async function DownloadHome() {
  if (!isFeatureEnabled("appModules", "/download")) {
    notFound();
  }

  const allListings = await getDownloadListings();
  const offlinePackageListings = await getOfflinePackageListings();

  const catalog = buildDownloadCatalog([
    ...allListings,
    ...offlinePackageListings,
  ]);

  return (
    <PublicPageShell>
      <DownloadCatalog catalog={catalog} />
    </PublicPageShell>
  );
}
