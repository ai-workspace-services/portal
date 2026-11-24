import type {
  DownloadChannelsConfig,
  DownloadPlatformId,
  MirrorRegion,
  ReleaseMatrixDocument,
  StoreChannelConfig,
} from "./channels-types";
import type { FetchedReleaseMatrix } from "./release-matrix";
import type { DirEntry, DirListing } from "./types";

export type { DownloadPlatformId };

export type DownloadAsset = {
  name: string;
  href: string;
  lastModified?: string;
  size?: number;
  sha256?: string;
  source?: "github-release" | "mirror";
};

export type CatalogPlatform = {
  id: DownloadPlatformId;
  label: string;
  labelZh: string;
  detail: string;
  detailZh: string;
  supported: boolean;
  asset?: DownloadAsset;
};

export type DownloadCatalogProduct = {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  kind: "desktop" | "offline";
  docsUrl?: string;
  cliProductSlug?: string;
  releaseUrl: string;
  workflowUrl: string;
  platforms: CatalogPlatform[];
  releaseMatrix?: ReleaseMatrixDocument;
  matrixFetchedFrom?: MirrorRegion;
  stores?: Partial<Record<DownloadPlatformId, StoreChannelConfig[]>>;
};

export type BuildDownloadCatalogOptions = {
  channelsConfig?: DownloadChannelsConfig;
  releaseMatrices?: Partial<Record<string, FetchedReleaseMatrix | undefined>>;
};

type PlatformDefinition = Omit<CatalogPlatform, "asset"> & {
  matches: RegExp[];
  excludeMatches?: RegExp[];
};

type ProductDefinition = Omit<DownloadCatalogProduct, "platforms"> & {
  productMatches: RegExp[];
  platforms: PlatformDefinition[];
};

const GITHUB_RELEASES = {
  xconnectApp: "https://github.com/ai-workspace-xstream/xconnect-app/releases",
  xconnectOne: "https://github.com/ai-workspace-xstream/xconnect-one/releases",
  xworkmateApp: "https://github.com/ai-workspace-lab/xworkmate-app/releases",
  openPlatform: "https://github.com/ai-workspace-infra/artifacts/releases",
} as const;

const PRODUCT_DEFINITIONS: ProductDefinition[] = [
  {
    id: "xconnect-app",
    name: "XConnect-APP",
    nameZh: "XConnect-APP",
    description:
      "Secure connectivity client packages from the XConnect-APP release matrix.",
    descriptionZh: "由 XConnect-APP 发布矩阵构建的跨平台安全连接客户端安装包。",
    kind: "desktop",
    cliProductSlug: "xconnect",
    releaseUrl: GITHUB_RELEASES.xconnectApp,
    workflowUrl:
      "https://github.com/ai-workspace-xstream/xconnect-app/actions/workflows/build-and-release.yml",
    productMatches: [/xconnect/i],
    excludeMatches: undefined,
    platforms: [
      {
        id: "macos",
        label: "macOS",
        labelZh: "macOS",
        detail: "Apple silicon · DMG",
        detailZh: "Apple 芯片 · DMG",
        supported: true,
        matches: [/macos/i, /\.dmg$/i],
        excludeMatches: [/windows|linux|android|ios/i, /xconnect-latest-[0-9a-f]+\.dmg$/i, /xconnect-one/i],
      },
      {
        id: "windows",
        label: "Windows",
        labelZh: "Windows",
        detail: "x64 · MSI / ZIP",
        detailZh: "x64 · MSI / ZIP",
        supported: true,
        matches: [/windows/i, /\.msi$/i, /windows.*\.zip$/i],
        excludeMatches: [/macos|linux|android|ios/i, /xconnect-one/i],
      },
      {
        id: "linux",
        label: "Linux",
        labelZh: "Linux",
        detail: "x64 · AppImage / DEB / RPM",
        detailZh: "x64 · AppImage / DEB / RPM",
        supported: true,
        matches: [/linux/i, /\.appimage$|\.deb$|\.rpm$/i, /linux.*\.zip$/i],
        excludeMatches: [/windows|macos|android|ios/i, /xconnect-one/i],
      },
      {
        id: "ios",
        label: "iOS",
        labelZh: "iOS",
        detail: "arm64 · IPA",
        detailZh: "arm64 · IPA",
        supported: true,
        matches: [/ios/i, /\.ipa$/i],
        excludeMatches: [/windows|macos|linux|android/i, /xconnect\.app\.zip$/i],
      },
      {
        id: "android",
        label: "Android",
        labelZh: "Android",
        detail: "Universal · APK",
        detailZh: "通用包 · APK",
        supported: true,
        matches: [/android/i, /\.apk$/i],
        excludeMatches: [/windows|macos|linux|ios/i, /\.aab$/i],
      },
    ],
  } as ProductDefinition,
  {
    id: "xconnect-one",
    name: "XConnect-One",
    nameZh: "XConnect-One",
    description:
      "Independent XConnect One CLI and private VPN runtime across macOS, Windows, and Linux.",
    descriptionZh: "独立的 XConnect-One CLI 与私有隧道运行时，支持 macOS、Windows 与 Linux。",
    kind: "desktop",
    cliProductSlug: "xconnect-one",
    releaseUrl: GITHUB_RELEASES.xconnectOne,
    workflowUrl:
      "https://github.com/ai-workspace-xstream/xconnect-one/actions/workflows/build-and-release.yml",
    productMatches: [/xconnect-one/i, /xconnect-(?:macos|linux|windows)-(?:amd64|arm64)/i],
    platforms: [
      {
        id: "macos",
        label: "macOS",
        labelZh: "macOS",
        detail: "amd64 / arm64 · DMG / Binary",
        detailZh: "amd64 / arm64 · DMG / 二进制",
        supported: true,
        matches: [/macos/i, /\.dmg$/i],
      },
      {
        id: "windows",
        label: "Windows",
        labelZh: "Windows",
        detail: "amd64 · EXE / ZIP",
        detailZh: "amd64 · EXE / ZIP",
        supported: true,
        matches: [/windows/i, /\.exe$|\.zip$/i],
        excludeMatches: [/linux|macos/i],
      },
      {
        id: "linux",
        label: "Linux",
        labelZh: "Linux",
        detail: "amd64 / arm64 · DEB / RPM / Binary",
        detailZh: "amd64 / arm64 · DEB / RPM / 二进制",
        supported: true,
        matches: [/linux/i, /\.deb$|\.rpm$/i],
        excludeMatches: [/windows|macos/i],
      },
    ],
  },
  {
    id: "xworkmate-app",
    name: "XWorkmate-APP",
    nameZh: "XWorkmate-APP",
    description:
      "Native client packages published from the XWorkmate-APP release matrix.",
    descriptionZh: "由 XWorkmate-APP 发布矩阵构建的原生客户端安装包。",
    kind: "desktop",
    cliProductSlug: "xworkmate",
    releaseUrl: GITHUB_RELEASES.xworkmateApp,
    workflowUrl:
      "https://github.com/ai-workspace-lab/xworkmate-app/actions/workflows/build-and-release.yml",
    productMatches: [/xworkmate/i],
    platforms: [
      {
        id: "macos",
        label: "macOS",
        labelZh: "macOS",
        detail: "Apple silicon · DMG / PKG",
        detailZh: "Apple 芯片 · DMG / PKG",
        supported: true,
        matches: [/macos/i, /\.dmg$|\.pkg$/i],
      },
      {
        id: "windows",
        label: "Windows",
        labelZh: "Windows",
        detail: "x64 · MSI / ZIP",
        detailZh: "x64 · MSI / ZIP",
        supported: true,
        matches: [/windows/i, /\.msi$/i, /windows.*\.zip$/i],
        excludeMatches: [/linux|macos|android|ios/i],
      },
      {
        id: "linux",
        label: "Linux",
        labelZh: "Linux",
        detail: "amd64 · DEB / RPM",
        detailZh: "amd64 · DEB / RPM",
        supported: true,
        matches: [/linux/i, /\.deb$|\.rpm$/i, /linux.*\.zip$/i],
        excludeMatches: [/windows|macos|android|ios/i],
      },
      {
        id: "ios",
        label: "iOS",
        labelZh: "iOS",
        detail: "arm64 · IPA",
        detailZh: "arm64 · IPA",
        supported: true,
        matches: [/ios/i, /\.ipa$/i],
      },
      {
        id: "android",
        label: "Android",
        labelZh: "Android",
        detail: "ARM64 · APK",
        detailZh: "ARM64 · APK",
        supported: true,
        matches: [/android/i, /\.apk$/i],
      },
    ],
  },
  {
    id: "open-platform-solutions",
    name: "Open Platform",
    nameZh: "Open Platform",
    description:
      "Open-source platform solutions, architecture docs (console.svc.plus/docs/), and offline bundles.",
    descriptionZh: "开源平台解决方案矩阵与部署文档（console.svc.plus/docs/），支持离线基础设施交付。",
    kind: "offline",
    docsUrl: "https://console.svc.plus/docs/",
    releaseUrl: GITHUB_RELEASES.openPlatform,
    workflowUrl: "https://github.com/ai-workspace-infra/artifacts/actions",
    productMatches: [
      /offline-(?:package|setup)-(?:k3s|sealos|gitea|gitlab|argocd|fluxcd|apisix|nginx|terraform|pulumi|dify|flowise|n8n|ragflow|autogen)/i,
      /(?:k3s|sealos|gitea|gitlab|argocd|fluxcd|apisix|nginx|terraform|pulumi)-offline-package/i,
    ],
    platforms: [
      {
        id: "linux",
        label: "Linux",
        labelZh: "Linux",
        detail: "amd64 / arm64 offline bundles",
        detailZh: "amd64 / arm64 离线包",
        supported: true,
        matches: [/amd64|arm64|linux/i],
      },
      {
        id: "macos",
        label: "macOS",
        labelZh: "macOS",
        detail: "Use Linux target packages",
        detailZh: "请使用 Linux 目标包",
        supported: false,
        matches: [],
      },
      {
        id: "windows",
        label: "Windows",
        labelZh: "Windows",
        detail: "Not supported",
        detailZh: "不支持",
        supported: false,
        matches: [],
      },
    ],
  },
];

export type GithubReleaseTarget = {
  productId: string;
  releaseUrl: string;
  apiUrl: string;
};

function githubReleaseTarget(
  productId: string,
  releaseUrl: string,
): GithubReleaseTarget | undefined {
  try {
    const url = new URL(releaseUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    if (
      url.hostname !== "github.com" ||
      segments.length < 3 ||
      segments[2] !== "releases"
    ) {
      return undefined;
    }

    const [owner, repository] = segments;
    return {
      productId,
      releaseUrl,
      apiUrl: `https://api.github.com/repos/${owner}/${repository}/releases/latest`,
    };
  } catch {
    return undefined;
  }
}

/**
 * Release pages are the source of truth for product downloads. The target list
 * is derived from the public product links so release metadata is not copied
 * into the download page or duplicated in a second configuration table.
 */
export function getGithubReleaseTargets(): GithubReleaseTarget[] {
  return PRODUCT_DEFINITIONS.flatMap((product) => {
    const target = githubReleaseTarget(product.id, product.releaseUrl);
    return target ? [target] : [];
  });
}

const EXCLUDED_ARTIFACT_PATTERNS = [
  /\.aab$/i,
  /(?:^|\/)xconnect\.app\.zip$/i,
];

function toDownloadUrl(href: string, mirrorBaseUrl: string): string {
  if (href.startsWith("http")) return href;
  const normalizedBase = mirrorBaseUrl.replace(/\/+$/, "");
  const normalizedHref = href.startsWith("/") ? href : `/${href}`;
  return `${normalizedBase}${normalizedHref}`;
}

function flattenFiles(
  listings: DirListing[],
  mirrorBaseUrl = "https://dl.svc.plus",
): DownloadAsset[] {
  const files: Array<DownloadAsset & { sourcePath: string }> = [];

  for (const listing of listings) {
    for (const entry of listing.entries) {
      if (entry.type !== "file") continue;
      files.push({
        name: entry.name,
        href: toDownloadUrl(entry.href, mirrorBaseUrl),
        lastModified: entry.lastModified,
        size: entry.size,
        sha256: entry.sha256,
        source: listing.path.startsWith("github-release/")
          ? "github-release"
          : "mirror",
        sourcePath: `${listing.path}/${entry.name}`.replace(/\/+/g, "/"),
      });
    }
  }

  return files
    .sort(
      (left, right) =>
        new Date(right.lastModified || 0).getTime() -
        new Date(left.lastModified || 0).getTime(),
    )
    .map(({ sourcePath: _sourcePath, ...asset }) => asset);
}

function getLatestAsset(
  files: DownloadAsset[],
  productMatches: RegExp[],
  platformMatches: RegExp[],
  excludeMatches: RegExp[] = [],
): DownloadAsset | undefined {
  if (platformMatches.length === 0) return undefined;

  const matchingAssets = files.filter((asset) => {
    const haystack = `${asset.href}/${asset.name}`;
    if (EXCLUDED_ARTIFACT_PATTERNS.some((pattern) => pattern.test(haystack))) {
      return false;
    }
    if (excludeMatches.some((pattern) => pattern.test(haystack))) {
      return false;
    }
    return (
      productMatches.some((matcher) => matcher.test(haystack)) &&
      platformMatches.some((matcher) => matcher.test(haystack))
    );
  });

  // Prefer the direct GitHub Release asset when both the release and the
  // dl.svc.plus mirror contain the same product. The mirror remains the
  // fallback for offline bundles and for releases that have not been fetched.
  return (
    matchingAssets.find((asset) => asset.source === "github-release") ??
    matchingAssets[0]
  );
}

/**
 * Projects the live download manifest onto the release matrices declared by
 * the owning repositories. When a CI-published release-matrix.json is present
 * (e.g. for XConnect), it is attached directly for pure-presentation rendering.
 */
export function buildDownloadCatalog(
  listings: DirListing[],
  options?: BuildDownloadCatalogOptions,
): DownloadCatalogProduct[] {
  const mirrorBaseUrl =
    options?.channelsConfig?.mirrors.global.baseUrl || "https://dl.svc.plus";
  const files = flattenFiles(listings, mirrorBaseUrl);

  return PRODUCT_DEFINITIONS.map(
    ({ productMatches, platforms, ...product }) => {
      const legacyAlias =
        product.id === "xconnect-app"
          ? "xconnect"
          : product.id === "xworkmate-app"
            ? "xworkmate"
            : undefined;
      const fetchedMatrix =
        options?.releaseMatrices?.[product.id] ??
        (legacyAlias ? options?.releaseMatrices?.[legacyAlias] : undefined);
      const stores =
        options?.channelsConfig?.products[product.id]?.stores ??
        (legacyAlias
          ? options?.channelsConfig?.products[legacyAlias]?.stores
          : undefined);
      return {
        ...product,
        releaseMatrix: fetchedMatrix?.matrix,
        matrixFetchedFrom: fetchedMatrix?.fetchedFrom,
        stores,
        platforms: platforms.map(({ matches, excludeMatches, ...platform }) => ({
          ...platform,
          asset: getLatestAsset(files, productMatches, matches, excludeMatches),
        })),
      };
    },
  );
}

export function countCatalogAssets(catalog: DownloadCatalogProduct[]): number {
  return catalog.reduce(
    (total, product) =>
      total + product.platforms.filter((platform) => platform.asset).length,
    0,
  );
}
