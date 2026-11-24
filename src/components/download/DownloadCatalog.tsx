"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Apple,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  Globe,
  HardDriveDownload,
  Monitor,
  PackageIcon,
  Server,
  ShieldCheck,
  Smartphone,
  Store,
  TerminalSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import CopyButton from "@/components/download/CopyButton";
import { Github } from "@/components/icons/brand";
import { useLanguage } from "@i18n/LanguageProvider";
import type {
  DownloadAsset,
  DownloadCatalogProduct,
  DownloadPlatformId,
} from "@lib/download/catalog";
import {
  DEFAULT_DOWNLOAD_CHANNELS_CONFIG,
  resolvePackageDownloadUrl,
  type DownloadChannelPreference,
  type MirrorConfig,
  type MirrorRegion,
  type ReleaseMatrixDocument,
  type ReleaseMatrixEntry,
  type ReleaseMatrixPackage,
  type ReleaseMatrixPlatform,
  type StoreChannelConfig,
} from "@lib/download/channels-types";

type DownloadCatalogProps = {
  catalog: DownloadCatalogProduct[];
  mirrors?: Record<MirrorRegion, MirrorConfig>;
  initialRegion?: MirrorRegion;
  initialChannel?: DownloadChannelPreference;
  initialTrack?: "stable" | "latest";
};

const STORAGE_REGION_KEY = "xwork.download.region";
const STORAGE_CHANNEL_KEY = "xwork.download.channel";

const platformIcons = {
  macos: Apple,
  windows: Monitor,
  linux: TerminalSquare,
  ios: Smartphone,
  android: Smartphone,
} satisfies Record<DownloadPlatformId, LucideIcon>;

function formatBytes(size: number | undefined, isChinese: boolean) {
  if (!size) return isChinese ? "大小待发布" : "Size pending";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | undefined, isChinese: boolean) {
  if (!value) return isChinese ? "等待发布" : "Pending release";
  return new Intl.DateTimeFormat(isChinese ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function detectPlatform(): DownloadPlatformId | null {
  if (typeof navigator === "undefined") return null;
  const platform = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
  if (platform.includes("android")) return "android";
  if (platform.includes("iphone") || platform.includes("ipad")) return "ios";
  if (platform.includes("mac")) return "macos";
  if (platform.includes("win")) return "windows";
  if (platform.includes("linux")) return "linux";
  return null;
}

function latestAsset(product: DownloadCatalogProduct): DownloadAsset | undefined {
  return product.platforms
    .map((platform) => platform.asset)
    .filter((asset): asset is DownloadAsset => Boolean(asset))
    .sort(
      (left, right) =>
        new Date(right.lastModified || 0).getTime() -
        new Date(left.lastModified || 0).getTime(),
    )[0];
}

function preferredPlatform<
  T extends { id: DownloadPlatformId; supported?: boolean; supportStatus?: string },
>(platforms: T[], detected: DownloadPlatformId | null): T | undefined {
  const isSupported = (item: T) =>
    typeof item.supported === "boolean"
      ? item.supported
      : item.supportStatus !== "unsupported";

  const preferred = detected
    ? platforms.find((platform) => platform.id === detected && isSupported(platform))
    : undefined;
  return preferred ?? platforms.find(isSupported);
}

function resolveActiveMatrixEntry(
  matrix: ReleaseMatrixDocument,
  track: "stable" | "latest",
): ReleaseMatrixEntry | undefined {
  if (track === "stable" && matrix.channels.stable) {
    return matrix.channels.stable;
  }
  if (track === "latest" && matrix.channels.latest) {
    return matrix.channels.latest;
  }
  return matrix.channels.stable ?? matrix.channels.latest ?? undefined;
}

function mirrorBadgeText(
  sourceRegion: MirrorRegion | "github",
  fallback: boolean,
  mirrors: Record<MirrorRegion, MirrorConfig>,
  isChinese: boolean,
): string {
  if (sourceRegion === "github") {
    return isChinese ? "备用源 · GitHub Release" : "Fallback · GitHub Release";
  }
  const baseLabel =
    sourceRegion === "cn"
      ? isChinese
        ? "阿里云 OSS 镜像 (cn-dl.svc.plus)"
        : "Aliyun OSS Mirror (cn-dl.svc.plus)"
      : isChinese
        ? "Cloudflare R2 镜像 (dl.svc.plus)"
        : "Cloudflare R2 Mirror (dl.svc.plus)";
  const custom = isChinese
    ? mirrors[sourceRegion]?.labelZh
    : mirrors[sourceRegion]?.label;
  const label = custom || baseLabel;
  if (!fallback) return label;
  return isChinese ? `备用线路 · ${label}` : `Fallback · ${label}`;
}

function syncUrlQuery(params: {
  productId: string;
  region: MirrorRegion;
  channel: DownloadChannelPreference;
  track?: "stable" | "latest";
}) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("product", params.productId);
  url.searchParams.set("region", params.region);
  url.searchParams.set("channel", params.channel);
  if (params.track) {
    url.searchParams.set("track", params.track);
  }
  window.history.replaceState(null, "", url.toString());
}

function StoreSlotsBlock({
  stores,
  isChinese,
  region,
}: {
  stores?: StoreChannelConfig[];
  isChinese: boolean;
  region: MirrorRegion;
}) {
  if (!stores || stores.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 rounded-[8px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/60 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-heading">
        <Store className="h-3.5 w-3.5 text-primary" aria-hidden />
        <span>{isChinese ? "应用商店渠道" : "App Store channels"}</span>
      </div>
      <div className="space-y-2">
        {stores.map((store) => {
          const storeName = isChinese ? store.nameZh : store.name;
          const note = isChinese ? store.noteZh || store.note : store.note;
          const canLaunch =
            (store.status === "live" || store.status === "testflight") &&
            Boolean(store.url);
          const statusLabel = canLaunch
            ? store.status === "testflight"
              ? "TestFlight"
              : isChinese
                ? "已上架"
                : "Available"
            : region === "cn" && !store.availableInCn && store.status === "unavailable_in_cn"
              ? isChinese
                ? "中国区暂不可用"
                : "Unavailable in CN"
              : isChinese
                ? "暂未上架 · 敬请期待"
                : "Coming soon";

          return (
            <div
              key={store.id}
              className="flex flex-col gap-2 rounded-[6px] border border-[color:var(--color-surface-border)] bg-white/85 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:bg-surface"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-heading">
                    {storeName}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-eyebrow font-medium ${
                      canLaunch
                        ? "bg-primary/10 text-primary"
                        : "bg-[var(--color-surface-muted)] text-text-muted"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>
                {note ? (
                  <p className="mt-1 text-xs leading-5 text-text-muted">{note}</p>
                ) : null}
              </div>
              {canLaunch ? (
                <a
                  href={store.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-[6px] bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover sm:self-auto"
                >
                  {isChinese ? `前往 ${storeName}` : `Open ${storeName}`}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlatformDirectHint({
  platformId,
  isChinese,
}: {
  platformId: DownloadPlatformId;
  isChinese: boolean;
}) {
  if (platformId === "android") {
    return (
      <p className="mt-2 text-xs leading-5 text-text-subtle">
        {isChinese
          ? "提示：安装 APK 时如遇系统拦截，请在系统设置中允许「安装未知来源应用」。"
          : "Tip: If Android prompts during APK installation, allow installing unknown apps in Settings."}
      </p>
    );
  }
  if (platformId === "macos") {
    return (
      <p className="mt-2 text-xs leading-5 text-text-subtle">
        {isChinese
          ? "提示：打开 DMG 后拖入「应用程序」；如遇首次安全拦截，请在「系统设置 → 隐私与安全性」点击仍要打开。"
          : "Tip: Open the DMG and drag to Applications. If Gatekeeper prompts, allow it in System Settings → Privacy & Security."}
      </p>
    );
  }
  return null;
}

function SideloadSection({
  packages,
  region,
  mirrors,
  entryMirrors,
  releaseUrl,
  isChinese,
}: {
  packages: ReleaseMatrixPackage[];
  region: MirrorRegion;
  mirrors: Record<MirrorRegion, MirrorConfig>;
  entryMirrors?: ReleaseMatrixEntry["mirrors"];
  releaseUrl?: string;
  isChinese: boolean;
}) {
  if (packages.length === 0) return null;

  return (
    <details className="mt-3 rounded-[8px] border border-dashed border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 px-3.5 py-2.5 text-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-heading">
        <span>
          {isChinese
            ? "高级用户：下载侧载包 (.ipa · 需配合 AltStore / Sideloadly)"
            : "Advanced: Download sideload package (.ipa via AltStore / Sideloadly)"}
        </span>
        <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden />
      </summary>
      <div className="mt-3 space-y-2 border-t border-[color:var(--color-surface-border)] pt-3">
        <p className="leading-5 text-text-muted">
          {isChinese
            ? "iOS Safari 无法直接点击打开 .ipa 安装。若未通过 App Store 或 TestFlight，请先在电脑使用 AltStore、Sideloadly 或自签名工具安装。"
            : "iOS Safari cannot install raw .ipa files directly. Use AltStore, Sideloadly, or your signing tool on desktop."}
        </p>
        {packages.map((pkg) => {
          const resolved = resolvePackageDownloadUrl(
            pkg,
            region,
            mirrors,
            entryMirrors,
            releaseUrl,
          );
          return (
            <div
              key={pkg.name}
              className="flex flex-col gap-2 rounded-[6px] border border-[color:var(--color-surface-border)] bg-white/90 p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-surface"
            >
              <div className="min-w-0">
                <p className="break-all font-mono text-eyebrow font-semibold text-heading">
                  {pkg.name} · {formatBytes(pkg.size, isChinese)}
                </p>
                {pkg.sha256 ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="truncate font-mono text-eyebrow text-text-muted">
                      SHA-256: {pkg.sha256}
                    </span>
                    <CopyButton
                      text={pkg.sha256}
                      label={isChinese ? "复制 SHA-256" : "Copy SHA-256"}
                    />
                  </div>
                ) : null}
              </div>
              <a
                href={resolved.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-[6px] border border-[color:var(--color-surface-border)] px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5 sm:self-auto"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                {isChinese ? "下载 IPA" : "Download IPA"}
              </a>
            </div>
          );
        })}
      </div>
    </details>
  );
}

export default function DownloadCatalog({
  catalog,
  mirrors = DEFAULT_DOWNLOAD_CHANNELS_CONFIG.mirrors,
  initialRegion = "global",
  initialChannel = "direct",
  initialTrack,
}: DownloadCatalogProps) {
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const [detectedPlatform, setDetectedPlatform] =
    useState<DownloadPlatformId | null>(null);
  const [activeProductId, setActiveProductId] = useState(catalog[0]?.id ?? "");
  const [region, setRegion] = useState<MirrorRegion>(initialRegion);
  const [channel, setChannel] =
    useState<DownloadChannelPreference>(initialChannel);
  const [selectedTrack, setSelectedTrack] = useState<"stable" | "latest">(
    initialTrack ?? "latest",
  );
  const [selectedFormatByPlatform, setSelectedFormatByPlatform] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    setDetectedPlatform(detectPlatform());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("region")) {
      const savedRegion = window.localStorage.getItem(STORAGE_REGION_KEY);
      if (savedRegion === "cn" || savedRegion === "global") {
        setRegion(savedRegion);
      }
    }
    if (!params.has("channel")) {
      const savedChannel = window.localStorage.getItem(STORAGE_CHANNEL_KEY);
      if (savedChannel === "store" || savedChannel === "direct") {
        setChannel(savedChannel);
      }
    }
  }, []);

  useEffect(() => {
    if (
      catalog.length > 0 &&
      !catalog.some((product) => product.id === activeProductId)
    ) {
      setActiveProductId(catalog[0].id);
    }
  }, [activeProductId, catalog]);

  const activeProduct =
    catalog.find((product) => product.id === activeProductId) ?? catalog[0];

  useEffect(() => {
    if (activeProduct?.releaseMatrix) {
      setSelectedTrack(initialTrack ?? activeProduct.releaseMatrix.defaultChannel);
    }
  }, [activeProduct?.id, activeProduct?.releaseMatrix, initialTrack]);

  const latestByProduct = useMemo(
    () => new Map(catalog.map((product) => [product.id, latestAsset(product)])),
    [catalog],
  );

  const handleRegionChange = (nextRegion: MirrorRegion) => {
    setRegion(nextRegion);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_REGION_KEY, nextRegion);
    }
    syncUrlQuery({
      productId: activeProductId,
      region: nextRegion,
      channel,
      track: activeProduct?.releaseMatrix ? selectedTrack : undefined,
    });
  };

  const handleChannelChange = (nextChannel: DownloadChannelPreference) => {
    setChannel(nextChannel);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_CHANNEL_KEY, nextChannel);
    }
    syncUrlQuery({
      productId: activeProductId,
      region,
      channel: nextChannel,
      track: activeProduct?.releaseMatrix ? selectedTrack : undefined,
    });
  };

  const handleTrackChange = (nextTrack: "stable" | "latest") => {
    setSelectedTrack(nextTrack);
    syncUrlQuery({
      productId: activeProductId,
      region,
      channel,
      track: nextTrack,
    });
  };

  const pickPlatformPackage = (
    productKey: string,
    platform: ReleaseMatrixPlatform,
  ): ReleaseMatrixPackage | undefined => {
    const endUserPackages = platform.packages.filter(
      (pkg) => pkg.audience === "end_user",
    );
    if (endUserPackages.length === 0) return undefined;
    const key = `${productKey}:${platform.id}`;
    const chosenName = selectedFormatByPlatform[key];
    return (
      endUserPackages.find((pkg) => pkg.name === chosenName) ??
      endUserPackages.find((pkg) => pkg.primary) ??
      endUserPackages[0]
    );
  };

  const renderMatrixPlatformCard = (
    product: DownloadCatalogProduct,
    entry: ReleaseMatrixEntry,
    platform: ReleaseMatrixPlatform,
    isRecommended: boolean,
  ) => {
    const Icon = platformIcons[platform.id];
    const label = isChinese ? platform.labelZh : platform.label;
    const endUserPackages = platform.packages.filter(
      (pkg) => pkg.audience === "end_user",
    );
    const sideloadPackages = platform.packages.filter(
      (pkg) => pkg.audience === "sideload",
    );
    const selectedPkg = pickPlatformPackage(
      `${product.id}:${entry.tag}`,
      platform,
    );
    const resolved = selectedPkg
      ? resolvePackageDownloadUrl(
          selectedPkg,
          region,
          mirrors,
          entry.mirrors,
          entry.releaseUrl || product.releaseUrl,
        )
      : undefined;
    const stores = product.stores?.[platform.id];
    const liveStore = stores?.find(
      (store) =>
        (store.status === "live" || store.status === "testflight") &&
        Boolean(store.url),
    );
    const showStoreSlot =
      channel === "store" && Boolean(stores && stores.length > 0);
    const formatKey = `${product.id}:${entry.tag}:${platform.id}`;

    if (isRecommended) {
      return (
        <div className="rounded-[8px] border border-[color:var(--color-primary-border)] bg-white p-4 sm:p-5 dark:bg-surface">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex items-start gap-3">
              <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-lg font-semibold tracking-[-0.03em] text-heading">
                    {label}
                  </h4>
                  {platform.arch ? (
                    <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-eyebrow font-medium text-text-muted">
                      {platform.arch}
                    </span>
                  ) : null}
                  {resolved ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-eyebrow font-medium text-primary">
                      <Server className="h-3 w-3" aria-hidden />
                      {mirrorBadgeText(
                        resolved.sourceRegion,
                        resolved.fallback,
                        mirrors,
                        isChinese,
                      )}
                    </span>
                  ) : null}
                </div>

                {selectedPkg ? (
                  <p className="mt-1 break-all font-mono text-eyebrow text-text-muted">
                    {selectedPkg.name} · {formatBytes(selectedPkg.size, isChinese)}
                  </p>
                ) : (
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    {isChinese
                      ? "应用商店准备中；当前仅提供高级侧载包，iOS 浏览器无法直接点击 .ipa 安装。"
                      : "App Store / TestFlight in preparation; iOS Safari cannot install .ipa files directly."}
                  </p>
                )}

                {endUserPackages.length > 1 ? (
                  <div
                    className="mt-3 flex flex-wrap items-center gap-1.5"
                    role="group"
                    aria-label={isChinese ? "选择安装格式" : "Choose installer format"}
                  >
                    {endUserPackages.map((pkg) => {
                      const activeFmt = selectedPkg?.name === pkg.name;
                      return (
                        <button
                          key={pkg.name}
                          type="button"
                          onClick={() =>
                            setSelectedFormatByPlatform((prev) => ({
                              ...prev,
                              [formatKey]: pkg.name,
                            }))
                          }
                          className={`rounded-[6px] border px-2.5 py-1 text-xs font-semibold uppercase transition ${
                            activeFmt
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-[color:var(--color-surface-border)] text-text-muted hover:border-primary/40 hover:text-heading"
                          }`}
                        >
                          .{pkg.format}
                          {pkg.primary
                            ? isChinese
                              ? " (推荐)"
                              : " (Recommended)"
                            : ""}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {liveStore && channel === "store" ? (
              <a
                href={liveStore.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[6px] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                <Store className="h-4 w-4" aria-hidden />
                {isChinese ? `前往 ${liveStore.nameZh}` : `Open ${liveStore.name}`}
              </a>
            ) : resolved ? (
              <a
                href={resolved.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[6px] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                <Download className="h-4 w-4" aria-hidden />
                {channel === "store" && stores && stores.length > 0
                  ? isChinese
                    ? "先用镜像直装"
                    : "Direct mirror download"
                  : isChinese
                    ? `下载 ${label} 安装包`
                    : `Download for ${label}`}
              </a>
            ) : (
              <a
                href={entry.releaseUrl || product.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[6px] border border-[color:var(--color-surface-border)] px-4 py-2.5 text-sm font-semibold text-heading transition hover:border-primary/40 hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                {isChinese ? "查看 Release" : "View release"}
              </a>
            )}
          </div>

          {showStoreSlot ? (
            <StoreSlotsBlock
              stores={stores}
              isChinese={isChinese}
              region={region}
            />
          ) : null}

          {selectedPkg?.sha256 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--color-surface-border)] pt-3">
              <p className="min-w-0 break-all font-mono text-eyebrow text-text-muted">
                SHA-256: {selectedPkg.sha256}
              </p>
              <CopyButton
                text={selectedPkg.sha256}
                label={isChinese ? "复制 SHA-256" : "Copy SHA-256"}
              />
            </div>
          ) : null}

          {selectedPkg ? (
            <PlatformDirectHint platformId={platform.id} isChinese={isChinese} />
          ) : null}

          <SideloadSection
            packages={sideloadPackages}
            region={region}
            mirrors={mirrors}
            entryMirrors={entry.mirrors}
            releaseUrl={entry.releaseUrl || product.releaseUrl}
            isChinese={isChinese}
          />
        </div>
      );
    }

    return (
      <div
        key={platform.id}
        className={`py-4 ${platform.supportStatus === "unsupported" ? "opacity-70" : ""}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-heading">{label}</span>
                {platform.arch ? (
                  <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-eyebrow font-medium text-text-muted">
                    {platform.arch}
                  </span>
                ) : null}
                <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-eyebrow font-medium text-text-muted">
                  {endUserPackages.length > 0
                    ? isChinese
                      ? "镜像直装可用"
                      : "Direct mirror ready"
                    : sideloadPackages.length > 0
                      ? isChinese
                        ? "仅限高级侧载 / 商店准备中"
                        : "Sideload / Store pending"
                      : isChinese
                        ? "暂未提供"
                        : "Unavailable"}
                </span>
                {resolved?.fallback ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-eyebrow font-medium text-primary">
                    {mirrorBadgeText(
                      resolved.sourceRegion,
                      true,
                      mirrors,
                      isChinese,
                    )}
                  </span>
                ) : null}
              </div>

              {selectedPkg ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="break-all font-mono text-eyebrow text-text-muted">
                    {selectedPkg.name} · {formatBytes(selectedPkg.size, isChinese)}
                  </p>
                  {selectedPkg.sha256 ? (
                    <span className="inline-flex items-center gap-1 text-eyebrow text-text-subtle">
                      <ShieldCheck className="h-3 w-3" aria-hidden />
                      SHA-256: {selectedPkg.sha256.slice(0, 12)}…
                    </span>
                  ) : null}
                </div>
              ) : null}

              {endUserPackages.length > 1 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {endUserPackages.map((pkg) => {
                    const activeFmt = selectedPkg?.name === pkg.name;
                    return (
                      <button
                        key={pkg.name}
                        type="button"
                        onClick={() =>
                          setSelectedFormatByPlatform((prev) => ({
                            ...prev,
                            [formatKey]: pkg.name,
                          }))
                        }
                        className={`rounded-[5px] border px-2 py-0.5 text-eyebrow font-semibold uppercase transition ${
                          activeFmt
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-[color:var(--color-surface-border)] text-text-muted hover:border-primary/40 hover:text-heading"
                        }`}
                      >
                        .{pkg.format}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            {selectedPkg?.sha256 ? (
              <CopyButton
                text={selectedPkg.sha256}
                label={isChinese ? "复制 SHA-256" : "Copy SHA-256"}
              />
            ) : null}
            {liveStore && channel === "store" ? (
              <a
                href={liveStore.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[6px] bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover"
              >
                <Store className="h-3.5 w-3.5" aria-hidden />
                {isChinese ? liveStore.nameZh : liveStore.name}
              </a>
            ) : resolved ? (
              <a
                href={resolved.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-[color:var(--color-surface-border)] px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                {isChinese ? "下载" : "Download"}
              </a>
            ) : null}
          </div>
        </div>

        {showStoreSlot ? (
          <StoreSlotsBlock
            stores={stores}
            isChinese={isChinese}
            region={region}
          />
        ) : null}

        {selectedPkg ? (
          <PlatformDirectHint platformId={platform.id} isChinese={isChinese} />
        ) : null}

        <SideloadSection
          packages={sideloadPackages}
          region={region}
          mirrors={mirrors}
          entryMirrors={entry.mirrors}
          releaseUrl={entry.releaseUrl || product.releaseUrl}
          isChinese={isChinese}
        />
      </div>
    );
  };

  return (
    <section
      className="space-y-6"
      aria-label={isChinese ? "下载产品" : "Download products"}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <div
          className="-mx-1 flex gap-1 overflow-x-auto rounded-[10px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] p-1 sm:mx-0"
          role="tablist"
          aria-label={isChinese ? "选择产品" : "Choose a product"}
        >
          {catalog.map((product) => {
            const active = product.id === activeProductId;
            const label = isChinese ? product.nameZh : product.name;
            return (
              <button
                key={product.id}
                id={`download-tab-${product.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`download-panel-${product.id}`}
                onClick={() => setActiveProductId(product.id)}
                className={`flex min-w-[9.5rem] flex-1 items-center justify-center gap-2 rounded-[7px] px-4 py-3 text-sm font-semibold transition sm:min-w-0 ${
                  active
                    ? "bg-white text-heading shadow-[var(--shadow-sm)] dark:bg-primary-muted"
                    : "text-text-muted hover:bg-white/65 hover:text-heading dark:hover:bg-surface-hover"
                }`}
              >
                <PackageIcon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {activeProduct ? (
          <div className="rounded-[10px] border border-[color:var(--color-surface-border)] bg-white/90 p-4 sm:p-5 dark:bg-surface">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-primary">
                  {isChinese ? "当前产品" : "Selected product"}
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-heading">
                  {isChinese ? activeProduct.nameZh : activeProduct.name}
                </h2>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            </div>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {isChinese
                ? activeProduct.descriptionZh
                : activeProduct.description}
            </p>
            <p className="mt-2 text-xs leading-5 text-text-subtle">
              {isChinese
                ? "可根据网络环境切换 CN 阿里云 OSS 或 Global Cloudflare R2 镜像，并按需选择应用商店或官方直装包。"
                : "Switch between CN Aliyun OSS and Global Cloudflare R2 mirrors, or choose App Store vs direct installer packages."}
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        {catalog.map((product) => {
          const productName = isChinese ? product.nameZh : product.name;
          const typeLabel =
            product.kind === "offline"
              ? isChinese
                ? "离线安装包"
                : "Offline installer"
              : isChinese
                ? "多平台客户端"
                : "Multi-platform client";

          const matrix = product.releaseMatrix;
          const matrixEntry = matrix
            ? resolveActiveMatrixEntry(matrix, selectedTrack)
            : undefined;
          const matrixRecommendation = matrixEntry
            ? preferredPlatform(matrixEntry.platforms, detectedPlatform)
            : undefined;

          const legacyRecommendation = preferredPlatform(
            product.platforms,
            detectedPlatform,
          );
          const releaseAsset = latestByProduct.get(product.id);
          const releaseDate = matrixEntry?.publishedAt ?? releaseAsset?.lastModified;
          const showPreferencesBar =
            product.kind === "desktop" ||
            Boolean(matrix) ||
            Boolean(product.stores);

          return (
            <article
              key={product.id}
              id={`download-panel-${product.id}`}
              role="tabpanel"
              aria-labelledby={`download-tab-${product.id}`}
              hidden={product.id !== activeProductId}
              className="overflow-hidden rounded-[10px] border border-[color:var(--color-surface-border)] bg-white/92 shadow-[var(--shadow-sm)] dark:bg-surface"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                      <PackageIcon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="rounded-full border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-eyebrow font-semibold text-text-muted">
                      {typeLabel}
                    </span>
                    {matrixEntry ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-eyebrow font-semibold text-primary">
                        v{matrixEntry.version} · {matrixEntry.channel}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-heading">
                    {productName}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {product.docsUrl ? (
                    <a
                      href={product.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-[6px] border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15"
                    >
                      {isChinese ? "开源解决方案文档" : "Open Platform Docs"}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  ) : null}
                  <a
                    href={product.workflowUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[6px] border border-[color:var(--color-surface-border)] px-3 py-2 text-xs font-medium text-text-muted transition hover:border-primary/40 hover:text-primary"
                  >
                    <Github className="h-3.5 w-3.5" aria-hidden />
                    {isChinese ? "构建矩阵" : "Build matrix"}
                  </a>
                  <a
                    href={matrixEntry?.releaseUrl || product.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[6px] bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-hover"
                  >
                    {isChinese ? "Release" : "Release"}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              </div>

              {showPreferencesBar ? (
                <div className="border-t border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/30 px-5 py-4 sm:px-6">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-eyebrow font-semibold uppercase tracking-[0.14em] text-text-subtle">
                        <Globe className="h-3.5 w-3.5" aria-hidden />
                        {isChinese ? "1. 下载网络线路" : "1. Download mirror"}
                      </span>
                      <div className="flex gap-1 rounded-[8px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] p-1">
                        {(["cn", "global"] as const).map((regionOption) => {
                          const active = region === regionOption;
                          const labelText =
                            regionOption === "cn"
                              ? isChinese
                                ? "中国大陆 · 阿里云 OSS"
                                : "CN · Aliyun OSS"
                              : isChinese
                                ? "全球 / 海外 · R2"
                                : "Global · Cloudflare R2";
                          return (
                            <button
                              key={regionOption}
                              type="button"
                              aria-pressed={active}
                              onClick={() => handleRegionChange(regionOption)}
                              className={`flex-1 rounded-[6px] px-2.5 py-1.5 text-xs font-semibold transition ${
                                active
                                  ? "bg-white text-heading shadow-[var(--shadow-sm)] dark:bg-primary-muted"
                                  : "text-text-muted hover:text-heading"
                              }`}
                            >
                              {labelText}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-eyebrow font-semibold uppercase tracking-[0.14em] text-text-subtle">
                        <HardDriveDownload className="h-3.5 w-3.5" aria-hidden />
                        {isChinese ? "2. 安装获取方式" : "2. Install channel"}
                      </span>
                      <div className="flex gap-1 rounded-[8px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] p-1">
                        {(
                          [
                            {
                              id: "direct",
                              zh: "免商店 · 直接下载",
                              en: "Direct installer",
                            },
                            {
                              id: "store",
                              zh: "可使用应用商店",
                              en: "App Store",
                            },
                          ] as const
                        ).map((option) => {
                          const active = channel === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() => handleChannelChange(option.id)}
                              className={`flex-1 rounded-[6px] px-2.5 py-1.5 text-xs font-semibold transition ${
                                active
                                  ? "bg-white text-heading shadow-[var(--shadow-sm)] dark:bg-primary-muted"
                                  : "text-text-muted hover:text-heading"
                              }`}
                            >
                              {isChinese ? option.zh : option.en}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {matrix ? (
                      <div className="space-y-1.5">
                        <span className="flex items-center gap-1.5 text-eyebrow font-semibold uppercase tracking-[0.14em] text-text-subtle">
                          <PackageIcon className="h-3.5 w-3.5" aria-hidden />
                          {isChinese ? "3. 发布通道 (CI 同步)" : "3. Release channel"}
                        </span>
                        <div className="flex gap-1 rounded-[8px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] p-1">
                          {(
                            [
                              {
                                id: "stable",
                                available: Boolean(matrix.channels.stable),
                                zh: "稳定版",
                                en: "Stable",
                              },
                              {
                                id: "latest",
                                available: Boolean(matrix.channels.latest),
                                zh: "最新构建",
                                en: "Latest",
                              },
                            ] as const
                          ).map((trackOption) => {
                            const active = matrixEntry?.channel === trackOption.id ||
                              (selectedTrack === trackOption.id && trackOption.available);
                            return (
                              <button
                                key={trackOption.id}
                                type="button"
                                disabled={!trackOption.available}
                                aria-pressed={active}
                                onClick={() => handleTrackChange(trackOption.id)}
                                className={`flex-1 rounded-[6px] px-2.5 py-1.5 text-xs font-semibold transition ${
                                  !trackOption.available
                                    ? "cursor-not-allowed text-text-subtle opacity-60"
                                    : active
                                      ? "bg-white text-heading shadow-[var(--shadow-sm)] dark:bg-primary-muted"
                                      : "text-text-muted hover:text-heading"
                                }`}
                              >
                                {isChinese ? trackOption.zh : trackOption.en}
                                {!trackOption.available
                                  ? isChinese
                                    ? " (待发版)"
                                    : " (Pending)"
                                  : ""}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-end">
                        <p className="text-xs leading-5 text-text-subtle">
                          {isChinese
                            ? "未同步至镜像的产物将自动回退 GitHub Release。"
                            : "Packages not yet synced to mirrors fall back to GitHub Release."}
                        </p>
                      </div>
                    )}
                  </div>
                  {product.cliProductSlug ? (
                    <div className="mt-4 flex flex-col gap-2 rounded-[var(--radius-md)] border border-border-default bg-surface-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-text-default">
                          {isChinese ? "包管理器 / CLI 快速安装" : "Package Repo / CLI Quick Install"}
                        </p>
                        <code className="mt-1 block truncate font-mono text-xs text-text-muted">
                          {`curl -fsSL https://${region === "cn" ? "cn-repo.svc.plus" : "repo.svc.plus"}/install.sh | sh -s -- --product ${product.cliProductSlug}`}
                        </code>
                      </div>
                      <CopyButton
                        text={`curl -fsSL https://${region === "cn" ? "cn-repo.svc.plus" : "repo.svc.plus"}/install.sh | sh -s -- --product ${product.cliProductSlug}`}
                        label={isChinese ? "复制安装命令" : "Copy install command"}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="border-y border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/45 p-5 sm:p-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-eyebrow font-semibold uppercase tracking-[0.16em] text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                    {isChinese ? "为当前设备推荐" : "Recommended for your device"}
                  </div>
                  {matrixEntry ? (
                    <span className="font-mono text-eyebrow text-text-muted">
                      {matrixEntry.tag}
                    </span>
                  ) : null}
                </div>

                {matrixEntry && matrixRecommendation ? (
                  renderMatrixPlatformCard(
                    product,
                    matrixEntry,
                    matrixRecommendation,
                    true,
                  )
                ) : legacyRecommendation ? (
                  <div className="rounded-[8px] border border-[color:var(--color-primary-border)] bg-white p-4 sm:p-5 dark:bg-surface">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex items-start gap-3">
                        {(() => {
                          const Icon = platformIcons[legacyRecommendation.id];
                          return (
                            <Icon
                              className="mt-1 h-5 w-5 shrink-0 text-primary"
                              aria-hidden
                            />
                          );
                        })()}
                        <div>
                          <h4 className="text-lg font-semibold tracking-[-0.03em] text-heading">
                            {isChinese
                              ? legacyRecommendation.labelZh
                              : legacyRecommendation.label}
                          </h4>
                          <p className="mt-1 break-all font-mono text-eyebrow text-text-muted">
                            {legacyRecommendation.asset?.name ??
                              (isChinese
                                ? "最新构建尚未镜像"
                                : "Latest build is not mirrored yet")}
                            {legacyRecommendation.asset?.size
                              ? ` · ${formatBytes(legacyRecommendation.asset.size, isChinese)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <a
                        href={
                          legacyRecommendation.asset?.href ?? product.releaseUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[6px] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                      >
                        <Download className="h-4 w-4" aria-hidden />
                        {legacyRecommendation.asset
                          ? isChinese
                            ? "下载推荐包"
                            : "Download recommended"
                          : isChinese
                            ? "查看 Release"
                            : "View release"}
                      </a>
                    </div>
                    {channel === "store" ? (
                      <StoreSlotsBlock
                        stores={product.stores?.[legacyRecommendation.id]}
                        isChinese={isChinese}
                        region={region}
                      />
                    ) : null}
                    {legacyRecommendation.asset?.sha256 ? (
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[color:var(--color-surface-border)] pt-3">
                        <p className="min-w-0 break-all font-mono text-eyebrow text-text-muted">
                          SHA-256: {legacyRecommendation.asset.sha256}
                        </p>
                        <CopyButton
                          text={legacyRecommendation.asset.sha256}
                          label={isChinese ? "复制 SHA-256" : "Copy SHA-256"}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-[8px] border border-dashed border-[color:var(--color-surface-border)] p-4 text-sm text-text-muted">
                    {isChinese
                      ? "暂无可用安装包，请前往 Release 查看。"
                      : "No package is available yet. Check the Release page."}
                  </p>
                )}
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-heading">
                    {isChinese ? "其他平台与格式" : "Other platforms and formats"}
                  </h4>
                  <span className="text-xs text-text-subtle">
                    {(matrixEntry
                      ? matrixEntry.platforms.length
                      : product.platforms.length)}{" "}
                    {isChinese ? "项" : "options"}
                  </span>
                </div>

                {matrixEntry ? (
                  <div className="mt-3 divide-y divide-[color:var(--color-surface-border)] border-y border-[color:var(--color-surface-border)]">
                    {matrixEntry.platforms
                      .filter(
                        (platform) => platform.id !== matrixRecommendation?.id,
                      )
                      .map((platform) =>
                        renderMatrixPlatformCard(
                          product,
                          matrixEntry,
                          platform,
                          false,
                        ),
                      )}
                  </div>
                ) : (
                  <div className="mt-3 divide-y divide-[color:var(--color-surface-border)] border-y border-[color:var(--color-surface-border)]">
                    {product.platforms
                      .filter(
                        (platform) => platform.id !== legacyRecommendation?.id,
                      )
                      .map((platform) => {
                        const Icon = platformIcons[platform.id];
                        const label = isChinese ? platform.labelZh : platform.label;
                        const detail = isChinese
                          ? platform.detailZh
                          : platform.detail;
                        const stores = product.stores?.[platform.id];
                        return (
                          <div
                            key={platform.id}
                            className={`py-3.5 ${!platform.supported ? "opacity-70" : ""}`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-start gap-3">
                                <Icon
                                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                                  aria-hidden
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-heading">
                                      {label}
                                    </span>
                                    <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-eyebrow font-medium text-text-muted">
                                      {platform.supported
                                        ? platform.asset
                                          ? isChinese
                                            ? "可下载"
                                            : "Available"
                                          : isChinese
                                            ? "待镜像"
                                            : "Pending mirror"
                                        : isChinese
                                          ? "不支持"
                                          : "Unavailable"}
                                    </span>
                                  </div>
                                  <p className="mt-1 break-all font-mono text-eyebrow text-text-muted">
                                    {platform.asset?.name ?? detail}
                                  </p>
                                </div>
                              </div>
                              {platform.supported ? (
                                <a
                                  href={platform.asset?.href ?? product.releaseUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-[6px] border border-[color:var(--color-surface-border)] px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5 sm:self-auto"
                                >
                                  {platform.asset
                                    ? isChinese
                                      ? "下载"
                                      : "Download"
                                    : isChinese
                                      ? "查看 Release"
                                      : "View release"}
                                  <ExternalLink
                                    className="h-3.5 w-3.5"
                                    aria-hidden
                                  />
                                </a>
                              ) : (
                                <span className="text-xs font-medium text-text-subtle">
                                  {isChinese
                                    ? "当前无可用包"
                                    : "No package available"}
                                </span>
                              )}
                            </div>
                            {channel === "store" ? (
                              <StoreSlotsBlock
                                stores={stores}
                                isChinese={isChinese}
                                region={region}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                )}

                {matrix && matrix.history.length > 1 ? (
                  <details className="mt-4 rounded-[8px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/35 px-4 py-3 text-xs">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-heading">
                      <span>
                        {isChinese
                          ? `历史版本矩阵 (${matrix.history.length})`
                          : `Release history (${matrix.history.length})`}
                      </span>
                      <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden />
                    </summary>
                    <ul className="mt-3 divide-y divide-[color:var(--color-surface-border)] border-t border-[color:var(--color-surface-border)]">
                      {matrix.history.map((item) => {
                        const baseMirror =
                          mirrors[region]?.baseUrl || mirrors.global.baseUrl;
                        const matrixHref = `${baseMirror.replace(/\/+$/, "")}${
                          item.matrixPath.startsWith("/")
                            ? item.matrixPath
                            : `/${item.matrixPath}`
                        }`;
                        return (
                          <li
                            key={item.tag}
                            className="flex flex-wrap items-center justify-between gap-2 py-2"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-semibold text-heading">
                                {item.tag}
                              </span>
                              <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-eyebrow text-text-muted">
                                v{item.version} · {item.channel}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-text-muted">
                              <span>{formatDate(item.publishedAt, isChinese)}</span>
                              <a
                                href={matrixHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                              >
                                matrix.json
                                <ExternalLink className="h-3 w-3" aria-hidden />
                              </a>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[color:var(--color-surface-border)] px-5 py-3.5 text-xs text-text-muted sm:px-6">
                <span>
                  {isChinese ? "最新发布" : "Latest release"}:{" "}
                  {formatDate(releaseDate, isChinese)}
                </span>
                {matrixEntry?.commitSha ? (
                  <span className="font-mono">
                    commit: {matrixEntry.commitSha}
                  </span>
                ) : null}
                <a
                  href={matrixEntry?.releaseUrl || product.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  {isChinese ? "查看 GitHub Release" : "View GitHub Release"}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
