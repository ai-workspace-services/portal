export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import DownloadBrowser from "@/components/download/DownloadBrowser";
import DownloadCatalog from "@/components/download/DownloadCatalog";
import DownloadSummary from "@/components/download/DownloadSummary";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import {
  buildDownloadSections,
  countFiles,
  findListing,
} from "@/lib/download-data";
import { getDownloadListings } from "@/lib/download/dl-index-data-artifacts";
import {
  getOfflinePackageFileCount,
  getOfflinePackageListings,
  getOfflinePackageSections,
} from "@/lib/download/dl-index-data-offline-package";
import type { DirEntry } from "@/lib/download/types";
import { buildDownloadCatalog } from "@/lib/download/catalog";
import { isFeatureEnabled } from "@lib/featureToggles";

export default async function DownloadHome() {
  if (!isFeatureEnabled("appModules", "/download")) {
    notFound();
  }

  const allListings = await getDownloadListings();
  const offlinePackageSections = await getOfflinePackageSections();
  const offlinePackageListings = await getOfflinePackageListings();

  const sectionsMap = buildDownloadSections(allListings);
  const mergedSectionsMap = { ...sectionsMap, ...offlinePackageSections };
  const catalog = buildDownloadCatalog([
    ...allListings,
    ...offlinePackageListings,
  ]);

  const rootListing = findListing(allListings, []);
  const topLevelDirectories =
    rootListing?.entries.filter((entry: DirEntry) => entry.type === "dir") ??
    [];

  const offlinePackageFileCount = await getOfflinePackageFileCount();

  const totalCollections = Object.values(mergedSectionsMap).reduce(
    (total, sections) => total + sections.length,
    0,
  );
  const totalFiles =
    topLevelDirectories.reduce((total: number, entry: DirEntry) => {
      const listing = findListing(allListings, [entry.name]);
      return total + (listing ? countFiles(listing, allListings) : 0);
    }, 0) + offlinePackageFileCount;

  return (
    <PublicPageShell>
      <DownloadSummary
        topLevelCount={Math.max(topLevelDirectories.length, catalog.length)}
        totalCollections={Math.max(totalCollections, catalog.length)}
        totalFiles={totalFiles}
      />
      <DownloadCatalog catalog={catalog} />
      <DownloadBrowser sectionsMap={mergedSectionsMap} />
    </PublicPageShell>
  );
}
