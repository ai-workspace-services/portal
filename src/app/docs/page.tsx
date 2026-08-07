"use client";

import {
  ArrowRight,
  Blocks,
  Boxes,
  BookCopy,
  Files,
  Network,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { PublicPageIntro } from "@/components/public/PublicPageShell";
import { useLanguage } from "@/i18n/LanguageProvider";
import docsHomeContent from "@/data/content/docs-home";

const collectionIcons: Record<string, LucideIcon> = {
  xworkmate: Blocks,
  xconnect: Network,
  "open-platform": Boxes,
};

export default function DocsHome() {
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const content =
    (docsHomeContent as any)[language] || (docsHomeContent as any).zh;
  const collections = content?.collections || [];
  const home = content?.home;
  const articleCount = collections.reduce(
    (sum: number, collection: any) => sum + (collection.versions?.length || 0),
    0,
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.65rem] border border-slate-900/10 bg-[radial-gradient(circle_at_88%_18%,rgba(0,88,189,0.12),transparent_29%),linear-gradient(135deg,#ffffff_0%,#fbfcfd_58%,#f2f6fb_100%)] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.05)] sm:p-8 lg:p-10">
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <PublicPageIntro
            eyebrow={isChinese ? "文档中心" : "Documentation"}
            title={home?.title || "Documentation"}
            subtitle={
              home?.description ||
              "Unified references for Cloud-Neutral Toolkit services."
            }
            titleClassName="editorial-display text-[2.8rem] tracking-[-0.07em] sm:text-[3.6rem]"
          />

          <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/82 p-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)] backdrop-blur-sm">
            <p className="px-2 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-subtle">
              {isChinese ? "内容概览" : "Library snapshot"}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[0.95rem] border border-slate-900/8 bg-white/90 p-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <BookCopy className="h-4 w-4 text-primary" aria-hidden />
                  <span className="text-sm font-semibold">
                    {isChinese ? "内容集合" : "Collections"}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-900">
                  {collections.length}
                </p>
              </div>
              <div className="rounded-[0.95rem] border border-slate-900/8 bg-white/90 p-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <Files className="h-4 w-4 text-primary" aria-hidden />
                  <span className="text-sm font-semibold">
                    {isChinese ? "文档文章" : "Articles"}
                  </span>
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
        <section className="rounded-[1.35rem] border border-slate-900/10 bg-white/78 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.035)] sm:p-5 lg:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-subtle">
                {isChinese ? "浏览内容集合" : "Browse collections"}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                {isChinese
                  ? "按产品域进入指南、架构说明与操作参考。"
                  : "Enter a product domain to find guides, architecture notes, and operating references."}
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-slate-900/8 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-700">
              {collections.length} {isChinese ? "个集合" : "collections"}
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {collections.map((collection: any) => {
              const Icon = collectionIcons[collection.slug] || BookCopy;
              return (
                <Link
                  key={collection.slug}
                  href={
                    "/docs/" +
                    collection.slug +
                    "/" +
                    collection.defaultVersionSlug
                  }
                  className="group relative flex min-h-[16rem] flex-col overflow-hidden rounded-[1.15rem] border border-slate-900/10 bg-white/86 p-5 transition duration-200 hover:-translate-y-[2px] hover:border-primary/20 hover:bg-white hover:shadow-[0_18px_34px_rgba(15,23,42,0.07)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[0.9rem] bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <ArrowRight
                      className="mt-2 h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-primary"
                      aria-hidden
                    />
                  </div>
                  <div className="mt-6 flex-1">
                    <h2 className="text-[1.15rem] font-semibold leading-7 tracking-[-0.04em] text-slate-900">
                      {collection.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {collection.description}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-slate-900/8 pt-4">
                    <span className="text-xs font-semibold text-slate-500">
                      {collection.versions?.length || 0}{" "}
                      {isChinese ? "篇文章" : "articles"}
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      {isChinese ? "进入集合" : "Open collection"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.35rem] border border-primary/15 bg-primary/[0.045] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.025)] sm:p-6">
        <div className="flex gap-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-primary/70">
              {isChinese ? "使用说明" : "Overview"}
            </p>
            <article
              className="public-doc-prose mt-2 text-[0.98rem]"
              dangerouslySetInnerHTML={{ __html: home?.html ?? "" }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
