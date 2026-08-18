/**
 * 支持中心 —— Micro SaaS 模版第 4 页
 * 设计稿：design-system/04-help-center.html
 *
 * 与 /docs 合并：原 /docs 首页（搜索 hero、按任务开始、全部文档集、还没解决）
 * 与旧版 /support（联系方式）统一到这一个路由。/docs 首页改为跳转到这里，
 * 文章正文仍留在 /docs/[collection]/[slug]，不搬迁内容树。
 *
 * 比旧版 /docs 首页多补上设计稿里被跳过的「文档页形态」区块：左侧分类导航 +
 * 正文 + 右侧目录三栏。有真实文档服务时展示第一篇文章，取不到时退回设计稿
 * 里的示例文案，保证本地没有 docs 后端也能正常渲染。
 *
 * 这里只做 headers() 判定语言 + 拉取真实文档服务数据；视觉全部在
 * SupportCenterView 里，因为 static-dashboard 边界要用同一份视觉但不能碰
 * headers()（见 static-dashboard/app/support/page.tsx 的说明）。
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { headers } from "next/headers";

import { getDocCollections, getDocPage, getDocsHome, type DocCollectionPayload } from "@/lib/docsServiceClient";
import docsHomeContent from "@/data/content/docs-home";
import { FALLBACK_ARTICLE, toProductCollections, SupportCenterView, type DocNavGroup, type FeaturedArticle } from "./SupportCenterView";

export default async function SupportPage() {
  const headerStore = await headers();
  const preferred = headerStore.get("x-language") ?? headerStore.get("accept-language") ?? "";
  const language: "zh" | "en" = preferred.toLowerCase().includes("zh") ? "zh" : "en";
  const isChinese = language === "zh";

  let home;
  let rawCollections: DocCollectionPayload[] = [];
  let isLiveDocsService = false;

  try {
    const [h, c] = await Promise.all([getDocsHome(), getDocCollections()]);
    home = h;
    rawCollections = c;
    isLiveDocsService = true;
  } catch {
    const fallback = (docsHomeContent as any)[language] || (docsHomeContent as any).zh;
    home = fallback?.home;
    rawCollections = fallback?.collections || [];
  }

  const collections = rawCollections.length > 0 ? toProductCollections(rawCollections, language) : [];

  const firstCollectionHref =
    collections[0]?.entryHref ||
    (collections[0] ? `/docs/${collections[0].slug}/${collections[0].defaultVersionSlug}` : "/docs");

  const articleCount = collections.reduce(
    (sum: number, collection: any) => sum + (collection.articleCount ?? collection.versions?.length ?? 0),
    0,
  );

  // 「文档页形态」演示区块：优先展示真实文档服务里的第一篇文章，取不到就用静态兜底文案。
  let featuredArticle: FeaturedArticle = null;

  const firstRawCollection = rawCollections[0];
  if (firstRawCollection) {
    const versionSlug = firstRawCollection.defaultVersionSlug || firstRawCollection.versions[0]?.slug;
    if (versionSlug) {
      try {
        const page = await getDocPage(firstRawCollection.slug, versionSlug);
        featuredArticle = {
          breadcrumbs: page.breadcrumbs?.map((b) => b.label) || [firstRawCollection.title],
          title: page.version.title,
          meta: `${isChinese ? "最后更新" : "Updated"} ${page.version.updatedAt || "—"}`,
          html: page.version.html,
          toc: (page.version.toc || [])
            .filter((item) => item.level > 1)
            .slice(0, 6)
            .map((item) => ({ id: item.anchor, title: item.title })),
          isLive: true,
        };
      } catch {
        featuredArticle = null;
      }
    }
  }

  const fallback = FALLBACK_ARTICLE[language];
  // 只有拿到真实文档服务数据时才用它拼左侧导航；静态兜底数据的 versions 是字符串
  // （如 "latest"），没有可展示的 title/slug，这时改用设计稿里的示例分类导航。
  const docNavGroups: DocNavGroup[] =
    isLiveDocsService && rawCollections.length > 0
      ? rawCollections.slice(0, 4).map((collection, collectionIndex) => ({
          label: collection.title,
          links: collection.versions.slice(0, 5).map((version, versionIndex) => ({
            title: version.title,
            href: `/docs/${collection.slug}/${version.slug}`,
            active: collectionIndex === 0 && versionIndex === 0,
          })),
        }))
      : fallback.nav.map((group) => ({
          label: group.label,
          links: group.links.map((link) => ({ ...link, href: undefined })),
        }));

  return (
    <SupportCenterView
      language={language}
      home={home}
      collections={collections}
      firstCollectionHref={firstCollectionHref}
      articleCount={articleCount}
      featuredArticle={featuredArticle}
      docNavGroups={docNavGroups}
    />
  );
}
