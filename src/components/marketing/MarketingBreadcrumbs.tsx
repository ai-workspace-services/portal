"use client";

/**
 * 导航条内的动态面包屑 —— 占用 logo 右侧那个位置。
 *
 * 首页只显示一个图标锚点（回首页），不重复渲染品牌文案——首页正文本身
 * 就在讲「Open Workspace for AI」，导航条里再放一遍是纯重复。进到任何
 * 子页后左区变成当前位置的层级；logo 本身就是「首页」，面包屑里不再
 * 重复一个首页节点，直接以分隔符起头。
 *
 * 层级复用 homeMarketingContent.nav：下拉分组名当二级，条目名当三级，
 * 导航内容改了面包屑自动跟着改，不需要维护第二份路由表。导航里没有的
 * 公开页在 EXTRA_LABELS 里补，最后兜底把未知路径段还原成可读文本。
 */

import BoundaryLink from "@/components/common/BoundaryLink";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Zap } from "lucide-react";

import { homeMarketingContent } from "@/components/marketing/content";
import { useLanguage } from "@/i18n/LanguageProvider";

type Crumb = { label: string; href?: string };

const HOME_LABEL = { zh: "首页", en: "Home" } as const;

// 导航内容里没有、但需要面包屑的公开页。
const EXTRA_LABELS: Record<string, { zh: string; en: string }> = {
  "/products": { zh: "产品与服务", en: "Products" },
  // 定价页已从导航撤下（入口让给 GitHub），但页面仍在，面包屑得留个正式名字。
  "/prices": { zh: "定价", en: "Pricing" },
  "/services": { zh: "服务目录", en: "Services" },
  "/company": { zh: "公司", en: "Company" },
  "/contact": { zh: "联系我们", en: "Contact" },
  "/privacy": { zh: "隐私政策", en: "Privacy" },
  "/terms": { zh: "服务条款", en: "Terms" },
  "/xworkmate-suite": { zh: "XWorkmate 套件", en: "XWorkmate Suite" },
};

function humanize(segment: string) {
  const decoded = (() => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  })();
  return decoded.replace(/[-_]+/g, " ").trim();
}

function isPrefixOf(prefix: string, pathname: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export default function MarketingBreadcrumbs() {
  const pathname = usePathname() || "/";
  const { language } = useLanguage();
  const content = homeMarketingContent[language] ?? homeMarketingContent.zh;
  const locale = language === "en" ? "en" : "zh";

  const crumbs = useMemo<Crumb[]>(() => {
    if (pathname === "/") return [];

    // href -> { label, group }，长路径优先匹配。
    const index = new Map<string, { label: string; group?: string }>();
    for (const dropdown of content.nav.dropdowns) {
      for (const item of dropdown.columns) {
        index.set(item.href, { label: item.label, group: dropdown.label });
      }
    }
    for (const link of content.nav.links) {
      index.set(link.href, { label: link.label });
    }
    for (const [href, labels] of Object.entries(EXTRA_LABELS)) {
      if (!index.has(href)) index.set(href, { label: labels[locale] });
    }

    let matchedHref = "";
    let matched: { label: string; group?: string } | undefined;
    for (const [href, entry] of index) {
      if (isPrefixOf(href, pathname) && href.length > matchedHref.length) {
        matchedHref = href;
        matched = entry;
      }
    }

    const trail: Crumb[] = [{ label: HOME_LABEL[locale], href: "/" }];
    let consumed = "";

    if (matched) {
      if (matched.group) trail.push({ label: matched.group });
      trail.push({ label: matched.label, href: matchedHref });
      consumed = matchedHref;
    }

    const rest = pathname.slice(consumed.length).split("/").filter(Boolean);
    let walked = consumed;
    for (const segment of rest) {
      walked = `${walked}/${segment}`;
      trail.push({ label: humanize(segment), href: walked });
    }

    // 当前页不再是链接。
    const last = trail[trail.length - 1];
    if (last) delete last.href;
    return trail.length > 1 ? trail : [];
  }, [content, locale, pathname]);

  // 首页只留图标锚点，子页整块换成面包屑——左上角始终只有一个「我在哪」的答案。
  if (crumbs.length === 0) {
    return (
      <BoundaryLink
        href="/"
        className="xds-logo xds-mnav-lockup"
        aria-label={HOME_LABEL[locale]}
      >
        <span className="xds-logo-mark">
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </BoundaryLink>
    );
  }

  return (
    <nav
      className="xds-mnav-crumbs"
      aria-label={locale === "en" ? "Breadcrumb" : "面包屑导航"}
    >
      <ol>
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`}>
            {index > 0 ? (
              <span className="xds-sep" aria-hidden="true">
                ｜
              </span>
            ) : null}
            {crumb.href ? (
              <BoundaryLink href={crumb.href}>{crumb.label}</BoundaryLink>
            ) : (
              <span className="xds-cur" aria-current="page">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
