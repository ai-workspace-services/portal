// Keep the page request-aware so a newly published GitHub Release can appear
// without rebuilding the marketing site. The upstream fetches remain cached
// for an hour in the server data cache.
export const dynamic = "force-dynamic";
export const revalidate = 3600;

import { headers } from "next/headers";
import { notFound } from "next/navigation";

import DownloadCatalog from "@/components/download/DownloadCatalog";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getDownloadListings } from "@/lib/download/dl-index-data-artifacts";
import { getOfflinePackageListings } from "@/lib/download/dl-index-data-offline-package";
import {
  buildDownloadCatalog,
  getGithubReleaseTargets,
} from "@/lib/download/catalog";
import { loadDownloadChannelsConfig } from "@/lib/download/channels";
import {
  inferRegionFromHeaders,
  parseChannelPreference,
  parseMirrorRegion,
  parseReleaseTrack,
} from "@/lib/download/channels-types";
import { getGithubReleaseListings } from "@/lib/download/github-releases";
import { fetchProductReleaseMatrix } from "@/lib/download/release-matrix";
import { isFeatureEnabled } from "@lib/featureToggles";
import { prioritizeDownloadProduct } from "@/lib/download/product-entry";

export default async function DownloadHome({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string | string[];
    region?: string | string[];
    channel?: string | string[];
    track?: string | string[];
  }>;
}) {
  if (!isFeatureEnabled("appModules", "/download")) {
    notFound();
  }

  const [resolvedSearchParams, reqHeaders, channelsConfig] = await Promise.all([
    searchParams,
    headers(),
    loadDownloadChannelsConfig(),
  ]);

  const initialRegion =
    parseMirrorRegion(resolvedSearchParams.region) ??
    inferRegionFromHeaders(
      reqHeaders.get("cf-ipcountry"),
      reqHeaders.get("accept-language"),
    );
  const initialChannel =
    parseChannelPreference(resolvedSearchParams.channel) ??
    (initialRegion === "cn" ? "direct" : "store");
  const initialTrack = parseReleaseTrack(resolvedSearchParams.track);

  const matrixProductIds = Object.entries(channelsConfig.products)
    .filter(([, cfg]) => Boolean(cfg.matrixPath))
    .map(([productId]) => productId);

  const [
    allListings,
    offlinePackageListings,
    githubReleaseListings,
    matrixEntries,
  ] = await Promise.all([
    getDownloadListings(),
    getOfflinePackageListings(),
    getGithubReleaseListings(getGithubReleaseTargets()),
    Promise.all(
      matrixProductIds.map(
        async (productId) =>
          [
            productId,
            await fetchProductReleaseMatrix(
              productId,
              channelsConfig,
              initialRegion,
            ),
          ] as const,
      ),
    ),
  ]);

  const releaseMatrices = Object.fromEntries(matrixEntries);

  const catalog = prioritizeDownloadProduct(
    buildDownloadCatalog(
      [
        ...githubReleaseListings,
        ...allListings,
        ...offlinePackageListings,
      ],
      {
        channelsConfig,
        releaseMatrices,
      },
    ),
    resolvedSearchParams.product,
  );

  return (
    <PublicPageShell>
      <DownloadCatalog
        catalog={catalog}
        mirrors={channelsConfig.mirrors}
        initialRegion={initialRegion}
        initialChannel={initialChannel}
        initialTrack={initialTrack}
      />
    </PublicPageShell>
  );
}
