"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";

import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";
import { formatSegmentLabel } from "@lib/download-data";
import { formatDate } from "@lib/format";

interface Section {
  key: string;
  title: string;
  href: string;
  lastModified?: string;
  count?: number;
  root?: string;
}

export default function CardGrid({ sections }: { sections: Section[] }) {
  const { language } = useLanguage();
  const locale = language === "zh" ? "zh-CN" : "en-US";
  const t = translations[language].download.cardGrid;
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"lastModified" | "title">("lastModified");

  const filtered = useMemo(() => {
    return sections
      .filter((section) =>
        section.title.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) =>
        sort === "title"
          ? a.title.localeCompare(b.title, locale)
          : new Date(b.lastModified || 0).getTime() -
            new Date(a.lastModified || 0).getTime(),
      );
  }, [sections, search, sort, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-900/10 bg-[#fcfbf8] p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-surface">
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-900/15"
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as "lastModified" | "title")
            }
          >
            <option value="lastModified">{t.sortUpdated}</option>
            <option value="title">{t.sortName}</option>
          </select>
        </div>
        <input
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-900/15 sm:max-w-xs"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((section) => (
          <Link
            key={section.key}
            href={section.href}
            className="group rounded-[1.6rem] border border-slate-900/10 bg-white/92 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-[1px] hover:bg-white"
          >
            <div className="flex h-full flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-3">
                  {section.root ? (
                    <span className="inline-flex w-fit items-center rounded-full border border-slate-900/10 bg-[#f8f4ec] px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-surface">
                      {formatSegmentLabel(section.root)}
                    </span>
                  ) : null}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/[0.04] text-sm font-semibold text-primary">
                    {section.title.charAt(0).toUpperCase()}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-primary" />
              </div>

              <div className="space-y-2">
                <div className="text-base font-semibold leading-7 text-slate-900">
                  {section.title}
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  {section.lastModified ? (
                    <p>
                      <span>{t.updatedLabel}</span>
                      <span className="ml-1">
                        {formatDate(section.lastModified, locale)}
                      </span>
                    </p>
                  ) : null}
                  {section.count !== undefined ? (
                    <p>
                      <span>{t.itemsLabel}</span>
                      <span className="ml-1">
                        {section.count.toLocaleString(locale)}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
