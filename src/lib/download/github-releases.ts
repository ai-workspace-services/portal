import "server-only";

import type { GithubReleaseTarget } from "./catalog";
import type { DirListing } from "./types";

type GithubReleaseAsset = {
  name: string;
  browser_download_url: string;
  size?: number;
  created_at?: string;
  updated_at?: string;
};

type GithubRelease = {
  tag_name: string;
  published_at?: string;
  created_at?: string;
  assets?: GithubReleaseAsset[];
};

const RELEASE_CACHE_SECONDS = 3600;

function githubHeaders(includeToken = true): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "xworktech-download-catalog",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (includeToken && token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchRelease(
  target: GithubReleaseTarget,
  includeToken: boolean,
): Promise<Response> {
  return fetch(target.apiUrl, {
    headers: githubHeaders(includeToken),
    next: { revalidate: RELEASE_CACHE_SECONDS },
  });
}

async function fetchLatestRelease(
  target: GithubReleaseTarget,
): Promise<DirListing | undefined> {
  try {
    let response = await fetchRelease(target, true);

    // Public repositories should remain discoverable even when the optional
    // production token is scoped to a different repository or has expired.
    // Retry anonymously before falling back to the mirror catalog.
    if (
      process.env.GITHUB_TOKEN &&
      [401, 403, 404].includes(response.status)
    ) {
      response = await fetchRelease(target, false);
    }

    // Some products may not have published their first Release yet. That is a
    // normal fallback case, not an application error.
    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const release = (await response.json()) as GithubRelease;
    const releaseAssets = Array.isArray(release.assets) ? release.assets : [];

    return {
      path: `github-release/${target.productId}/${release.tag_name}/`,
      entries: releaseAssets
        .filter(
          (asset) =>
            typeof asset.name === "string" &&
            typeof asset.browser_download_url === "string",
        )
        .map((asset) => ({
          name: asset.name,
          href: asset.browser_download_url,
          type: "file" as const,
          size: asset.size,
          lastModified:
            asset.updated_at ??
            asset.created_at ??
            release.published_at ??
            release.created_at,
        })),
    };
  } catch (error) {
    // A single repository being unavailable must not hide the other products
    // or the existing dl.svc.plus fallback catalog.
    console.warn(
      `Unable to read GitHub Release for ${target.productId}:`,
      error,
    );
    return undefined;
  }
}

export async function getGithubReleaseListings(
  targets: GithubReleaseTarget[],
): Promise<DirListing[]> {
  const listings = await Promise.all(targets.map(fetchLatestRelease));
  return listings.filter((listing): listing is DirListing => Boolean(listing));
}
