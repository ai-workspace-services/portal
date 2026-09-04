"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";

import BrandCTA from "@components/BrandCTA";
import { PublicPageIntro } from "@/components/public/PublicPageShell";
import SearchComponent from "@components/search";
import { useLanguage } from "@i18n/LanguageProvider";

type BlogCategory = {
  key: string;
  label: string;
};

type BlogPostSummary = {
  slug: string;
  title: string;
  author?: string;
  date?: string;
  tags: string[];
  excerpt: string;
  category?: BlogCategory;
};

function formatDate(
  dateStr: string | undefined,
  language: "zh" | "en",
): string {
  if (!dateStr) return "";

  const date = new Date(dateStr);

  return date.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface BlogListProps {
  posts: BlogPostSummary[];
  categories: BlogCategory[];
}

function buildCategoryCounts(posts: BlogPostSummary[]) {
  return posts.reduce<Record<string, number>>((acc, post) => {
    const categoryKey = post.category?.key;
    if (!categoryKey) return acc;
    acc[categoryKey] = (acc[categoryKey] || 0) + 1;
    return acc;
  }, {});
}

export default function BlogList({ posts, categories }: BlogListProps) {
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category");
  const page = searchParams.get("page");

  const categoryTabs = useMemo(() => {
    const categoriesFromPosts = posts
      .map((post) => post.category)
      .filter(
        (category): category is NonNullable<BlogPostSummary["category"]> =>
          Boolean(category),
      )
      .map((category) => ({
        key: category.key,
        label: category.label ?? category.key,
      }));

    return [...categories, ...categoriesFromPosts].filter(
      (category, index, self) =>
        self.findIndex((item) => item.key === category.key) === index,
    );
  }, [categories, posts]);

  const categoryCounts = useMemo(() => buildCategoryCounts(posts), [posts]);
  const filteredPosts = useMemo(() => {
    if (!selectedCategory) return posts;
    return posts.filter((post) => post.category?.key === selectedCategory);
  }, [posts, selectedCategory]);

  const postsPerPage = 10;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredPosts.length / postsPerPage),
  );
  const currentPage = useMemo(() => {
    const parsed = Number(page || "1");
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.min(parsed, totalPages);
  }, [page, totalPages]);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage,
  );
  const featuredPost =
    !selectedCategory && currentPage === 1 ? paginatedPosts[0] : undefined;
  const secondaryPosts = featuredPost
    ? paginatedPosts.slice(1)
    : paginatedPosts;

  const getCategoryHref = (key: string, isActive: boolean) =>
    "/blogs" + (isActive ? "" : "?category=" + key);
  const getPageHref = (pageNumber: number) =>
    "/blogs?page=" +
    pageNumber +
    (selectedCategory ? "&category=" + selectedCategory : "");
  const getPillClass = (isActive: boolean) =>
    isActive
      ? "border-slate-900/10 bg-slate-950 text-white"
      : "border-transparent bg-transparent text-slate-700 hover:border-slate-900/10 hover:bg-[#fcfbf8]";
  const getPillCountClass = (isActive: boolean) =>
    isActive ? "bg-white/20 text-white" : "bg-[#f8f4ec] text-slate-700";

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="overflow-hidden rounded-[1.65rem] border border-slate-900/10 bg-[linear-gradient(135deg,#ffffff_0%,#fbfaf7_62%,#f1f5fb_100%)] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.05)] sm:p-8 lg:p-10">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
          <PublicPageIntro
            eyebrow={isChinese ? "博客与动态" : "Editorial notes"}
            title={
              isChinese ? "产品日志与架构随笔" : "Product Notes & Field Updates"
            }
            subtitle={
              isChinese
                ? "把产品更新、发布日志和架构观察收进同一套公开页阅读语法。"
                : "A calmer feed for releases, essays, and field notes across the XWork Tech stack."
            }
            titleClassName={
              isChinese
                ? "text-5xl tracking-[-0.08em] sm:text-6xl"
                : "editorial-display text-5xl tracking-[-0.06em] sm:text-6xl"
            }
          />

          <div className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] backdrop-blur-sm">
            <p className="text-eyebrow font-semibold uppercase tracking-[0.24em] text-text-subtle">
              {isChinese ? "搜索文章" : "Search notes"}
            </p>
            <div className="mt-3">
              <SearchComponent
                className="max-w-none"
                inputClassName="w-full rounded-full border border-slate-900/10 bg-[#fcfbf8] py-3 pl-5 pr-12 text-sm text-slate-700 shadow-none focus:border-slate-900/15 focus:bg-white focus:ring-2 focus:ring-primary/15"
                buttonClassName="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-primary"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-slate-900/10 bg-white/80 p-2 shadow-[0_12px_28px_rgba(15,23,42,0.035)] sm:p-3">
        <nav
          aria-label={isChinese ? "博客分类" : "Blog categories"}
          className="flex min-w-max gap-2 overflow-x-auto pb-0.5"
        >
          <Link
            href="/blogs"
            className={
              "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition " +
              getPillClass(!selectedCategory)
            }
          >
            {isChinese ? "全部" : "All"}
            <span
              className={
                "rounded-full px-2 py-0.5 text-xs font-bold " +
                getPillCountClass(!selectedCategory)
              }
            >
              {posts.length}
            </span>
          </Link>
          {categoryTabs.map((tab) => {
            const isActive = tab.key === selectedCategory;
            const labelWithCount = categoryCounts[tab.key];
            return (
              <Link
                key={tab.key}
                href={getCategoryHref(tab.key, isActive)}
                className={
                  "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition " +
                  getPillClass(isActive)
                }
                aria-current={isActive ? "page" : undefined}
              >
                <span>{tab.label}</span>
                {labelWithCount ? (
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-bold " +
                      getPillCountClass(isActive)
                    }
                  >
                    {labelWithCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </section>

      {filteredPosts.length === 0 ? (
        <div className="rounded-[1.25rem] border border-dashed border-slate-900/12 bg-white/80 py-20 text-center text-sm text-slate-500">
          {isChinese ? "暂无博客文章" : "No posts found."}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 px-1 text-sm text-slate-500">
            <p className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" aria-hidden />
              {isChinese
                ? "共 " + filteredPosts.length + " 篇文章"
                : filteredPosts.length + " notes in this view"}
            </p>
            {totalPages > 1 ? (
              <span>
                {isChinese
                  ? "第 " + currentPage + " / " + totalPages + " 页"
                  : "Page " + currentPage + " of " + totalPages}
              </span>
            ) : null}
          </div>

          {featuredPost ? (
            <article className="group relative overflow-hidden rounded-[1.5rem] border border-primary/12 bg-[linear-gradient(135deg,#ffffff_0%,#f8faff_56%,#edf3ff_100%)] p-6 text-slate-900 shadow-[0_22px_50px_rgba(15,23,42,0.07)] sm:p-8 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(15rem,0.65fr)] lg:gap-10 lg:p-9">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
              <div className="relative flex flex-col">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                  <span className="rounded-full border border-primary/15 bg-white/85 px-3 py-1 text-slate-800 shadow-sm">
                    {isChinese ? "本期精选" : "Featured note"}
                  </span>
                  <span className="text-slate-600">
                    {featuredPost.category?.label ?? "Blog"}
                  </span>
                  {featuredPost.date ? (
                    <time className="text-slate-600">
                      {formatDate(featuredPost.date, language)}
                    </time>
                  ) : null}
                </div>
                <h2 className="mt-6 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-4xl">
                  {featuredPost.title}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700 sm:text-base">
                  {featuredPost.excerpt}
                </p>
                <Link
                  href={"/blogs/" + featuredPost.slug}
                  prefetch={false}
                  className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary"
                >
                  {isChinese ? "阅读精选" : "Read featured note"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>

              <div className="relative mt-8 rounded-[1.15rem] border border-slate-900/10 bg-white/82 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] lg:mt-0 lg:self-end">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                  {isChinese ? "从现场出发" : "From the field"}
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  {isChinese
                    ? "产品更新、工程实践与真实交付经验，按主题持续整理。"
                    : "Product updates, engineering practice, and real delivery lessons — kept close to the work."}
                </p>
              </div>
            </article>
          ) : null}

          {secondaryPosts.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {secondaryPosts.map((post) => (
                <article
                  key={post.slug}
                  className="group flex h-full flex-col rounded-[1.25rem] border border-slate-900/10 bg-white/88 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-[2px] hover:border-primary/20 hover:bg-white hover:shadow-[0_18px_34px_rgba(15,23,42,0.07)] sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full border border-slate-900/10 bg-[#f8f4ec] px-3 py-1 text-xs font-semibold text-slate-600">
                      {post.category?.label ?? "Blog"}
                    </span>
                    {post.date ? (
                      <time className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden />
                        {formatDate(post.date, language)}
                      </time>
                    ) : null}
                  </div>

                  <div className="mt-5 flex-1 space-y-3">
                    <h2 className="text-xl font-semibold leading-[1.1] tracking-[-0.04em] text-slate-900">
                      {post.title}
                    </h2>
                    {post.author ? (
                      <p className="text-xs font-medium text-slate-500">
                        {isChinese ? "作者" : "By"} {post.author}
                      </p>
                    ) : null}
                    <p className="text-sm leading-7 text-slate-600">
                      {post.excerpt}
                    </p>
                  </div>

                  <div className="mt-6 flex items-end justify-between gap-4 border-t border-slate-900/8 pt-4">
                    {post.tags && post.tags.length > 0 ? (
                      <div className="flex min-w-0 flex-wrap gap-1.5">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-slate-900/10 bg-[#fcfbf8] px-2.5 py-1 text-eyebrow font-medium text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span />
                    )}
                    <Link
                      href={"/blogs/" + post.slug}
                      prefetch={false}
                      className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary transition group-hover:gap-2.5 hover:text-primary-hover"
                    >
                      {isChinese ? "继续阅读" : "Read more"}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label={isChinese ? "博客分页" : "Blog pagination"}
          className="flex flex-wrap items-center justify-center gap-2 pt-2"
        >
          <Link
            href={getPageHref(Math.max(1, currentPage - 1))}
            className={
              "rounded-full border px-4 py-2 text-sm font-semibold transition " +
              (currentPage === 1
                ? "pointer-events-none border-slate-900/8 bg-white text-slate-300"
                : "border-slate-900/10 bg-white text-slate-700 hover:border-slate-900/15 hover:bg-[#fcfbf8]")
            }
            aria-disabled={currentPage === 1}
          >
            {isChinese ? "上一页" : "Previous"}
          </Link>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNumber) => (
              <Link
                key={pageNumber}
                href={getPageHref(pageNumber)}
                className={
                  "rounded-full border px-4 py-2 text-sm font-semibold transition " +
                  (pageNumber === currentPage
                    ? "border-slate-900/10 bg-slate-950 text-white"
                    : "border-slate-900/10 bg-white text-slate-700 hover:border-slate-900/15 hover:bg-[#fcfbf8]")
                }
                aria-current={pageNumber === currentPage ? "page" : undefined}
              >
                {pageNumber}
              </Link>
            ),
          )}

          <Link
            href={getPageHref(Math.min(totalPages, currentPage + 1))}
            className={
              "rounded-full border px-4 py-2 text-sm font-semibold transition " +
              (currentPage === totalPages
                ? "pointer-events-none border-slate-900/8 bg-white text-slate-300"
                : "border-slate-900/10 bg-white text-slate-700 hover:border-slate-900/15 hover:bg-[#fcfbf8]")
            }
            aria-disabled={currentPage === totalPages}
          >
            {isChinese ? "下一页" : "Next"}
          </Link>
        </nav>
      ) : null}

      <BrandCTA lang={language} variant="compact" />
    </div>
  );
}
