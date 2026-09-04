"use client";

import { useMemo } from "react";

import Breadcrumbs, { type Crumb } from "./Breadcrumbs";
import CardGrid from "./CardGrid";
import FileTable from "./FileTable";
import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";
import { formatSegmentLabel, type DownloadSection } from "@lib/download-data";
import { formatDate } from "@lib/format";
import type { DirListing } from "@lib/download/types";

type DownloadListingContentProps = {
  segments: string[];
  title: string;
  subdirectorySections: DownloadSection[];
  fileListing: DirListing;
  totalFiles: number;
  latestModified?: string;
  relativePath: string;
  remotePath: string;
};

function formatCount(
  templates: { singular: string; plural: string },
  count: number,
  locale: string,
): string {
  const template = count === 1 ? templates.singular : templates.plural;
  return template.replace("{{count}}", count.toLocaleString(locale));
}

export default function DownloadListingContent({
  segments,
  title,
  subdirectorySections,
  fileListing,
  totalFiles,
  latestModified,
  relativePath,
  remotePath,
}: DownloadListingContentProps) {
  const { language } = useLanguage();
  const locale = language === "zh" ? "zh-CN" : "en-US";
  const t = translations[language].download;

  const breadcrumbItems = useMemo<Crumb[]>(() => {
    const crumbs: Crumb[] = [{ label: t.breadcrumbRoot, href: "/download" }];
    segments.forEach((segment, index) => {
      const hrefSegments = segments.slice(0, index + 1);
      crumbs.push({
        label: formatSegmentLabel(segment),
        href: `/download/${hrefSegments.join("/")}`,
      });
    });
    return crumbs;
  }, [segments, t.breadcrumbRoot]);

  const description = t.listing.headingDescription.replace(
    "{{directory}}",
    title,
  );
  const entryCountLabel = formatCount(
    t.listing.collectionsCount,
    subdirectorySections.length,
    locale,
  );
  const stats = [
    {
      label: t.listing.stats.subdirectories,
      value: subdirectorySections.length.toLocaleString(locale),
    },
    {
      label: t.listing.stats.files,
      value: totalFiles.toLocaleString(locale),
    },
    ...(latestModified
      ? [
          {
            label: t.listing.stats.lastUpdated,
            value: formatDate(latestModified, locale),
          },
        ]
      : []),
  ];

  const hasSubdirectories = subdirectorySections.length > 0;
  const hasFiles = fileListing.entries.length > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-900/10 bg-[linear-gradient(180deg,#ffffff,#faf7f2)] p-6 shadow-[0_20px_48px_rgba(15,23,42,0.05)] lg:p-7">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div className="space-y-3">
            <p className="text-eyebrow font-semibold uppercase tracking-[0.24em] text-text-subtle">
              {language === "zh" ? "下载目录" : "Download directory"}
            </p>
            <h1 className="text-4xl font-semibold leading-[0.95] tracking-[-0.06em] text-slate-900 sm:text-5xl">
              {title}
            </h1>
            <p className="text-sm leading-7 text-slate-600">{description}</p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.4rem] border border-slate-900/10 bg-white/85 p-4"
              >
                <dt className="text-sm text-slate-500">{item.label}</dt>
                <dd className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-900">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="space-y-6">
          {hasSubdirectories ? (
            <article className="rounded-[2rem] border border-slate-900/10 bg-white/92 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  {t.listing.collectionsTitle}
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  {entryCountLabel}
                </span>
              </div>
              <CardGrid sections={subdirectorySections} />
            </article>
          ) : null}

          {hasFiles ? (
            <article className="rounded-[2rem] border border-slate-900/10 bg-white/92 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <FileTable
                listing={fileListing}
                breadcrumb={breadcrumbItems}
                showBreadcrumbs={false}
              />
            </article>
          ) : null}

          {!hasSubdirectories && !hasFiles ? (
            <div className="rounded-[1.8rem] border border-dashed border-slate-900/12 bg-white/80 p-10 text-center text-sm text-slate-500">
              {t.listing.empty}
            </div>
          ) : null}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <article className="rounded-[2rem] border border-slate-900/10 bg-white/92 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <p className="text-eyebrow font-semibold uppercase tracking-[0.24em] text-text-subtle">
              {t.listing.infoTitle}
            </p>
            <dl className="mt-4 space-y-4 text-sm text-slate-600">
              <div>
                <dt className="text-slate-500">{t.listing.infoPath}</dt>
                <dd className="mt-1 break-all font-mono text-slate-900">
                  /{relativePath || segments.join("/")}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.listing.infoSource}</dt>
                <dd className="mt-1 break-all">
                  <a
                    href={remotePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary transition hover:text-primary-hover hover:underline"
                  >
                    {remotePath}
                  </a>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-6 text-text-subtle">
              {t.listing.infoNotice}
            </p>
          </article>
        </aside>
      </div>
    </div>
  );
}
