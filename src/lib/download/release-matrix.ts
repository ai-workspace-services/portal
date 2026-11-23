import "server-only";

import {
  type DownloadChannelsConfig,
  type DownloadPlatformId,
  type MirrorRegion,
  type ReleaseChannelName,
  type ReleaseMatrixDocument,
  type ReleaseMatrixEntry,
  type ReleaseMatrixHistoryItem,
  type ReleaseMatrixPackage,
  type ReleaseMatrixPlatform,
  type ReleasePackageAudience,
} from "./channels-types";

const MATRIX_REVALIDATE_SECONDS = 300;
const MATRIX_FETCH_TIMEOUT_MS = 3000;

export type FetchedReleaseMatrix = {
  matrix: ReleaseMatrixDocument;
  fetchedFrom: MirrorRegion;
};

const VALID_PLATFORMS = new Set<DownloadPlatformId>([
  "macos",
  "windows",
  "linux",
  "ios",
  "android",
]);

const VALID_AUDIENCES = new Set<ReleasePackageAudience>([
  "end_user",
  "sideload",
  "store_only",
  "internal",
]);

const VALID_CHANNELS = new Set<ReleaseChannelName>([
  "stable",
  "latest",
  "release-branch",
  "build",
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePackage(raw: unknown): ReleaseMatrixPackage | undefined {
  if (!isPlainRecord(raw)) return undefined;
  if (
    typeof raw.name !== "string" ||
    typeof raw.format !== "string" ||
    typeof raw.path !== "string"
  ) {
    return undefined;
  }
  const audience =
    typeof raw.audience === "string" &&
    VALID_AUDIENCES.has(raw.audience as ReleasePackageAudience)
      ? (raw.audience as ReleasePackageAudience)
      : "end_user";
  return {
    name: raw.name,
    format: raw.format,
    arch: typeof raw.arch === "string" ? raw.arch : "",
    path: raw.path,
    size: typeof raw.size === "number" ? raw.size : undefined,
    sha256: typeof raw.sha256 === "string" ? raw.sha256 : undefined,
    primary: Boolean(raw.primary),
    audience,
    githubUrl: typeof raw.githubUrl === "string" ? raw.githubUrl : undefined,
  };
}

function parsePlatform(raw: unknown): ReleaseMatrixPlatform | undefined {
  if (!isPlainRecord(raw)) return undefined;
  if (
    typeof raw.id !== "string" ||
    !VALID_PLATFORMS.has(raw.id as DownloadPlatformId)
  ) {
    return undefined;
  }
  const packages = Array.isArray(raw.packages)
    ? raw.packages
        .map(parsePackage)
        .filter((pkg): pkg is ReleaseMatrixPackage => Boolean(pkg))
    : [];
  const supportStatus =
    raw.supportStatus === "unsupported" ? "unsupported" : "supported";
  const label = typeof raw.label === "string" ? raw.label : raw.id;
  return {
    id: raw.id as DownloadPlatformId,
    label,
    labelZh: typeof raw.labelZh === "string" ? raw.labelZh : label,
    arch: typeof raw.arch === "string" ? raw.arch : undefined,
    supportStatus,
    packages,
  };
}

function parseEntry(raw: unknown): ReleaseMatrixEntry | undefined {
  if (!isPlainRecord(raw)) return undefined;
  if (
    typeof raw.tag !== "string" ||
    typeof raw.version !== "string" ||
    !Array.isArray(raw.platforms)
  ) {
    return undefined;
  }
  const platforms = raw.platforms
    .map(parsePlatform)
    .filter((platform): platform is ReleaseMatrixPlatform => Boolean(platform));
  const channel =
    typeof raw.channel === "string" &&
    VALID_CHANNELS.has(raw.channel as ReleaseChannelName)
      ? (raw.channel as ReleaseChannelName)
      : "latest";
  let mirrors: ReleaseMatrixEntry["mirrors"];
  if (isPlainRecord(raw.mirrors)) {
    mirrors = {};
    for (const key of ["cn", "global"] as const) {
      const m = raw.mirrors[key];
      if (isPlainRecord(m) && typeof m.synced === "boolean") {
        mirrors[key] = { synced: m.synced };
      }
    }
  }
  return {
    tag: raw.tag,
    version: raw.version,
    buildNumber:
      typeof raw.buildNumber === "string" ? raw.buildNumber : undefined,
    msiVersion: typeof raw.msiVersion === "string" ? raw.msiVersion : undefined,
    channel,
    commitSha: typeof raw.commitSha === "string" ? raw.commitSha : undefined,
    publishedAt:
      typeof raw.publishedAt === "string" ? raw.publishedAt : undefined,
    releaseUrl: typeof raw.releaseUrl === "string" ? raw.releaseUrl : undefined,
    workflowRunUrl:
      typeof raw.workflowRunUrl === "string" ? raw.workflowRunUrl : undefined,
    mirrors,
    platforms,
  };
}

function parseHistoryItem(raw: unknown): ReleaseMatrixHistoryItem | undefined {
  if (!isPlainRecord(raw)) return undefined;
  if (
    typeof raw.tag !== "string" ||
    typeof raw.version !== "string" ||
    typeof raw.matrixPath !== "string"
  ) {
    return undefined;
  }
  const channel =
    typeof raw.channel === "string" &&
    VALID_CHANNELS.has(raw.channel as ReleaseChannelName)
      ? (raw.channel as ReleaseChannelName)
      : "latest";
  return {
    tag: raw.tag,
    version: raw.version,
    buildNumber:
      typeof raw.buildNumber === "string" ? raw.buildNumber : undefined,
    channel,
    publishedAt:
      typeof raw.publishedAt === "string" ? raw.publishedAt : undefined,
    matrixPath: raw.matrixPath,
  };
}

export function parseReleaseMatrixDocument(
  raw: unknown,
): ReleaseMatrixDocument | undefined {
  if (!isPlainRecord(raw)) return undefined;
  if (raw.schemaVersion !== 1 || typeof raw.product !== "string") {
    return undefined;
  }
  if (!isPlainRecord(raw.channels)) return undefined;

  const stable = raw.channels.stable ? parseEntry(raw.channels.stable) : null;
  const latest = raw.channels.latest ? parseEntry(raw.channels.latest) : null;
  if (!stable && !latest) return undefined;

  const defaultChannel =
    raw.defaultChannel === "stable" && stable ? "stable" : "latest";
  const history = Array.isArray(raw.history)
    ? raw.history
        .map(parseHistoryItem)
        .filter((item): item is ReleaseMatrixHistoryItem => Boolean(item))
    : [];

  return {
    schemaVersion: 1,
    product: raw.product,
    generatedAt:
      typeof raw.generatedAt === "string" ? raw.generatedAt : undefined,
    defaultChannel,
    channels: {
      stable: stable ?? null,
      latest: latest ?? null,
    },
    history,
  };
}

export async function fetchProductReleaseMatrix(
  productId: string,
  config: DownloadChannelsConfig,
  preferredRegion: MirrorRegion,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchedReleaseMatrix | undefined> {
  const matrixPath = config.products[productId]?.matrixPath;
  if (!matrixPath) return undefined;

  const normalizedPath = matrixPath.startsWith("/")
    ? matrixPath
    : `/${matrixPath}`;
  const order: MirrorRegion[] =
    preferredRegion === "cn" ? ["cn", "global"] : ["global", "cn"];

  for (const region of order) {
    const mirror = config.mirrors[region];
    if (!mirror?.enabled || !mirror.baseUrl) continue;

    const url = `${mirror.baseUrl.replace(/\/+$/, "")}${normalizedPath}`;
    try {
      const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(MATRIX_FETCH_TIMEOUT_MS),
        next: { revalidate: MATRIX_REVALIDATE_SECONDS },
      });
      if (!response.ok) continue;

      const json = (await response.json()) as unknown;
      const matrix = parseReleaseMatrixDocument(json);
      if (matrix) {
        return { matrix, fetchedFrom: region };
      }
    } catch {
      // Fall back to peer mirror or GitHub Release listings cleanly.
    }
  }

  return undefined;
}
