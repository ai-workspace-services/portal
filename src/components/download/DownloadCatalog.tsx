"use client";

import {
  Apple,
  Boxes,
  CheckCircle2,
  ExternalLink,
  Github,
  Monitor,
  PackageIcon,
  Smartphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useLanguage } from "@i18n/LanguageProvider";
import type {
  DownloadCatalogProduct,
  DownloadPlatformId,
} from "@lib/download/catalog";

type DownloadCatalogProps = {
  catalog: DownloadCatalogProduct[];
};

const platformIcons = {
  macos: Apple,
  windows: Monitor,
  linux: Boxes,
  ios: Smartphone,
  android: Smartphone,
} satisfies Record<DownloadPlatformId, LucideIcon>;

export default function DownloadCatalog({ catalog }: DownloadCatalogProps) {
  const { language } = useLanguage();
  const isChinese = language === "zh";

  return (
    <section className="space-y-5" aria-labelledby="release-matrix-heading">
      <div className="rounded-[8px] border border-[color:var(--color-surface-border)] bg-white/90 p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-text-subtle">
              {isChinese ? "产品发布矩阵" : "Product release matrix"}
            </p>
            <h2
              id="release-matrix-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-heading"
            >
              {isChinese
                ? "按产品与平台选择安装包"
                : "Choose a package by product and platform"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
              {isChinese
                ? "页面会优先映射 dl.svc.plus 中已镜像的最新制品；镜像尚未就绪时，可直接前往发布页获取对应版本。"
                : "The latest package mirrored to dl.svc.plus is used when available; otherwise, continue to the product release page."}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs font-medium text-text-muted lg:self-auto">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
            {isChinese
              ? "发布源与构建工作流已关联"
              : "Release sources are linked"}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {catalog.map((product) => {
          const productName = isChinese ? product.nameZh : product.name;
          const description = isChinese
            ? product.descriptionZh
            : product.description;
          const typeLabel =
            product.kind === "offline"
              ? isChinese
                ? "离线安装包"
                : "Offline installer"
              : isChinese
                ? "多平台客户端"
                : "Multi-platform client";

          return (
            <article
              key={product.id}
              className="rounded-[8px] border border-[color:var(--color-surface-border)] bg-white/92 p-5 shadow-[var(--shadow-sm)] sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
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
                  <p className="mt-1.5 text-sm leading-6 text-text-muted">
                    {description}
                  </p>
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
                    {isChinese ? "所有版本" : "All releases"}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {product.platforms.map((platform) => {
                  const Icon = platformIcons[platform.id];
                  const label = isChinese ? platform.labelZh : platform.label;
                  const detail = isChinese
                    ? platform.detailZh
                    : platform.detail;
                  const actionLabel = platform.asset
                    ? isChinese
                      ? "下载最新包"
                      : "Download latest"
                    : isChinese
                      ? "查看发布版本"
                      : "View releases";

                  return (
                    <div
                      key={platform.id}
                      className={`rounded-[7px] border p-4 ${
                        platform.supported
                          ? "border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/60"
                          : "border-dashed border-[color:var(--color-surface-border)] bg-slate-50/70 opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 text-primary" aria-hidden />
                          <span className="text-sm font-semibold text-heading">
                            {label}
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            platform.supported
                              ? "bg-emerald-500/10 text-emerald-700"
                              : "bg-slate-500/10 text-slate-600"
                          }`}
                        >
                          {platform.supported
                            ? isChinese
                              ? "已支持"
                              : "Supported"
                            : isChinese
                              ? "未支持"
                              : "Unavailable"}
                        </span>
                      </div>
                      <p className="mt-3 min-h-10 text-xs leading-5 text-text-muted">
                        {detail}
                      </p>
                      {platform.supported ? (
                        <a
                          href={platform.asset?.href ?? product.releaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover hover:underline"
                        >
                          {actionLabel}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      ) : (
                        <span className="mt-3 inline-flex text-xs font-medium text-text-subtle">
                          {isChinese ? "当前无可用包" : "No package available"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
