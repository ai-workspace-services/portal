/**
 * static-dashboard 是 output:"export" 的纯静态边界，构建期就要把每个页面
 * 渲染死，不能调用 headers()（或任何内部会调 headers() 的函数，比如文档服务
 * 客户端的语言判定）——这正是 /docs 一直没被纳入这个边界的原因。
 *
 * /support 合并了原 /docs 首页的内容后也带上了这个限制，所以不能像其它路由
 * 那样直接 `export { default } from "../../../src/app/support/page"`。
 * 这里改为直接用构建期已知的静态兜底内容渲染同一份 SupportCenterView：
 * 语言固定中文（跟其余静态兜底数据的默认语言一致），文档集合与「文档页形态」
 * 演示区块都用设计稿自带的示例内容，不发起任何请求。
 */
import docsHomeContent from "@/data/content/docs-home";
import {
  FALLBACK_ARTICLE,
  toProductCollections,
  SupportCenterView,
  type DocNavGroup,
} from "../../../src/app/support/SupportCenterView";

const LANGUAGE = "zh" as const;

export default function StaticSupportPage() {
  const fallback = (docsHomeContent as any)[LANGUAGE];
  const home = fallback?.home;
  const rawCollections = fallback?.collections || [];
  const collections = rawCollections.length > 0 ? toProductCollections(rawCollections, LANGUAGE) : [];

  const firstCollectionHref =
    collections[0]?.entryHref ||
    (collections[0] ? `/docs/${collections[0].slug}/${collections[0].defaultVersionSlug}` : "/docs");

  const articleCount = collections.reduce(
    (sum: number, collection: any) => sum + (collection.articleCount ?? collection.versions?.length ?? 0),
    0,
  );

  const articleFallback = FALLBACK_ARTICLE[LANGUAGE];
  const docNavGroups: DocNavGroup[] = articleFallback.nav.map((group) => ({
    label: group.label,
    links: group.links.map((link) => ({ ...link, href: undefined })),
  }));

  return (
    <SupportCenterView
      language={LANGUAGE}
      home={home}
      collections={collections}
      firstCollectionHref={firstCollectionHref}
      articleCount={articleCount}
      featuredArticle={null}
      docNavGroups={docNavGroups}
    />
  );
}
