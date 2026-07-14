"use client";

import { ArrowRight, BookCopy, Files } from "lucide-react";
import Link from "next/link";
import { PublicPageIntro } from "@/components/public/PublicPageShell";
import { useLanguage } from "@/i18n/LanguageProvider";
import docsHomeContent from "@/data/content/docs-home.json";

export default function DocsHome() {
  const { language } = useLanguage();
  const content = docsHomeContent[language as keyof typeof docsHomeContent];
  const { home, collections } = content;
  
  const articleCount = collections.reduce(
    (sum: number, collection: any) => sum + (collection.versions?.length || 0),
    0,
  );

  return (
    <div className="space-y-4">
      <section className="rounded-[1rem] border border-slate-900/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,248,250,0.98))] p-5 shadow-[var(--shadow-soft)] lg:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <PublicPageIntro
            eyebrow={language === 'zh' ? "文档中心" : "Documentation"}
            title={home?.title || "Documentation"}
            subtitle={
              home?.description ||
              "Unified references for Cloud-Neutral Toolkit services."
            }
            titleClassName="editorial-display text-[2.8rem] tracking-[-0.06em] sm:text-[3.4rem]"
          />

          <div className="grid gap-3 rounded-[0.95rem] border border-slate-900/8 bg-white/84 p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-subtle">
              Library snapshot
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[0.9rem] border border-slate-900/8 bg-white/80 p-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <BookCopy className="h-4 w-4 text-primary" aria-hidden />
                  <span className="text-sm font-semibold">Collections</span>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-900">
                  {collections.length}
                </p>
              </div>
              <div className="rounded-[0.9rem] border border-slate-900/8 bg-white/80 p-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <Files className="h-4 w-4 text-primary" aria-hidden />
                  <span className="text-sm font-semibold">Articles</span>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-900">
                  {articleCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {collections.length > 0 ? (
        <section className="rounded-[1rem] border border-slate-900/8 bg-white/88 p-4 shadow-[var(--shadow-soft)] lg:p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-subtle">
                Browse collections
              </p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Documentation sections now use the same card language as the
                rest of the public site.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-[12px] border border-slate-900/8 bg-white/82 px-3 py-1.5 text-xs font-semibold text-slate-700">
              {collections.length} collections
            </span>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {collections.map((collection: any) => (
              <Link
                key={collection.slug}
                href={`/docs/${collection.slug}/${collection.defaultVersionSlug}`}
                className="group rounded-[0.9rem] border border-slate-900/8 bg-white/82 p-4 transition duration-200 hover:-translate-y-[1px] hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-[1.05rem] font-semibold leading-7 tracking-[-0.03em] text-slate-900">
                      {collection.title}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {collection.description}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-primary" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-[12px] border border-slate-900/8 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {collection.versions?.length || 0} articles
                  </span>
                  {(collection.tags || []).slice(0, 2).map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-[12px] border border-slate-900/8 bg-white px-3 py-1.5 text-xs font-medium text-slate-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[1rem] border border-slate-900/8 bg-white/90 p-5 shadow-[var(--shadow-soft)] lg:p-6">
        <div className="mb-5 border-b border-slate-900/10 pb-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-subtle">
            Overview
          </p>
        </div>
        <article
          className="public-doc-prose"
          dangerouslySetInnerHTML={{ __html: home?.html ?? "" }}
        />
      </section>
    </div>
  );
}
