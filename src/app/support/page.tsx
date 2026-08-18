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
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Blocks,
  BookCopy,
  Boxes,
  ChevronRight,
  CreditCard,
  Github,
  Info,
  Mail,
  MessagesSquare,
  Monitor,
  Network,
  Rocket,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";

import MarketingNav from "@/components/marketing/MarketingNav";
import XdsSiteFooter from "@/components/xds/XdsSiteFooter";
import {
  getDocCollections,
  getDocPage,
  getDocsHome,
  type DocCollectionPayload,
} from "@/lib/docsServiceClient";
import docsHomeContent from "@/data/content/docs-home";
import DocsSearch from "../docs/DocsSearch";
import HelpfulButtons from "./HelpfulButtons";

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
      description: "AI Workspace · 让 AI 真正参与你的工作，而不是停留在对话中。",
    },
    en: {
      title: "XWorkmate",
      description: "AI Workspace · Bring AI into real work instead of keeping it in conversation.",
    },
  },
  {
    slug: "xconnect",
    sourceSlugs: ["integrations", "03-rag-server"],
    zh: {
      title: "XConnect",
      description: "AI Connectivity · 为你的 AI Workspace 提供稳定、安全的连接能力。",
    },
    en: {
      title: "XConnect",
      description: "AI Connectivity · Stable, secure connectivity for your AI Workspace.",
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
      description: "Conversations, tasks, and tools in one place—continuously producing deliverables.",
    },
  },
  {
    slug: "open-platform",
    sourceSlugs: ["04-postgresql", "reference"],
    zh: {
      title: "Open Platform",
      description: "Platform & Infrastructure · 提供可控、可扩展的基础支撑，支持从托管到自建。",
    },
    en: {
      title: "Open Platform",
      description: "Platform & Infrastructure · Controlled, extensible foundations from managed services to self-hosting.",
    },
  },
] as const;

function toProductCollections(
  collections: DocCollectionPayload[],
  language: "zh" | "en",
): DocCollectionPayload[] {
  const bySlug = new Map(collections.map((collection) => [collection.slug, collection]));

  return PRODUCT_GROUPS.map((group) => {
    const sources = group.sourceSlugs
      .map((slug) => bySlug.get(slug))
      .filter((collection): collection is DocCollectionPayload => Boolean(collection));
    const primary = sources[0];
    const versions = sources.flatMap((collection) => collection.versions);
    const entryVersion = primary?.defaultVersionSlug || primary?.versions[0]?.slug;

    return {
      slug: group.slug,
      title: group[language].title,
      description: group[language].description,
      updatedAt: primary?.updatedAt,
      tags: Array.from(new Set(sources.flatMap((collection) => collection.tags))),
      versions,
      defaultVersionSlug: entryVersion || "overview",
      entryHref: primary && entryVersion ? `/docs/${primary.slug}/${entryVersion}` : "/support",
      articleCount: versions.length,
      category: primary?.category,
    };
  });
}

// 设计稿里「文档页形态」演示区块的静态示例内容，取不到真实文档服务时兜底用。
const FALLBACK_ARTICLE = {
  zh: {
    breadcrumbs: ["文档", "快速开始"],
    title: "3 步完成首次连通",
    meta: "示例文档 · 无法连接实时文档服务时展示",
    nav: [
      {
        label: "快速开始",
        links: [
          { title: "3 步完成首次连通", active: true },
          { title: "账户安全与 MFA", active: false },
          { title: "获取连接凭据", active: false },
          { title: "验证节点连通", active: false },
        ],
      },
      {
        label: "客户端",
        links: [
          { title: "macOS 客户端", active: false },
          { title: "Windows 客户端", active: false },
          { title: "Linux / CLI", active: false },
          { title: "移动端扫码导入", active: false },
        ],
      },
      {
        label: "计费",
        links: [
          { title: "套餐与配额", active: false },
          { title: "超额计费规则", active: false },
          { title: "退款政策", active: false },
        ],
      },
    ],
    toc: [
      { id: "s1", title: "第 1 步 · 完善账户安全" },
      { id: "s2", title: "第 2 步 · 获取连接凭据" },
      { id: "s3", title: "第 3 步 · 验证连接" },
    ],
  },
  en: {
    breadcrumbs: ["Docs", "Getting started"],
    title: "First connection in 3 steps",
    meta: "Sample article · shown when the live docs service is unreachable",
    nav: [
      {
        label: "Getting started",
        links: [
          { title: "First connection in 3 steps", active: true },
          { title: "Account security and MFA", active: false },
          { title: "Get connection credentials", active: false },
          { title: "Verify node connectivity", active: false },
        ],
      },
      {
        label: "Clients",
        links: [
          { title: "macOS client", active: false },
          { title: "Windows client", active: false },
          { title: "Linux / CLI", active: false },
          { title: "Mobile QR import", active: false },
        ],
      },
      {
        label: "Billing",
        links: [
          { title: "Plans and quotas", active: false },
          { title: "Overage rules", active: false },
          { title: "Refund policy", active: false },
        ],
      },
    ],
    toc: [
      { id: "s1", title: "Step 1 · Secure your account" },
      { id: "s2", title: "Step 2 · Get connection credentials" },
      { id: "s3", title: "Step 3 · Verify the connection" },
    ],
  },
} as const;

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
  let featuredArticle: {
    breadcrumbs: string[];
    title: string;
    meta: string;
    html?: string;
    toc: Array<{ id: string; title: string }>;
    isLive: boolean;
  } | null = null;

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
  const docNavGroups =
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

  const tasks = [
    {
      Icon: Rocket,
      title: isChinese ? "第一次连通" : "First connection",
      desc: isChinese
        ? "注册 → 绑定 MFA → 导入凭据 → 验证节点。约 5 分钟。"
        : "Sign up, bind MFA, import credentials, verify nodes. About five minutes.",
      cta: isChinese ? "开始" : "Start",
      href: "/panel/account",
    },
    {
      Icon: Monitor,
      title: isChinese ? "客户端配置" : "Client setup",
      desc: isChinese
        ? "macOS / Windows / Linux / iOS / Android 与第三方客户端导入。"
        : "macOS, Windows, Linux, iOS, Android and third-party clients.",
      cta: isChinese ? "查看" : "View",
      href: "/download",
    },
    {
      Icon: CreditCard,
      title: isChinese ? "订阅与账单" : "Subscription and billing",
      desc: isChinese
        ? "套餐差异、超额计费、发票抬头、退款与取消流程。"
        : "Plans, overage, invoice details, refunds and cancellation.",
      cta: isChinese ? "查看" : "View",
      href: "/panel/subscription",
    },
    {
      Icon: AlertTriangle,
      title: isChinese ? "排查与错误码" : "Troubleshooting",
      desc: isChinese
        ? "连不上、用量异常、节点待验证、握手失败的定位路径。"
        : "Cannot connect, usage anomalies, pending nodes, handshake failures.",
      cta: isChinese ? "查看" : "View",
      href: "#contact",
    },
  ];

  const hotLinks = [
    { label: isChinese ? "下载客户端" : "Download clients", href: "/download" },
    { label: isChinese ? "绑定 MFA" : "Bind MFA", href: "/panel/account" },
    { label: isChinese ? "订阅与用量" : "Subscription & usage", href: "/panel/subscription" },
    { label: isChinese ? "社区讨论" : "Community", href: "/support/discussions" },
    { label: "GitHub", href: "/github" },
  ];

  return (
    <div className="xds" style={{ background: "transparent" }}>
      <MarketingNav />

      {/* ───────────── 搜索 Hero ───────────── */}
      <section className="xds-help-hero">
        <div className="xds-container" style={{ textAlign: "center" }}>
          <span className="xds-t-eyebrow">{isChinese ? "帮助与支持" : "Help & support"}</span>
          <h1 className="xds-t-display-2 xds-mt-12">
            {home?.title || (isChinese ? "需要帮忙做什么？" : "What do you need help with?")}
          </h1>
          <p className="xds-t-lead" style={{ maxWidth: "38rem", margin: "12px auto 0" }}>
            {home?.description ||
              (isChinese
                ? "从注册到第一次连通，再到订阅与对账，每一步都有对应的分步向导。找不到答案就直接联系我们。"
                : "From sign-up to first connection, then subscription and reconciliation. Can't find an answer? Reach out directly.")}
          </p>

          <div className="xds-search-wrap">
            <DocsSearch />
            <div className="xds-row" style={{ justifyContent: "center", gap: 12, marginTop: 16 }}>
              <Link href={firstCollectionHref} className="xds-btn xds-btn-primary">
                {isChinese ? "开始阅读" : "Start reading"}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <a href="#contact" className="xds-link-arrow">
                {isChinese ? "联系支持" : "Contact support"}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
            <div className="xds-hot">
              {hotLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── 按任务开始 ───────────── */}
      <section className="xds-section-sm">
        <div className="xds-container">
          <div className="xds-sec-head">
            <span className="xds-t-eyebrow">Start here</span>
            <h2 className="xds-t-h1">{isChinese ? "按任务开始" : "Start by task"}</h2>
            <p className="xds-t-lead">
              {isChinese
                ? "不确定从哪看起，就从下面四条主线里挑一条。每条都是端到端的完整流程。"
                : "Not sure where to begin? Each track below is an end-to-end flow."}
            </p>
          </div>
          <div className="xds-task-grid xds-mt-32">
            {tasks.map((task) => (
              <article key={task.title} className="xds-card xds-card-hover xds-task">
                <div className="xds-task-ico">
                  <task.Icon className="h-4 w-4" aria-hidden />
                </div>
                <h4>{task.title}</h4>
                <p className="xds-t-caption">{task.desc}</p>
                <Link href={task.href} className="xds-link-arrow">
                  {task.cta}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── 文档页形态：左侧分类导航 + 正文 + 右侧目录 ───────────── */}
      <section
        className="xds-section-sm"
        style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="xds-container-wide">
          <div className="xds-row-between" style={{ marginBottom: 32, alignItems: "flex-end" }}>
            <div className="xds-sec-head">
              <span className="xds-t-eyebrow">Article layout</span>
              <h2 className="xds-t-h1">{isChinese ? "分步向导的阅读形态" : "How a step-by-step guide reads"}</h2>
            </div>
            {featuredArticle?.isLive ? (
              <span className="xds-badge xds-badge-success">
                <i className="xds-dot" />
                {isChinese ? "实时文档" : "Live docs"}
              </span>
            ) : (
              <span className="xds-badge">{isChinese ? "示例内容" : "Sample content"}</span>
            )}
          </div>

          <div className="xds-doc-layout">
            {/* 左侧目录 */}
            <nav className="xds-doc-nav">
              {docNavGroups.map((group) => (
                <div key={group.label} className="xds-nav-group">
                  <div className="xds-nav-label">{group.label}</div>
                  {group.links.map((link: any, linkIndex: number) => (
                    <a
                      key={`${group.label}-${linkIndex}-${link.title}`}
                      href={link.href || "#"}
                      className={link.active ? "xds-is-active" : ""}
                    >
                      {link.title}
                    </a>
                  ))}
                </div>
              ))}
            </nav>

            {/* 正文 */}
            <article className="xds-prose">
              <div className="xds-t-caption" style={{ marginBottom: 16 }}>
                {(featuredArticle?.breadcrumbs || fallback.breadcrumbs).join(" / ")}
              </div>
              <h1>{featuredArticle?.title || fallback.title}</h1>
              <p className="xds-t-caption" style={{ marginBottom: 24 }}>
                {featuredArticle?.meta || fallback.meta}
              </p>

              {featuredArticle?.html ? (
                <div dangerouslySetInnerHTML={{ __html: featuredArticle.html }} />
              ) : (
                <>
                  <p>
                    {isChinese
                      ? "本文覆盖从注册到确认节点连通的完整路径。控制台会按同样的顺序引导你，两边的状态是同一份数据，不会出现文档说完成了但控制台还显示待办的情况。"
                      : "This guide covers the full path from sign-up to a confirmed connection. The console walks you through the same order, backed by the same data, so the docs and the console never disagree about what's done."}
                  </p>
                  <div className="xds-alert xds-alert-info" style={{ marginTop: 20 }}>
                    <Info className="xds-ic xds-alert-icon" aria-hidden />
                    <div>
                      <span className="xds-alert-title">{isChinese ? "开始前" : "Before you start"}</span>
                      <p className="xds-alert-body">
                        {isChinese
                          ? "准备一个可收信的邮箱和一个支持 TOTP 的验证器 App。免费套餐不需要信用卡。"
                          : "Have an email you can receive mail at and a TOTP-capable authenticator app ready. The free plan needs no card."}
                      </p>
                    </div>
                  </div>
                  <h2 id="s1">{fallback.toc[0].title}</h2>
                  <p>
                    {isChinese
                      ? "验证邮箱后，账户即可正常浏览控制台。但发起支付、变更订阅或进入客户门户前，必须绑定多因素认证。"
                      : "Once your email is verified you can browse the console. Making a payment, changing your plan, or opening the billing portal still requires MFA."}
                  </p>
                  <h2 id="s2">{fallback.toc[1].title}</h2>
                  <p>
                    {isChinese
                      ? "凭据可独立于账户身份轮换，轮换后旧链接立即失效。"
                      : "Credentials can be rotated independently of your account identity; old links stop working the moment you rotate."}
                  </p>
                  <h2 id="s3">{fallback.toc[2].title}</h2>
                  <p>
                    {isChinese
                      ? "导入客户端并发起一次请求后，回到控制台的「运行节点」。服务端收到握手时，节点状态会从待验证变为已连通。"
                      : "Import the client and make one request, then check \"running nodes\" in the console. Once the server sees the handshake, the node flips from pending to connected."}
                  </p>
                </>
              )}

              <div className="xds-divider" style={{ margin: "40px 0 20px" }} />
              <div className="xds-row-between">
                <div>
                  <div className="xds-t-caption">{isChinese ? "这篇文档有帮助吗？" : "Was this page helpful?"}</div>
                  <HelpfulButtons isChinese={isChinese} />
                </div>
                <Link href={firstCollectionHref} className="xds-link-arrow">
                  {isChinese ? "浏览更多文档" : "Browse more docs"}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </article>

            {/* 右侧 on-this-page */}
            <aside className="xds-toc">
              <div className="xds-nav-label" style={{ padding: "0 0 8px 11px" }}>
                {isChinese ? "本页内容" : "On this page"}
              </div>
              {(featuredArticle?.toc?.length ? featuredArticle.toc : fallback.toc).map((item, index) => (
                <a key={item.id} href={`#${item.id}`} className={index === 0 ? "xds-is-active" : ""}>
                  {item.title}
                </a>
              ))}
            </aside>
          </div>
        </div>
      </section>

      {/* ───────────── 全部文档集 ───────────── */}
      {collections.length > 0 ? (
        <section className="xds-section-sm" id="collections" style={{ scrollMarginTop: 96 }}>
          <div className="xds-container">
            <div className="xds-row-between" style={{ alignItems: "flex-end" }}>
              <div className="xds-sec-head">
                <span className="xds-t-eyebrow">Collections</span>
                <h2 className="xds-t-h1">{isChinese ? "全部文档集" : "All collections"}</h2>
                <p className="xds-t-lead">
                  {isChinese
                    ? "按产品域进入指南、架构说明与操作参考。"
                    : "Enter a product domain for guides, architecture notes and operating references."}
                </p>
              </div>
              <span className="xds-badge">
                {collections.length} · {articleCount} {isChinese ? "篇" : "articles"}
              </span>
            </div>

            <div className="xds-grid xds-g-4 xds-mt-32" style={{ gap: 12 }}>
              {collections.map((collection: any) => {
                const Icon = collectionIcons[collection.slug] || BookCopy;
                return (
                  <Link
                    key={collection.slug}
                    href={collection.entryHref || "/docs/" + collection.slug + "/" + collection.defaultVersionSlug}
                    className="xds-card xds-card-hover xds-task"
                  >
                    <div className="xds-row-between">
                      <span className="xds-task-ico">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 xds-subtle" aria-hidden />
                    </div>
                    <h4>{collection.title}</h4>
                    <p className="xds-t-caption">{collection.description}</p>
                    <div
                      className="xds-row-between"
                      style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}
                    >
                      <span className="xds-t-caption">
                        {collection.articleCount ?? collection.versions?.length ?? 0} {isChinese ? "篇文章" : "articles"}
                      </span>
                      <span className="xds-t-caption xds-brand">{isChinese ? "进入集合" : "Open"}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* ───────────── 总览正文 ───────────── */}
      {home?.html ? (
        <section className="xds-section-sm">
          <div className="xds-container">
            <div className="xds-card xds-card-pad">
              <div className="xds-row" style={{ gap: 10 }}>
                <Sparkles className="h-4 w-4 xds-brand" aria-hidden />
                <span className="xds-t-eyebrow">{isChinese ? "使用说明" : "Overview"}</span>
              </div>
              <article className="xds-prose xds-mt-16" dangerouslySetInnerHTML={{ __html: home.html }} />
            </div>
          </div>
        </section>
      ) : null}

      {/* ───────────── 还没解决？ ───────────── */}
      <section className="xds-section-sm" id="contact" style={{ scrollMarginTop: 96 }}>
        <div className="xds-container">
          <div className="xds-sec-head">
            <span className="xds-t-eyebrow">Still stuck</span>
            <h2 className="xds-t-h1">{isChinese ? "还没解决？" : "Still stuck?"}</h2>
          </div>
          <div className="xds-contact-grid xds-mt-32">
            {[
              {
                Icon: Mail,
                t: isChinese ? "联系支持" : "Contact support",
                d: isChinese
                  ? "描述遇到的问题，工作日内我们会尽快回复。"
                  : "Describe what's wrong; we'll get back to you within a business day.",
                cta: "haitaopanhq@gmail.com",
                href: "mailto:haitaopanhq@gmail.com",
              },
              {
                Icon: Github,
                t: isChinese ? "GitHub 仓库" : "GitHub repository",
                d: isChinese
                  ? "查看版本发布、已知问题与路线图。"
                  : "Check releases, known issues, and the roadmap.",
                cta: isChinese ? "打开仓库" : "Open repository",
                href: "/github",
              },
              {
                Icon: MessagesSquare,
                t: isChinese ? "社区讨论" : "Community",
                d: isChinese
                  ? "自建部署与第三方客户端的踩坑经验大多在这里。"
                  : "Most self-hosting and third-party client gotchas are discussed here.",
                cta: isChinese ? "进入社区" : "Join",
                href: "/support/discussions",
              },
            ].map((c) => (
              <div key={c.t} className="xds-card xds-card-pad">
                <div className="xds-task-ico">
                  <c.Icon className="h-4 w-4" aria-hidden />
                </div>
                <h4 style={{ margin: "16px 0 6px" }}>{c.t}</h4>
                <p className="xds-t-caption">{c.d}</p>
                <Link
                  href={c.href}
                  className="xds-link-arrow xds-t-caption xds-mt-16"
                  style={{ display: "inline-flex" }}
                >
                  {c.cta}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <XdsSiteFooter />
    </div>
  );
}
