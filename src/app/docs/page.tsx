/**
 * 帮助中心 —— Micro SaaS 模版第 4 页
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版/04-help-center.html
 *
 * 保留 #219 引入的服务端形态：headers() 判定语言、getDocsHome / getDocCollections
 * 取 CMS 内容并按产品域分组、DocsSearch 客户端组件。只换视觉，并按设计稿补上
 * 「按任务开始」这一层 —— 用户带着问题来，不带着目录来。
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Blocks,
  Boxes,
  BookCopy,
  ChevronRight,
  CreditCard,
  MessagesSquare,
  Monitor,
  Network,
  Rocket,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";

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

  const tasks = [
    {
      Icon: Rocket,
      title: isChinese ? "第一次连通" : "First connection",
      desc: isChinese
        ? "注册 → 绑定 MFA → 导入 VLESS → 验证节点。约 5 分钟。"
        : "Sign up, bind MFA, import VLESS, verify nodes. About five minutes.",
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
      href: "/support",
    },
  ];

  return (
    <div className="xds" style={{ background: "transparent" }}>
      {/* ───────────── 搜索 Hero ───────────── */}
      <section className="xds-help-hero" style={{ borderRadius: "var(--r-lg)" }}>
        <div className="xds-container" style={{ textAlign: "center" }}>
          <span className="xds-t-eyebrow">
            {isChinese ? "帮助中心" : "Help center"}
          </span>
          <h1 className="xds-t-display-2 xds-mt-12">
            {home?.title || (isChinese ? "需要帮忙做什么？" : "What do you need help with?")}
          </h1>
          <p
            className="xds-t-lead"
            style={{ maxWidth: "38rem", margin: "12px auto 0" }}
          >
            {home?.description ||
              (isChinese
                ? "从注册到第一次连通，再到订阅与对账，每一步都有对应的分步向导。"
                : "From sign-up to first connection, then subscription and reconciliation.")}
          </p>

          <div className="xds-search-wrap">
            <DocsSearch />
            <div className="xds-row" style={{ justifyContent: "center", gap: 12, marginTop: 16 }}>
              <Link href={firstCollectionHref} className="xds-btn xds-btn-primary">
                {isChinese ? "开始阅读" : "Start reading"}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <a href="#collections" className="xds-link-arrow">
                {isChinese ? "浏览合集" : "Browse collections"}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </a>
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

      {/* ───────────── 全部文档集 ───────────── */}
      {collections.length > 0 ? (
        <section className="xds-section-sm" id="collections" style={{ scrollMarginTop: 96 }}>
          <div className="xds-container">
            <div className="xds-row-between" style={{ alignItems: "flex-end" }}>
              <div className="xds-sec-head">
                <span className="xds-t-eyebrow">Collections</span>
                <h2 className="xds-t-h1">
                  {isChinese ? "全部文档集" : "All collections"}
                </h2>
                <p className="xds-t-lead">
                  {isChinese
                    ? "按产品域进入指南、架构说明与操作参考。"
                    : "Enter a product domain for guides, architecture notes and operating references."}
                </p>
              </div>
              <span className="xds-badge">
                {collections.length} · {articleCount}{" "}
                {isChinese ? "篇" : "articles"}
              </span>
            </div>

            <div className="xds-grid xds-g-4 xds-mt-32" style={{ gap: 12 }}>
              {collections.map((collection: any) => {
                const Icon = collectionIcons[collection.slug] || BookCopy;
                return (
                  <Link
                    key={collection.slug}
                    href={
                      collection.entryHref ||
                      "/docs/" + collection.slug + "/" + collection.defaultVersionSlug
                    }
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
                      style={{
                        marginTop: "auto",
                        paddingTop: 16,
                        borderTop: "1px solid var(--border-subtle)",
                      }}
                    >
                      <span className="xds-t-caption">
                        {collection.articleCount ?? collection.versions?.length ?? 0}{" "}
                        {isChinese ? "篇文章" : "articles"}
                      </span>
                      <span className="xds-t-caption xds-brand">
                        {isChinese ? "进入集合" : "Open"}
                      </span>
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
                <span className="xds-t-eyebrow">
                  {isChinese ? "使用说明" : "Overview"}
                </span>
              </div>
              <article
                className="xds-prose xds-mt-16"
                dangerouslySetInnerHTML={{ __html: home.html }}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* ───────────── 还没解决？ ───────────── */}
      <section className="xds-section-sm">
        <div className="xds-container">
          <div className="xds-sec-head">
            <span className="xds-t-eyebrow">Still stuck</span>
            <h2 className="xds-t-h1">{isChinese ? "还没解决？" : "Still stuck?"}</h2>
          </div>
          <div className="xds-contact-grid xds-mt-32">
            {[
              {
                Icon: MessagesSquare,
                t: isChinese ? "提交工单" : "Open a ticket",
                d: isChinese
                  ? "附上账户 UUID 与节点名，工作日 4 小时内首次响应。"
                  : "Include your account UUID and node name; first response within 4 business hours.",
                cta: isChinese ? "新建工单" : "New ticket",
                href: "/support",
              },
              {
                Icon: Activity,
                t: isChinese ? "服务状态页" : "Status page",
                d: isChinese
                  ? "先确认是不是区域性故障，节点事件会在这里实时公布。"
                  : "Check for a regional incident first — node events are published live.",
                cta: isChinese ? "查看状态" : "Check status",
                href: "/support",
              },
              {
                Icon: BookCopy,
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
    </div>
  );
}
