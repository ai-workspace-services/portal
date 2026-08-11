"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Apple,
  Boxes,
  CheckCircle2,
  Download,
  ExternalLink,
  Github,
  Monitor,
  PackageIcon,
  Smartphone,
  TerminalSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useLanguage } from "@i18n/LanguageProvider";
import type {
  DownloadAsset,
  DownloadCatalogProduct,
  DownloadPlatformId,
} from "@lib/download/catalog";

type DownloadCatalogProps = {
  catalog: DownloadCatalogProduct[];
};

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

function preferredPlatform(
  product: DownloadCatalogProduct,
  detected: DownloadPlatformId | null,
) {
  const preferred = detected
    ? product.platforms.find(
        (platform) => platform.id === detected && platform.supported,
      )
    : undefined;
  return preferred ?? product.platforms.find((platform) => platform.supported);
}

export default function DownloadCatalog({ catalog }: DownloadCatalogProps) {
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const [detectedPlatform, setDetectedPlatform] =
    useState<DownloadPlatformId | null>(null);
  const [activeProductId, setActiveProductId] = useState(catalog[0]?.id ?? "");

  useEffect(() => {
    setDetectedPlatform(detectPlatform());
  }, []);

  useEffect(() => {
    if (catalog.length > 0 && !catalog.some((product) => product.id === activeProductId)) {
      setActiveProductId(catalog[0].id);
    }
  }, [activeProductId, catalog]);

  const latestByProduct = useMemo(
    () => new Map(catalog.map((product) => [product.id, latestAsset(product)])),
    [catalog],
  );

  const activeProduct =
    catalog.find((product) => product.id === activeProductId) ?? catalog[0];

  return (
    <section className="space-y-6" aria-label={isChinese ? "下载产品" : "Download products"}>
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
                    ? "bg-white text-heading shadow-[var(--shadow-sm)]"
                    : "text-text-muted hover:bg-white/65 hover:text-heading"
                }`}
              >
                <PackageIcon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {activeProduct ? (
          <div className="rounded-[10px] border border-[color:var(--color-surface-border)] bg-white/90 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {isChinese ? "当前产品" : "Selected product"}
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-heading">
                  {isChinese ? activeProduct.nameZh : activeProduct.name}
                </h2>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            </div>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {isChinese ? activeProduct.descriptionZh : activeProduct.description}
            </p>
            <p className="mt-2 text-xs leading-5 text-text-subtle">
              {isChinese
                ? "先使用推荐包；如果需要其他架构或安装格式，可在下方继续选择。"
                : "Start with the recommended package, or choose another architecture and format below."}
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
          const recommendation = preferredPlatform(product, detectedPlatform);
          const releaseAsset = latestByProduct.get(product.id);
          const releaseDate = releaseAsset?.lastModified;

          return (
            <article
              key={product.id}
              id={`download-panel-${product.id}`}
              role="tabpanel"
              aria-labelledby={`download-tab-${product.id}`}
              hidden={product.id !== activeProductId}
              className="overflow-hidden rounded-[10px] border border-[color:var(--color-surface-border)] bg-white/92 shadow-[var(--shadow-sm)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                      <PackageIcon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="rounded-full border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-text-muted">
                      {typeLabel}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-heading">
                    {productName}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
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
                    href={product.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[6px] bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-hover"
                  >
                    {isChinese ? "Release" : "Release"}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              </div>

              <div className="border-y border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/45 p-5 sm:p-6">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  {isChinese ? "为当前设备推荐" : "Recommended for your device"}
                </div>

                {recommendation ? (
                  <div className="rounded-[8px] border border-[color:var(--color-primary-border)] bg-white p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex items-start gap-3">
                        {(() => {
                          const Icon = platformIcons[recommendation.id];
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
                              ? recommendation.labelZh
                              : recommendation.label}
                          </h4>
                          <p className="mt-1 break-all font-mono text-[11px] text-text-muted">
                            {recommendation.asset?.name ??
                              (isChinese
                                ? "最新构建尚未镜像"
                                : "Latest build is not mirrored yet")}
                            {recommendation.asset?.size
                              ? ` · ${formatBytes(recommendation.asset.size, isChinese)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <a
                        href={recommendation.asset?.href ?? product.releaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[6px] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                      >
                        <Download className="h-4 w-4" aria-hidden />
                        {recommendation.asset
                          ? isChinese
                            ? "下载推荐包"
                            : "Download recommended"
                          : isChinese
                            ? "查看 Release"
                            : "View release"}
                      </a>
                    </div>
                    {recommendation.asset?.sha256 ? (
                      <p className="mt-4 border-t border-[color:var(--color-surface-border)] pt-3 font-mono text-[11px] text-text-muted">
                        SHA-256: {recommendation.asset.sha256}
                      </p>
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
                    {product.platforms.length} {isChinese ? "项" : "options"}
                  </span>
                </div>
                <div className="mt-3 divide-y divide-[color:var(--color-surface-border)] border-y border-[color:var(--color-surface-border)]">
                  {product.platforms
                    .filter((platform) => platform.id !== recommendation?.id)
                    .map((platform) => {
                      const Icon = platformIcons[platform.id];
                      const label = isChinese ? platform.labelZh : platform.label;
                      const detail = isChinese ? platform.detailZh : platform.detail;
                      return (
                        <div
                          key={platform.id}
                          className={`flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between ${!platform.supported ? "opacity-70" : ""}`}
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-heading">{label}</span>
                                <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] font-medium text-text-muted">
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
                              <p className="mt-1 break-all font-mono text-[11px] text-text-muted">
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
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            </a>
                          ) : (
                            <span className="text-xs font-medium text-text-subtle">
                              {isChinese ? "当前无可用包" : "No package available"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[color:var(--color-surface-border)] px-5 py-3.5 text-xs text-text-muted sm:px-6">
                <span>
                  {isChinese ? "最新发布" : "Latest release"}: {formatDate(releaseDate, isChinese)}
                </span>
                <a
                  href={product.releaseUrl}
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
