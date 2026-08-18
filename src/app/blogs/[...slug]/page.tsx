export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import BrandCTA from "@components/BrandCTA";
import BlogArticle from "@components/blog/BlogArticle";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getBlogPost } from "@lib/docsServiceClient";

type PageProps = {
  params: Promise<{ slug: string | string[] }>;
};

function formatDate(dateStr: string, language: "zh" | "en"): string {
  const date = new Date(dateStr);

  if (language === "zh") {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const slugParam = await params;
  const slugPath = Array.isArray(slugParam.slug)
    ? slugParam.slug.join("/")
    : slugParam.slug;
  let post;
  try {
    post = await getBlogPost(slugPath);
  } catch {
    post = undefined;
  }

  if (!post) {
    return { title: "Blog Post | XWork Tech" };
  }

  return {
    title: `${post.title} | XWork Tech Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const slugParam = await params;
  const slugPath = Array.isArray(slugParam.slug)
    ? slugParam.slug.join("/")
    : slugParam.slug;
  let post;
  try {
    post = await getBlogPost(slugPath);
  } catch {
    post = undefined;
  }

  if (!post) {
    notFound();
  }

  const language: "zh" | "en" = /[\u4e00-\u9fff]/.test(
    `${post.title} ${post.excerpt} ${post.plaintext ?? ""}`,
  )
    ? "zh"
    : "en";
  const isChinese = language === "zh";

  return (
    <PublicPageShell>
      <div className="space-y-6">
        <section className="rounded-[2.4rem] border border-slate-900/10 bg-[linear-gradient(180deg,#ffffff,#faf7f2)] p-6 shadow-[0_22px_50px_rgba(15,23,42,0.05)] sm:p-8 lg:p-10">
          <Link
            href="/blogs"
            className="inline-flex rounded-full border border-slate-900/10 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-900/15 hover:text-primary"
          >
            {isChinese ? "← 返回博客" : "← Back to Blog"}
          </Link>

          <div className="mt-6 space-y-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-subtle">
              {post.category?.label ?? "Blog"}
            </p>
            <h1
              className={
                isChinese
                  ? "text-[2.7rem] font-semibold leading-[0.9] tracking-[-0.08em] text-slate-900 sm:text-[3.4rem]"
                  : "editorial-display text-[2.9rem] leading-[0.92] tracking-[-0.06em] text-slate-900 sm:text-[3.6rem]"
              }
            >
              {post.title}
            </h1>
            <p className="max-w-3xl text-[1rem] leading-8 text-slate-600 sm:text-[1.05rem]">
              {post.excerpt}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {post.author ? (
              <span className="rounded-full border border-slate-900/10 bg-white px-3 py-1 text-sm text-slate-600">
                {isChinese ? "作者" : "By"} {post.author}
              </span>
            ) : null}
            {post.date ? (
              <time className="rounded-full border border-slate-900/10 bg-white px-3 py-1 text-sm text-slate-600">
                {formatDate(post.date, language)}
              </time>
            ) : null}
            {post.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-900/10 bg-[#f8f4ec] px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-900/10 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:p-9 xl:p-10">
          <BlogArticle
            html={post.html}
            toc={post.toc ?? []}
            language={language}
          />
        </section>

        <BrandCTA lang={language} />
      </div>
    </PublicPageShell>
  );
}
