/**
 * /docs 文档中心首页。内容由 content-service 提供（首页正文 + 文档集合），
 * 服务端渲染，品牌域名下直接返回 200，不再跳转到 /support。
 * content-service 不可达时仍渲染公开的 GitHub 文档入口，保证页面始终有实质内容。
 */
import Link from "next/link";

import { PublicPageIntro } from "@/components/public/PublicPageShell";
import { COMPANY_GITHUB_URL, PRODUCT_SOURCES } from "@/lib/company";
import { getContentLanguage } from "@server/contentLanguage";

import { getDocCollections, getDocsHomeContent } from "./resources.server";
import type { DocCollection } from "./types";

export const revalidate = 300;

function collectionHref(collection: DocCollection): string {
  if (collection.entryHref) return collection.entryHref;
  const version =
    collection.versions.find((item) => item.slug === collection.defaultVersionSlug) ??
    collection.versions[0];
  return version ? `/docs/${collection.slug}/${version.slug}` : `/docs/${collection.slug}`;
}

export default async function DocsHomePage() {
  const isChinese = (await getContentLanguage().catch(() => "en")) === "zh";
  const [home, collections] = await Promise.all([
    getDocsHomeContent().catch(() => undefined),
    getDocCollections().catch(() => [] as DocCollection[]),
  ]);

  const title = isChinese ? "文档中心" : "Documentation";
  const subtitle =
    home?.description ||
    (isChinese
      ? "XWorkmate、XConnect 与开放平台的使用指南、架构说明与运维手册。"
      : "Guides, architecture notes, and runbooks for XWorkmate, XConnect, and the open platform.");
  const repositories = Object.values(PRODUCT_SOURCES).flatMap((item) => item.repositories);
  const uniqueRepositories = [...new Map(repositories.map((item) => [item.href, item])).values()];

  return (
    <div className="space-y-6">
      <section className="rounded-[1rem] border border-slate-900/8 bg-white/90 p-5 shadow-[var(--shadow-soft)] lg:p-6">
        <PublicPageIntro
          eyebrow={isChinese ? "文档" : "Docs"}
          title={title}
          subtitle={subtitle}
          titleClassName="text-4xl tracking-[-0.06em] sm:text-5xl"
        />
      </section>

      {home?.html ? (
        <section className="rounded-[1rem] border border-slate-900/8 bg-white/90 p-5 shadow-[var(--shadow-soft)] lg:p-6">
          <article
            className="public-doc-prose"
            dangerouslySetInnerHTML={{ __html: home.html }}
          />
        </section>
      ) : null}

      {collections.length > 0 ? (
        <section aria-labelledby="docs-collections" className="space-y-4">
          <h2 id="docs-collections" className="text-xl font-semibold text-slate-950">
            {isChinese ? "文档集合" : "Collections"}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <Link
                  href={collectionHref(collection)}
                  className="block h-full rounded-[1rem] border border-slate-900/8 bg-white p-5 shadow-[var(--shadow-soft)] transition hover:border-primary"
                >
                  <span className="block text-base font-semibold text-slate-950">
                    {collection.title}
                  </span>
                  {collection.description ? (
                    <span className="mt-2 block text-sm text-text-muted">
                      {collection.description}
                    </span>
                  ) : null}
                  <span className="mt-3 block text-xs text-text-subtle">
                    {isChinese ? "文章数" : "Articles"}:{" "}
                    {collection.articleCount ?? collection.versions.length}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="docs-source" className="space-y-4">
        <h2 id="docs-source" className="text-xl font-semibold text-slate-950">
          {isChinese ? "开源仓库与 README" : "Source repositories and READMEs"}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {uniqueRepositories.map((repository) => (
            <li key={repository.href}>
              <a
                href={repository.href}
                rel="noopener"
                className="block rounded-[0.95rem] border border-slate-900/8 bg-white px-4 py-3 text-sm font-medium text-primary hover:underline"
              >
                {repository.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-sm text-text-muted">
          <a href={COMPANY_GITHUB_URL} rel="noopener" className="text-primary hover:underline">
            {COMPANY_GITHUB_URL}
          </a>
        </p>
      </section>
    </div>
  );
}
