"use client";

export type HomepageHeroAsset = {
  imageUrl?: string;
  version?: string;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
};

const DEFAULT_CONTENT_URL =
  process.env.NEXT_PUBLIC_HOME_HERO_CONTENT_URL?.trim() ?? "";
const DEFAULT_MEDIA_BASE_URL =
  process.env.NEXT_PUBLIC_HOME_HERO_MEDIA_BASE_URL?.trim() ?? "";
const DEFAULT_MEDIA_VERSION =
  process.env.NEXT_PUBLIC_HOME_HERO_ASSET_VERSION?.trim() ?? "";

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function appendVersion(url: string, version?: string) {
  if (!version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}

function buildAssetUrl(baseUrl: string, assetPath: string, version?: string) {
  if (!baseUrl) {
    return "";
  }
  const cleanBase = normalizeBaseUrl(baseUrl);
  const cleanPath = assetPath.replace(/^\/+/, "");
  return appendVersion(`${cleanBase}/${cleanPath}`, version);
}

export async function loadHomepageHeroAsset(
  language: "zh" | "en",
): Promise<HomepageHeroAsset> {
  if (!DEFAULT_CONTENT_URL) {
    return {};
  }

  try {
    const response = await fetch(
      appendVersion(DEFAULT_CONTENT_URL, DEFAULT_MEDIA_VERSION),
      {
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return {};
    }
    const payload = (await response.json()) as Partial<
      Record<"zh" | "en", HomepageHeroAsset>
    >;
    return payload[language] ?? {};
  } catch {
    return {};
  }
}

export function resolveHomepageHeroImage(
  imageBasePath?: string,
  version?: string,
) {
  if (!DEFAULT_MEDIA_BASE_URL || !imageBasePath) {
    return "";
  }
  return buildAssetUrl(
    DEFAULT_MEDIA_BASE_URL,
    `${imageBasePath}.png`,
    version || DEFAULT_MEDIA_VERSION,
  );
}
