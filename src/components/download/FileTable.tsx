"use client";

import { useMemo, useState } from "react";

import Breadcrumbs, { type Crumb } from "./Breadcrumbs";
import CopyButton from "./CopyButton";
import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";
import { formatBytes, formatDate } from "@lib/format";
import type { DirListing } from "@lib/download/types";

interface FileTableProps {
  listing: DirListing;
  breadcrumb: Crumb[];
  showBreadcrumbs?: boolean;
}

export default function FileTable({
  listing,
  breadcrumb,
  showBreadcrumbs = true,
}: FileTableProps) {
  const { language } = useLanguage();
  const locale = language === "zh" ? "zh-CN" : "en-US";
  const t = translations[language].download.fileTable;
  const copyLabel = translations[language].download.copyButton.tooltip;
  const [sort, setSort] = useState<"name" | "lastModified" | "size">("name");
  const [ext, setExt] = useState("");

  const filtered = useMemo(() => {
    return listing.entries
      .filter(
        (item) => !ext || item.name.toLowerCase().endsWith(ext.toLowerCase()),
      )
      .sort((a, b) => {
        switch (sort) {
          case "lastModified":
            return (
              new Date(b.lastModified || 0).getTime() -
              new Date(a.lastModified || 0).getTime()
            );
          case "size":
            return (b.size || 0) - (a.size || 0);
          default:
            return a.name.localeCompare(b.name, locale);
        }
      });
  }, [listing.entries, sort, ext, locale]);

  return (
    <div className="space-y-4">
      {showBreadcrumbs ? <Breadcrumbs items={breadcrumb} /> : null}

      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-900/10 bg-[#fcfbf8] p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-surface">
        <select
          className="rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-900/15"
          value={sort}
          onChange={(event) =>
            setSort(event.target.value as "name" | "lastModified" | "size")
          }
        >
          <option value="name">{t.sortName}</option>
          <option value="lastModified">{t.sortUpdated}</option>
          <option value="size">{t.sortSize}</option>
        </select>
        <input
          className="w-full rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-900/15 sm:max-w-xs"
          placeholder={t.filterPlaceholder}
          value={ext}
          onChange={(event) => setExt(event.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-[1.6rem] border border-slate-900/10 bg-white/92 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[#fcfbf8] text-slate-600 dark:bg-surface">
            <tr className="border-b border-slate-900/10">
              <th className="px-4 py-3 text-left font-semibold">
                {t.headers.name}
              </th>
              <th className="w-28 px-4 py-3 text-left font-semibold">
                {t.headers.size}
              </th>
              <th className="w-52 px-4 py-3 text-left font-semibold">
                {t.headers.updated}
              </th>
              <th className="w-40 px-4 py-3 text-left font-semibold">
                {t.headers.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const downloadUrl = item.href.startsWith("http")
                ? item.href
                : `https://dl.svc.plus${item.href}`;

              return (
                <tr
                  key={item.name}
                  className="border-b border-slate-900/8 last:border-0"
                >
                  <td className="px-4 py-3">
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary transition hover:text-primary-hover hover:underline"
                    >
                      {item.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatBytes(item.size || 0)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.lastModified
                      ? formatDate(item.lastModified, locale)
                      : "--"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <CopyButton text={downloadUrl} label={copyLabel} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
