export type DownloadPlatformId =
  | "macos"
  | "windows"
  | "linux"
  | "ios"
  | "android";

export type MirrorRegion = "cn" | "global";

export type DownloadChannelPreference = "store" | "direct";

export type StoreStatus =
  | "live"
  | "testflight"
  | "coming_soon"
  | "direct_only"
  | "unavailable_in_cn";

export type MirrorAuthMode =
  | "public"
  | "public-cdn-capped"
  | "aliyun-cdn-type-a";

export type MirrorConfig = {
  id: string;
  provider: string;
  baseUrl: string;
  label: string;
  labelZh: string;
  authMode: MirrorAuthMode;
  enabled: boolean;
};

export type StoreChannelConfig = {
  id: string;
  name: string;
  nameZh: string;
  status: StoreStatus;
  url: string;
  availableInCn: boolean;
  note?: string;
  noteZh?: string;
};

export type ProductChannelConfig = {
  matrixPath?: string;
  stores?: Partial<Record<DownloadPlatformId, StoreChannelConfig[]>>;
};

export type DownloadChannelsConfig = {
  schemaVersion: 1;
  mirrors: Record<MirrorRegion, MirrorConfig>;
  products: Record<string, ProductChannelConfig>;
};

export type ReleaseChannelName =
  | "stable"
  | "latest"
  | "release-branch"
  | "build";

export type ReleasePackageAudience =
  | "end_user"
  | "sideload"
  | "store_only"
  | "internal";

export type ReleaseMatrixPackage = {
  name: string;
  format: string;
  arch: string;
  path: string;
  size?: number;
  sha256?: string;
  primary: boolean;
  audience: ReleasePackageAudience;
  githubUrl?: string;
};

export type ReleaseMatrixPlatform = {
  id: DownloadPlatformId;
  label: string;
  labelZh: string;
  arch?: string;
  supportStatus: "supported" | "unsupported";
  packages: ReleaseMatrixPackage[];
};

export type ReleaseMatrixEntry = {
  tag: string;
  version: string;
  buildNumber?: string;
  msiVersion?: string;
  channel: ReleaseChannelName;
  commitSha?: string;
  publishedAt?: string;
  releaseUrl?: string;
  workflowRunUrl?: string;
  mirrors?: Partial<Record<MirrorRegion, { synced: boolean }>>;
  platforms: ReleaseMatrixPlatform[];
};

export type ReleaseMatrixHistoryItem = {
  tag: string;
  version: string;
  buildNumber?: string;
  channel: ReleaseChannelName;
  publishedAt?: string;
  matrixPath: string;
};

export type ReleaseMatrixDocument = {
  schemaVersion: 1;
  product: string;
  generatedAt?: string;
  defaultChannel: "stable" | "latest";
  channels: {
    stable?: ReleaseMatrixEntry | null;
    latest?: ReleaseMatrixEntry | null;
  };
  history: ReleaseMatrixHistoryItem[];
};

export type ResolvedPackageDownload = {
  href: string;
  sourceRegion: MirrorRegion | "github";
  fallback: boolean;
  mirrorLabel: string;
  mirrorLabelZh: string;
};

export const DEFAULT_DOWNLOAD_CHANNELS_CONFIG: DownloadChannelsConfig = {
  schemaVersion: 1,
  mirrors: {
    cn: {
      id: "cn-oss",
      provider: "aliyun-oss",
      baseUrl: "https://cn-dl.svc.plus",
      label: "China Mainland (Aliyun OSS)",
      labelZh: "中国大陆镜像（阿里云 OSS）",
      authMode: "public-cdn-capped",
      enabled: true,
    },
    global: {
      id: "global-r2",
      provider: "cloudflare-r2",
      baseUrl: "https://dl.svc.plus",
      label: "Global (Cloudflare R2)",
      labelZh: "全球镜像（Cloudflare R2）",
      authMode: "public",
      enabled: true,
    },
  },
  products: {
    xconnect: {
      matrixPath: "/releases/xconnect/release-matrix.json",
      stores: {
        ios: [
          {
            id: "app-store",
            name: "App Store",
            nameZh: "App Store（海外区）",
            status: "coming_soon",
            url: "",
            availableInCn: false,
            note: "App Store submission in preparation.",
            noteZh: "App Store 审核上架准备中，预留跳转入口。",
          },
          {
            id: "testflight",
            name: "TestFlight",
            nameZh: "TestFlight 公测",
            status: "coming_soon",
            url: "",
            availableInCn: true,
            note: "TestFlight public link will appear here once published.",
            noteZh: "TestFlight 内测链接即将开放，后续将优先服务 iOS 用户。",
          },
        ],
        android: [
          {
            id: "google-play",
            name: "Google Play",
            nameZh: "Google Play",
            status: "coming_soon",
            url: "",
            availableInCn: false,
            note: "Google Play listing in preparation; use direct APK meanwhile.",
            noteZh: "Google Play 暂未上架，请使用下方官方 APK 直装包。",
          },
        ],
        windows: [
          {
            id: "microsoft-store",
            name: "Microsoft Store",
            nameZh: "Microsoft Store",
            status: "coming_soon",
            url: "",
            availableInCn: true,
            note: "Microsoft Store package in preparation; MSI/ZIP direct install is available.",
            noteZh: "Microsoft Store 暂未上架，当前提供 MSI 与 ZIP 直装包。",
          },
        ],
        macos: [
          {
            id: "mac-app-store",
            name: "Mac App Store",
            nameZh: "Mac App Store",
            status: "coming_soon",
            url: "",
            availableInCn: false,
            note: "Mac App Store listing in preparation; use DMG direct install meanwhile.",
            noteZh: "Mac App Store 暂未上架，当前提供 DMG 直装包。",
          },
        ],
      },
    },
  },
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMirror(
  raw: unknown,
  fallback: MirrorConfig,
): MirrorConfig {
  if (!isPlainRecord(raw)) return fallback;
  const baseUrlRaw =
    typeof raw.baseUrl === "string" && raw.baseUrl.trim()
      ? raw.baseUrl.trim().replace(/\/+$/, "")
      : fallback.baseUrl;
  const authMode =
    raw.authMode === "public" ||
    raw.authMode === "public-cdn-capped" ||
    raw.authMode === "aliyun-cdn-type-a"
      ? raw.authMode
      : fallback.authMode;
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : fallback.id,
    provider:
      typeof raw.provider === "string" && raw.provider.trim()
        ? raw.provider.trim()
        : fallback.provider,
    baseUrl: baseUrlRaw,
    label:
      typeof raw.label === "string" && raw.label.trim()
        ? raw.label.trim()
        : fallback.label,
    labelZh:
      typeof raw.labelZh === "string" && raw.labelZh.trim()
        ? raw.labelZh.trim()
        : fallback.labelZh,
    authMode,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : fallback.enabled,
  };
}

function normalizeStoreChannel(raw: unknown): StoreChannelConfig | undefined {
  if (!isPlainRecord(raw)) return undefined;
  if (typeof raw.id !== "string" || typeof raw.name !== "string") {
    return undefined;
  }
  const status =
    raw.status === "live" ||
    raw.status === "testflight" ||
    raw.status === "coming_soon" ||
    raw.status === "direct_only" ||
    raw.status === "unavailable_in_cn"
      ? raw.status
      : "coming_soon";
  return {
    id: raw.id,
    name: raw.name,
    nameZh: typeof raw.nameZh === "string" && raw.nameZh ? raw.nameZh : raw.name,
    status,
    url: typeof raw.url === "string" ? raw.url.trim() : "",
    availableInCn:
      typeof raw.availableInCn === "boolean" ? raw.availableInCn : false,
    note: typeof raw.note === "string" ? raw.note : undefined,
    noteZh: typeof raw.noteZh === "string" ? raw.noteZh : undefined,
  };
}

function normalizeProductChannel(
  raw: unknown,
  fallback?: ProductChannelConfig,
): ProductChannelConfig {
  if (!isPlainRecord(raw)) return fallback ?? {};
  const stores: Partial<Record<DownloadPlatformId, StoreChannelConfig[]>> = {
    ...(fallback?.stores ?? {}),
  };
  if (isPlainRecord(raw.stores)) {
    const platforms: DownloadPlatformId[] = [
      "macos",
      "windows",
      "linux",
      "ios",
      "android",
    ];
    for (const platform of platforms) {
      const list = raw.stores[platform];
      if (!Array.isArray(list)) continue;
      const normalized = list
        .map(normalizeStoreChannel)
        .filter((entry): entry is StoreChannelConfig => Boolean(entry));
      stores[platform] = normalized;
    }
  }
  const matrixPath =
    typeof raw.matrixPath === "string" && raw.matrixPath.trim()
      ? raw.matrixPath.trim()
      : fallback?.matrixPath;
  return {
    matrixPath,
    stores: Object.keys(stores).length > 0 ? stores : undefined,
  };
}

export function mergeDownloadChannelsConfig(
  raw: unknown,
): DownloadChannelsConfig {
  if (!isPlainRecord(raw)) {
    return DEFAULT_DOWNLOAD_CHANNELS_CONFIG;
  }
  const rawMirrors = isPlainRecord(raw.mirrors) ? raw.mirrors : {};
  const rawProducts = isPlainRecord(raw.products) ? raw.products : {};
  const productKeys = new Set([
    ...Object.keys(DEFAULT_DOWNLOAD_CHANNELS_CONFIG.products),
    ...Object.keys(rawProducts),
  ]);
  const products: Record<string, ProductChannelConfig> = {};
  for (const key of productKeys) {
    products[key] = normalizeProductChannel(
      rawProducts[key],
      DEFAULT_DOWNLOAD_CHANNELS_CONFIG.products[key],
    );
  }
  return {
    schemaVersion: 1,
    mirrors: {
      cn: normalizeMirror(
        rawMirrors.cn,
        DEFAULT_DOWNLOAD_CHANNELS_CONFIG.mirrors.cn,
      ),
      global: normalizeMirror(
        rawMirrors.global,
        DEFAULT_DOWNLOAD_CHANNELS_CONFIG.mirrors.global,
      ),
    },
    products,
  };
}

export function inferRegionFromHeaders(
  cfIpCountry?: string | null,
  acceptLanguage?: string | null,
): MirrorRegion {
  const country = cfIpCountry?.trim().toUpperCase();
  if (country === "CN") return "cn";
  if (country && country !== "XX" && country !== "T1") return "global";
  const lang = acceptLanguage?.toLowerCase() ?? "";
  if (lang.includes("zh-cn") || lang.includes("zh-hans")) {
    return "cn";
  }
  return "global";
}

function firstQueryValue(raw?: string | string[]): string | undefined {
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0].trim();
  return undefined;
}

export function parseMirrorRegion(
  raw?: string | string[],
): MirrorRegion | undefined {
  const value = firstQueryValue(raw)?.toLowerCase();
  if (value === "cn" || value === "global") return value;
  return undefined;
}

export function parseChannelPreference(
  raw?: string | string[],
): DownloadChannelPreference | undefined {
  const value = firstQueryValue(raw)?.toLowerCase();
  if (value === "store" || value === "direct") return value;
  return undefined;
}

export function parseReleaseTrack(
  raw?: string | string[],
): "stable" | "latest" | undefined {
  const value = firstQueryValue(raw)?.toLowerCase();
  if (value === "stable" || value === "latest") return value;
  return undefined;
}

export function resolvePackageDownloadUrl(
  pkg: Pick<ReleaseMatrixPackage, "path" | "githubUrl">,
  preferredRegion: MirrorRegion,
  mirrors: Record<MirrorRegion, MirrorConfig>,
  entryMirrors?: Partial<Record<MirrorRegion, { synced: boolean }>>,
  fallbackReleaseUrl?: string,
): ResolvedPackageDownload {
  const normalizedPath = pkg.path.startsWith("/") ? pkg.path : `/${pkg.path}`;
  const peerRegion: MirrorRegion = preferredRegion === "cn" ? "global" : "cn";

  const isMirrorUsable = (region: MirrorRegion) => {
    const mirror = mirrors[region];
    if (!mirror?.enabled || !mirror.baseUrl) return false;
    if (entryMirrors?.[region]?.synced === false) return false;
    return true;
  };

  if (isMirrorUsable(preferredRegion)) {
    const mirror = mirrors[preferredRegion];
    return {
      href: `${mirror.baseUrl.replace(/\/+$/, "")}${normalizedPath}`,
      sourceRegion: preferredRegion,
      fallback: false,
      mirrorLabel: mirror.label,
      mirrorLabelZh: mirror.labelZh,
    };
  }

  if (isMirrorUsable(peerRegion)) {
    const mirror = mirrors[peerRegion];
    return {
      href: `${mirror.baseUrl.replace(/\/+$/, "")}${normalizedPath}`,
      sourceRegion: peerRegion,
      fallback: true,
      mirrorLabel: mirror.label,
      mirrorLabelZh: mirror.labelZh,
    };
  }

  return {
    href: pkg.githubUrl || fallbackReleaseUrl || "",
    sourceRegion: "github",
    fallback: true,
    mirrorLabel: "GitHub Release",
    mirrorLabelZh: "GitHub Release",
  };
}
