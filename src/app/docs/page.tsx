"use client";

/**
 * 帮助中心 —— Micro SaaS 模版第 4 页
 *
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版/04-help-center.html
 *
 * 结构上的核心变化：入口按「任务」而非按产品模块组织。用户带着问题来，
 * 不带着目录来 —— 第一次连通 / 客户端配置 / 订阅与账单 / 排查与错误码
 * 四条主线在前，完整文档集在后。
 *
 * 文档集数据仍来自 src/data/content/docs-home，没有改内容契约。
 * 页面在既有的 DocsLayout（MarketingNav + DocsSidebar + Footer）内渲染。
 */

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ChevronRight,
  CreditCard,
  ExternalLink,
  MessagesSquare,
  Monitor,
  Rocket,
  Search,
} from "lucide-react";

import {
  XdsBadge,
  XdsCard,
  XdsEyebrow,
  XdsSectionHead,
  XdsTag,
} from "@/components/ui/xds";
import { useLanguage } from "@/i18n/LanguageProvider";
import docsHomeContent from "@/data/content/docs-home";

type Collection = {
  slug: string;
  title: string;
  description?: string;
  defaultVersionSlug?: string;
  versions?: string[];
  tags?: string[];
};

const COPY = {
  zh: {
    eyebrow: "Help center",
    title: "需要帮忙做什么？",
    lead: "从注册到第一次连通，再到订阅与对账，每一步都有对应的分步向导。",
    searchPlaceholder: "搜索文档、错误码或客户端名称…",
    hot: [
      "导入 VLESS 订阅",
      "绑定 MFA",
      "用量对不上",
      "申请退款",
      "私有环境穿透",
      "节点显示待验证",
    ],
    taskEyebrow: "Start here",
    taskTitle: "按任务开始",
    taskLead:
      "不确定从哪看起，就从下面四条主线里挑一条。每条都是端到端的完整流程。",
    tasks: [
      {
        icon: Rocket,
        t: "第一次连通",
        d: "注册 → 绑定 MFA → 导入 VLESS → 验证节点。约 5 分钟。",
        cta: "开始",
        href: "/panel/account",
      },
      {
        icon: Monitor,
        t: "客户端配置",
        d: "macOS / Windows / Linux / iOS / Android 与第三方客户端导入。",
        cta: "查看",
        href: "/download",
      },
      {
        icon: CreditCard,
        t: "订阅与账单",
        d: "套餐差异、超额计费、发票抬头、退款与取消流程。",
        cta: "查看",
        href: "/panel/subscription",
      },
      {
        icon: AlertTriangle,
        t: "排查与错误码",
        d: "连不上、用量异常、节点待验证、握手失败的定位路径。",
        cta: "查看",
        href: "/support",
      },
    ],
    colEyebrow: "Collections",
    colTitle: "全部文档集",
    articles: "篇",
    stuckEyebrow: "Still stuck",
    stuckTitle: "还没解决？",
    contacts: [
      {
        icon: MessagesSquare,
        t: "提交工单",
        d: "附上账户 UUID 与节点名，工作日 4 小时内首次响应。",
        cta: "新建工单",
        href: "/support",
        external: false,
      },
      {
        icon: Activity,
        t: "服务状态页",
        d: "先确认是不是区域性故障，节点事件会在这里实时公布。",
        cta: "查看状态",
        href: "/support",
        external: false,
      },
      {
        icon: BookOpen,
        t: "社区讨论",
        d: "自建部署与第三方客户端的踩坑经验大多在这里。",
        cta: "进入社区",
        href: "/support/discussions",
        external: false,
      },
    ],
    overview: "总览",
  },
  en: {
    eyebrow: "Help center",
    title: "What do you need help with?",
    lead:
      "From sign-up to first connection, then subscription and reconciliation — every step has a walkthrough.",
    searchPlaceholder: "Search docs, error codes or client names…",
    hot: [
      "Import VLESS subscription",
      "Bind MFA",
      "Usage mismatch",
      "Request a refund",
      "Private tunnelling",
      "Node stuck pending",
    ],
    taskEyebrow: "Start here",
    taskTitle: "Start by task",
    taskLead:
      "Not sure where to begin? Pick one of the four tracks below — each is an end-to-end flow.",
    tasks: [
      { icon: Rocket, t: "First connection", d: "Sign up → bind MFA → import VLESS → verify nodes. About 5 minutes.", cta: "Start", href: "/panel/account" },
      { icon: Monitor, t: "Client setup", d: "macOS / Windows / Linux / iOS / Android and third-party clients.", cta: "View", href: "/download" },
      { icon: CreditCard, t: "Subscription and billing", d: "Plan differences, overage, invoice details, refunds and cancellation.", cta: "View", href: "/panel/subscription" },
      { icon: AlertTriangle, t: "Troubleshooting", d: "Can't connect, usage anomalies, pending nodes, handshake failures.", cta: "View", href: "/support" },
    ],
    colEyebrow: "Collections",
    colTitle: "All collections",
    articles: "articles",
    stuckEyebrow: "Still stuck",
    stuckTitle: "Still stuck?",
    contacts: [
      { icon: MessagesSquare, t: "Open a ticket", d: "Include your account UUID and node name; first response within 4 business hours.", cta: "New ticket", href: "/support", external: false },
      { icon: Activity, t: "Status page", d: "Check for a regional incident first — node events are published live.", cta: "Check status", href: "/support", external: false },
      { icon: BookOpen, t: "Community", d: "Most self-hosting and third-party client gotchas are discussed here.", cta: "Join", href: "/support/discussions", external: false },
    ],
    overview: "Overview",
  },
} as const;

export default function DocsHome() {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "zh";
  const zh = lang === "zh";
  const t = COPY[lang];

  type DocsHomeLocale = {
    home?: { title?: string; description?: string; html?: string };
    collections?: Collection[];
  };
  const localized = docsHomeContent as unknown as Record<
    string,
    DocsHomeLocale | undefined
  >;
  const content = localized[lang] ?? localized.zh;
  const collections = content?.collections ?? [];
  const home = content?.home;
  const articleCount = collections.reduce(
    (sum, c) => sum + (c.versions?.length || 0),
    0,
  );

  return (
    <div className="xds" style={{ background: "transparent" }}>
      {/* ───────────────── 搜索 Hero ───────────────── */}
      <section className="xds-help-hero" style={{ borderRadius: "var(--r-lg)" }}>
        <div className="xds-container" style={{ textAlign: "center" }}>
          <XdsEyebrow>{t.eyebrow}</XdsEyebrow>
          <h1 className="xds-t-display-2 xds-mt-12">{home?.title || t.title}</h1>
          <p
            className="xds-t-lead"
            style={{ maxWidth: "36rem", margin: "12px auto 0" }}
          >
            {home?.description || t.lead}
          </p>

          <div className="xds-search-wrap">
            <label className="xds-search-big" htmlFor="xds-docs-search">
              <Search className="h-5 w-5 xds-subtle" aria-hidden="true" />
              <input
                id="xds-docs-search"
                type="search"
                placeholder={t.searchPlaceholder}
                style={{
                  flex: 1,
                  border: 0,
                  outline: "none",
                  background: "transparent",
                  fontSize: "var(--fs-body)",
                }}
              />
              <span className="xds-kbd">⌘K</span>
            </label>
            <div className="xds-hot">
              {t.hot.map((h) => (
                <Link key={h} href="/support">
                  {h}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── 按任务开始 ───────────────── */}
      <section className="xds-section-sm">
        <div className="xds-container">
          <XdsSectionHead
            eyebrow={t.taskEyebrow}
            title={t.taskTitle}
            lead={t.taskLead}
          />
          <div className="xds-task-grid xds-mt-32">
            {t.tasks.map((task) => {
              const Icon = task.icon;
              return (
                <article key={task.t} className="xds-card xds-card-hover xds-task">
                  <div className="xds-task-ico">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h4>{task.t}</h4>
                  <p className="xds-t-caption">{task.d}</p>
                  <Link href={task.href} className="xds-link-arrow">
                    {task.cta}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────── 全部文档集 ───────────────── */}
      {collections.length > 0 ? (
        <section className="xds-section-sm">
          <div className="xds-container">
            <div className="xds-row-between" style={{ alignItems: "flex-end" }}>
              <XdsSectionHead eyebrow={t.colEyebrow} title={t.colTitle} />
              <XdsBadge dot={false}>
                {collections.length} · {articleCount} {t.articles}
              </XdsBadge>
            </div>

            <div className="xds-grid xds-g-3 xds-mt-32" style={{ gap: 12 }}>
              {collections.map((collection) => (
                <Link
                  key={collection.slug}
                  href={`/docs/${collection.slug}/${collection.defaultVersionSlug ?? "latest"}`}
                  className="xds-card xds-card-hover xds-card-pad"
                >
                  <div className="xds-row-between">
                    <h4>{collection.title}</h4>
                    <ArrowRight className="h-3.5 w-3.5 xds-subtle" aria-hidden="true" />
                  </div>
                  <p className="xds-t-caption" style={{ marginTop: 8 }}>
                    {collection.description}
                  </p>
                  <div className="xds-row xds-mt-16" style={{ gap: 6, flexWrap: "wrap" }}>
                    <XdsTag>
                      {collection.versions?.length || 0} {t.articles}
                    </XdsTag>
                    {(collection.tags || []).slice(0, 2).map((tag) => (
                      <XdsTag key={tag}>{tag}</XdsTag>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ───────────────── 总览正文 ───────────────── */}
      {home?.html ? (
        <section className="xds-section-sm">
          <div className="xds-container">
            <XdsCard className="xds-card-pad">
              <XdsEyebrow>{t.overview}</XdsEyebrow>
              <article
                className="xds-prose xds-mt-16"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: home.html }}
              />
            </XdsCard>
          </div>
        </section>
      ) : null}

      {/* ───────────────── 还没解决？ ───────────────── */}
      <section className="xds-section-sm">
        <div className="xds-container">
          <XdsSectionHead eyebrow={t.stuckEyebrow} title={t.stuckTitle} />
          <div className="xds-contact-grid xds-mt-32">
            {t.contacts.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.t} className="xds-card xds-card-pad">
                  <div className="xds-task-ico">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h4 style={{ margin: "16px 0 6px" }}>{c.t}</h4>
                  <p className="xds-t-caption">{c.d}</p>
                  <Link
                    href={c.href}
                    className="xds-link-arrow xds-t-caption xds-mt-16"
                    style={{ display: "inline-flex" }}
                  >
                    {c.cta}
                    {c.external ? (
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
