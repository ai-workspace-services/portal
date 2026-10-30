"use client";
import BoundaryLink from "@/components/common/BoundaryLink";
import { useLanguage } from "@/i18n/LanguageProvider";
import { COMPANY_GITHUB_URL } from "@/lib/company";

type L = { zh: string; en: string; href: string; external?: boolean };
type Col = { zh: string; en: string; links: L[] };

// Only real xworktech.com routes / product series (pgsql.cc-style multi-column).
const COLUMNS: Col[] = [
  { zh: "产品", en: "Products", links: [
    { zh: "全部产品", en: "All products", href: "/products" },
    { zh: "XConnect", en: "XConnect", href: "/products/xconnect" },
    { zh: "XWorkmate", en: "XWorkmate", href: "/products/xworkmate" },
    { zh: "AI Workspace", en: "AI Workspace", href: "/products/ai-workspace" },
    { zh: "Cloud Hub", en: "Cloud Hub", href: "/products/cloud-hub" },
  ]},
  { zh: "解决方案", en: "Solutions", links: [
    { zh: "开放平台", en: "Open Platform", href: "/products/open-platform" },
    { zh: "可观测洞察", en: "Insight", href: "/services/insight" },
    { zh: "OpenClaw 服务", en: "OpenClaw", href: "/services/openclaw" },
    { zh: "全部服务", en: "Services", href: "/services" },
  ]},
  { zh: "文档", en: "Docs", links: [
    { zh: "文档首页", en: "Docs home", href: "/docs" },
    { zh: "电子书", en: "E-books", href: "/docs/ebooks" },
    { zh: "博客", en: "Blog", href: "/blogs" },
    { zh: "下载", en: "Downloads", href: "/download" },
    { zh: "llms.txt", en: "llms.txt", href: "/llms.txt" },
  ]},
  { zh: "开源", en: "Open source", links: [
    { zh: "GitHub 组织", en: "GitHub", href: COMPANY_GITHUB_URL, external: true },
  ]},
  { zh: "关于", en: "About", links: [
    { zh: "关于我们", en: "About", href: "/about" },
    { zh: "价格", en: "Pricing", href: "/prices" },
    { zh: "支持", en: "Support", href: "/support" },
    { zh: "联系我们", en: "Contact", href: "/contact" },
  ]},
];

export default function DocsFooterLinks() {
  const { language } = useLanguage();
  const zh = language !== "en";
  return (
    <section className="mt-8 rounded-[8px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-6 py-8 text-caption text-[var(--color-text-muted)] shadow-[var(--shadow-sm)]">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_3fr]">
        <div className="space-y-2">
          <p className="text-lg font-semibold text-[var(--color-heading,inherit)]">XWorkTech</p>
          <p className="font-medium text-text">{zh ? "云中立 · AI 工作区产品与文档" : "Cloud-neutral AI workspace products & docs"}</p>
          <p>{zh ? "产品文档、解决方案与电子书，源自 knowledge 知识库持续维护。" : "Product docs, solutions and e-books maintained from our knowledge base."}</p>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
          {COLUMNS.map((c) => (
            <nav key={c.en} aria-label={zh ? c.zh : c.en}>
              <p className="mb-3 font-semibold text-text">{zh ? c.zh : c.en}</p>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--color-primary)]">{zh ? l.zh : l.en}</a>
                    ) : (
                      <BoundaryLink href={l.href} className="transition-colors hover:text-[var(--color-primary)]">{zh ? l.zh : l.en}</BoundaryLink>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
    </section>
  );
}
