// Keep the page request-aware so a newly published GitHub Release can appear
// without rebuilding the marketing site. The upstream fetches remain cached
// for an hour in the server data cache.
export const dynamic = "force-dynamic";
export const revalidate = 3600;

import { notFound } from "next/navigation";

import DownloadCatalog from "@/components/download/DownloadCatalog";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getDownloadListings } from "@/lib/download/dl-index-data-artifacts";
import { getOfflinePackageListings } from "@/lib/download/dl-index-data-offline-package";
import {
  buildDownloadCatalog,
  getGithubReleaseTargets,
} from "@/lib/download/catalog";
import { getGithubReleaseListings } from "@/lib/download/github-releases";
import { isFeatureEnabled } from "@lib/featureToggles";

export default async function DownloadHome() {
  if (!isFeatureEnabled("appModules", "/download")) {
    notFound();
  }

  const allListings = await getDownloadListings();
  const offlinePackageListings = await getOfflinePackageListings();
  const githubReleaseListings = await getGithubReleaseListings(
    getGithubReleaseTargets(),
  );

  const catalog = buildDownloadCatalog([
    ...githubReleaseListings,
    ...allListings,
    ...offlinePackageListings,
  ]);

  return (
    <PublicPageShell>
      <DownloadCatalog catalog={catalog} />
    </PublicPageShell>
  );
}
