export const dynamic = "force-dynamic";
export const revalidate = 0;

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
import { headers } from "next/headers";

import { PublicPageIntro } from "@/components/public/PublicPageShell";
import {
  getDocCollections,
  getDocsHome,
  type DocCollectionPayload,
} from "@/lib/docsServiceClient";
import docsHomeContent from "@/data/content/docs-home";
import DocsSearch from "./DocsSearch";

const collectionIcons: Record<string, LucideIcon> = {
  xworkmate: Blocks,
  xconnect: Network,
  "ai-workspace": Sparkles,
  "open-platform": Boxes,
};

const PRODUCT_GROUPS = [
  {
    slug: "xworkmate",
    sourceSlugs: ["01-console", "02-accounts"],
    zh: {
      title: "XWorkmate",
      description:
        "AI Workspace · 让 AI 真正参与你的工作，而不是停留在对话中。",
    },
    en: {
      title: "XWorkmate",
      description:
        "AI Workspace · Bring AI into real work instead of keeping it in conversation.",
    },
  },
  {
    slug: "xconnect",
    sourceSlugs: ["integrations", "03-rag-server"],
    zh: {
      title: "XConnect",
      description:
        "AI Connectivity · 为你的 AI Workspace 提供稳定、安全的连接能力。",
    },
    en: {
      title: "XConnect",
      description:
        "AI Connectivity · Stable, secure connectivity for your AI Workspace.",
    },
  },
  {
    slug: "ai-workspace",
    sourceSlugs: ["get-started", "core-concepts", "zh", "en"],
    zh: {
      title: "AI Workspace",
      description: "对话、任务与工具一体化，持续产出可交付成果。",
    },
    en: {
      title: "AI Workspace",
      description:
        "Conversations, tasks, and tools in one place—continuously producing deliverables.",
    },
  },
  {
    slug: "open-platform",
    sourceSlugs: ["04-postgresql", "reference"],
    zh: {
      title: "Open Platform",
      description:
        "Platform & Infrastructure · 提供可控、可扩展的基础支撑，支持从托管到自建。",
    },
    en: {
      title: "Open Platform",
      description:
        "Platform & Infrastructure · Controlled, extensible foundations from managed services to self-hosting.",
    },
  },
] as const;

function toProductCollections(
  collections: DocCollectionPayload[],
  language: "zh" | "en",
): DocCollectionPayload[] {
  const bySlug = new Map(
    collections.map((collection) => [collection.slug, collection]),
  );

  return PRODUCT_GROUPS.map((group) => {
    const sources = group.sourceSlugs
      .map((slug) => bySlug.get(slug))
      .filter((collection): collection is DocCollectionPayload =>
        Boolean(collection),
      );
    const primary = sources[0];
    const versions = sources.flatMap((collection) => collection.versions);
    const entryVersion =
      primary?.defaultVersionSlug || primary?.versions[0]?.slug;

    return {
      slug: group.slug,
      title: group[language].title,
      description: group[language].description,
      updatedAt: primary?.updatedAt,
      tags: Array.from(
        new Set(sources.flatMap((collection) => collection.tags)),
      ),
      versions,
      defaultVersionSlug: entryVersion || "overview",
      entryHref:
        primary && entryVersion
          ? `/docs/${primary.slug}/${entryVersion}`
          : "/docs",
      articleCount: versions.length,
      category: primary?.category,
    };
  });
}

export default async function DocsHome() {
  const headerStore = await headers();
  const preferred =
    headerStore.get("x-language") ??
    headerStore.get("accept-language") ??
    "";
  const language: "zh" | "en" = preferred.toLowerCase().includes("zh")
    ? "zh"
    : "en";
  const isChinese = language === "zh";

  let home;
  let rawCollections: DocCollectionPayload[] = [];

  try {
    const [h, c] = await Promise.all([getDocsHome(), getDocCollections()]);
    home = h;
    rawCollections = c;
  } catch {
    const fallback =
      (docsHomeContent as any)[language] || (docsHomeContent as any).zh;
    home = fallback?.home;
    rawCollections = fallback?.collections || [];
  }

  const collections =
    rawCollections.length > 0
      ? toProductCollections(rawCollections, language)
      : [];

  const firstCollectionHref =
    collections[0]?.entryHref ||
    (collections[0]
      ? `/docs/${collections[0].slug}/${collections[0].defaultVersionSlug}`
      : "/docs/get-started/overview");

  const articleCount = collections.reduce(
    (sum: number, collection: any) =>
      sum + (collection.articleCount ?? collection.versions?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.65rem] border border-slate-900/10 bg-[radial-gradient(circle_at_88%_18%,rgba(0,88,189,0.12),transparent_29%),linear-gradient(135deg,#ffffff_0%,#fbfcfd_58%,#f2f6fb_100%)] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.05)] sm:p-7 lg:p-8">
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div className="min-w-0">
            <PublicPageIntro
              eyebrow={isChinese ? "文档中心" : "Documentation"}
              title={home?.title || "Documentation"}
              subtitle={
                home?.description ||
                "Unified references for XWork Tech Toolkit services."
              }
              titleClassName="editorial-display max-w-5xl text-[2.35rem] tracking-[-0.065em] sm:text-[3rem] lg:text-[3.15rem]"
            />

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                href={firstCollectionHref}
                className="tactile-button tactile-button-primary"
              >
                {isChinese ? "开始阅读" : "Start reading"}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <a
                href="#collections"
                className="tactile-button tactile-button-subtle"
              >
                {isChinese ? "浏览合集" : "Browse collections"}
              </a>
              <DocsSearch className="sm:w-auto" />
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/82 p-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)] backdrop-blur-sm">
            <p className="px-2 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-subtle">
              {isChinese ? "内容概览" : "Library snapshot"}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-[0.95rem] border border-slate-900/8 bg-white/90 p-3.5">
                <div className="flex items-center gap-2 text-slate-900">
                  <BookCopy className="h-4 w-4 text-primary" aria-hidden />
                  <span className="text-sm font-semibold">
                    {isChinese ? "内容集合" : "Collections"}
                  </span>
                </div>
                <p className="mt-1.5 text-2xl font-semibold tracking-[-0.05em] text-slate-900">
                  {collections.length}
                </p>
              </div>
              <div className="rounded-[0.95rem] border border-slate-900/8 bg-white/90 p-3.5">
                <div className="flex items-center gap-2 text-slate-900">
                  <Files className="h-4 w-4 text-primary" aria-hidden />
                  <span className="text-sm font-semibold">
                    {isChinese ? "文档文章" : "Articles"}
                  </span>
                </div>
                <p className="mt-1.5 text-2xl font-semibold tracking-[-0.05em] text-slate-900">
                  {articleCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {collections.length > 0 ? (
        <section
          id="collections"
          className="scroll-mt-24 rounded-[1.35rem] border border-slate-900/10 bg-white/78 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.035)] sm:p-5 lg:p-6"
        >
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

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            {collections.map((collection: any) => {
              const Icon = collectionIcons[collection.slug] || BookCopy;
              return (
                <Link
                  key={collection.slug}
                  href={
                    collection.entryHref ||
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
                      {collection.articleCount ??
                        collection.versions?.length ??
                        0}{" "}
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
