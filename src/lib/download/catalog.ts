import type { DirEntry, DirListing } from "./types";

export type DownloadPlatformId =
  | "macos"
  | "windows"
  | "linux"
  | "ios"
  | "android";

export type DownloadAsset = {
  name: string;
  href: string;
  lastModified?: string;
  size?: number;
  sha256?: string;
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
  releaseUrl: string;
  workflowUrl: string;
  platforms: CatalogPlatform[];
};

type PlatformDefinition = Omit<CatalogPlatform, "asset"> & {
  matches: RegExp[];
};

type ProductDefinition = Omit<DownloadCatalogProduct, "platforms"> & {
  productMatches: RegExp[];
  platforms: PlatformDefinition[];
};

const GITHUB_RELEASES = {
  xworkmate: "https://github.com/ai-workspace-lab/xworkmate-app/releases",
  xconnect: "https://github.com/ai-workspace-xstream/xconnect-app/releases",
  aiWorkspace:
    "https://github.com/ai-workspace-lab/xworkspace-console/releases",
  openPlatform: "https://github.com/ai-workspace-infra/artifacts/releases",
} as const;

const PRODUCT_DEFINITIONS: ProductDefinition[] = [
  {
    id: "xworkmate",
    name: "XWorkmate",
    nameZh: "XWorkmate",
    description:
      "Native client packages published from the XWorkmate release matrix.",
    descriptionZh: "由 XWorkmate 发布矩阵构建的原生客户端安装包。",
    kind: "desktop",
    releaseUrl: GITHUB_RELEASES.xworkmate,
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
        matches: [/windows/i, /\.msi$|\.zip$/i],
      },
      {
        id: "linux",
        label: "Linux",
        labelZh: "Linux",
        detail: "amd64 · DEB / RPM",
        detailZh: "amd64 · DEB / RPM",
        supported: true,
        matches: [/linux/i, /\.deb$|\.rpm$/i],
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
    id: "xconnect",
    name: "XConnect",
    nameZh: "XConnect",
    description:
      "Secure connectivity client packages from the XConnect release matrix.",
    descriptionZh: "由 XConnect 发布矩阵构建的安全连接客户端安装包。",
    kind: "desktop",
    releaseUrl: GITHUB_RELEASES.xconnect,
    workflowUrl:
      "https://github.com/ai-workspace-xstream/xconnect-app/actions/workflows/build-and-release.yml",
    productMatches: [/xconnect/i],
    platforms: [
      {
        id: "macos",
        label: "macOS",
        labelZh: "macOS",
        detail: "Apple silicon · DMG",
        detailZh: "Apple 芯片 · DMG",
        supported: true,
        matches: [/macos/i, /\.dmg$/i],
      },
      {
        id: "windows",
        label: "Windows",
        labelZh: "Windows",
        detail: "x64 · MSI / ZIP",
        detailZh: "x64 · MSI / ZIP",
        supported: true,
        matches: [/windows/i, /\.msi$|\.zip$/i],
      },
      {
        id: "linux",
        label: "Linux",
        labelZh: "Linux",
        detail: "x64 · AppImage / DEB / RPM",
        detailZh: "x64 · AppImage / DEB / RPM",
        supported: true,
        matches: [/linux/i, /\.appimage$|\.deb$|\.rpm$|\.zip$/i],
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
        detail: "Universal · APK",
        detailZh: "通用包 · APK",
        supported: true,
        matches: [/android/i, /\.apk$/i],
      },
    ],
  },
  {
    id: "ai-workspace-offline",
    name: "AI Workspace",
    nameZh: "AI Workspace",
    description:
      "All-in-one offline installer for Debian and Ubuntu environments.",
    descriptionZh: "面向 Debian 与 Ubuntu 环境的一体化离线安装包。",
    kind: "offline",
    releaseUrl: GITHUB_RELEASES.aiWorkspace,
    workflowUrl:
      "https://github.com/ai-workspace-lab/xworkspace-console/actions/workflows/offline-package-ai-workspace-installer.yaml",
    productMatches: [
      /ai-workspace-all-in-one-offline/i,
      /offline.*ai.*workspace/i,
    ],
    platforms: [
      {
        id: "linux",
        label: "Linux",
        labelZh: "Linux",
        detail: "Debian 11–13 / Ubuntu 22.04–26.04 · amd64 / arm64",
        detailZh: "Debian 11–13 / Ubuntu 22.04–26.04 · amd64 / arm64",
        supported: true,
        matches: [/debian|ubuntu/i, /amd64|arm64/i],
      },
      {
        id: "macos",
        label: "macOS",
        labelZh: "macOS",
        detail: "No upstream offline package",
        detailZh: "上游暂未提供离线包",
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
  {
    id: "open-platform-offline",
    name: "Open Platform",
    nameZh: "Open Platform",
    description:
      "Offline installers for platform infrastructure services and tools.",
    descriptionZh: "面向平台基础设施服务与工具的离线安装包。",
    kind: "offline",
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

function toDownloadUrl(href: string): string {
  return href.startsWith("http") ? href : `https://dl.svc.plus${href}`;
}

function flattenFiles(listings: DirListing[]): DownloadAsset[] {
  const files: Array<DownloadAsset & { source: string }> = [];

  for (const listing of listings) {
    for (const entry of listing.entries) {
      if (entry.type !== "file") continue;
      files.push({
        name: entry.name,
        href: toDownloadUrl(entry.href),
        lastModified: entry.lastModified,
        size: entry.size,
        sha256: entry.sha256,
        source: `${listing.path}/${entry.name}`.replace(/\/+/g, "/"),
      });
    }
  }

  return files
    .sort(
      (left, right) =>
        new Date(right.lastModified || 0).getTime() -
        new Date(left.lastModified || 0).getTime(),
    )
    .map(({ source: _source, ...asset }) => asset);
}

function getLatestAsset(
  files: DownloadAsset[],
  productMatches: RegExp[],
  platformMatches: RegExp[],
): DownloadAsset | undefined {
  if (platformMatches.length === 0) return undefined;

  return files.find((asset) => {
    const haystack = `${asset.href}/${asset.name}`;
    return (
      productMatches.some((matcher) => matcher.test(haystack)) &&
      platformMatches.some((matcher) => matcher.test(haystack))
    );
  });
}

/**
 * Projects the live download manifest onto the release matrices declared by
 * the owning repositories. A release page remains the safe fallback while a
 * package has not yet been mirrored to dl.svc.plus.
 */
export function buildDownloadCatalog(
  listings: DirListing[],
): DownloadCatalogProduct[] {
  const files = flattenFiles(listings);

  return PRODUCT_DEFINITIONS.map(
    ({ productMatches, platforms, ...product }) => ({
      ...product,
      platforms: platforms.map(({ matches, ...platform }) => ({
        ...platform,
        asset: getLatestAsset(files, productMatches, matches),
      })),
    }),
  );
}

export function countCatalogAssets(catalog: DownloadCatalogProduct[]): number {
  return catalog.reduce(
    (total, product) =>
      total + product.platforms.filter((platform) => platform.asset).length,
    0,
  );
}
