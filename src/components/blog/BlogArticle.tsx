"use client";

import { useEffect, useRef, useState } from "react";
import { ListTree } from "lucide-react";

type TocItem = {
  level: number;
  title: string;
  anchor: string;
};

type BlogArticleProps = {
  html: string;
  toc: TocItem[];
  language: "zh" | "en";
};

function TableOfContents({
  items,
  language,
  activeAnchor,
}: {
  items: TocItem[];
  language: "zh" | "en";
  activeAnchor: string;
}) {
  return (
    <nav aria-label={language === "zh" ? "文章目录" : "Article contents"}>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        <ListTree className="h-4 w-4 text-primary" aria-hidden />
        {language === "zh" ? "本篇目录" : "On this page"}
      </p>
      <ol className="mt-3 space-y-1.5 border-l border-slate-200 pl-3">
        {items.map((item) => (
          <li key={item.anchor} className={item.level === 3 ? "pl-3" : ""}>
            <a
              href={`#${item.anchor}`}
              className={
                "block border-l-2 py-1 text-sm leading-5 transition " +
                (activeAnchor === item.anchor
                  ? "-ml-[13px] border-primary pl-[11px] font-semibold text-slate-950"
                  : "-ml-[13px] border-transparent pl-[11px] text-slate-600 hover:border-primary/35 hover:text-slate-950")
              }
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function BlogArticle({ html, toc, language }: BlogArticleProps) {
  const articleRef = useRef<HTMLElement>(null);
  const [activeAnchor, setActiveAnchor] = useState(toc[0]?.anchor ?? "");
  const readableToc = toc.filter((item) => item.level > 1);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const headings = readableToc
      .map((item) =>
        article.querySelector<HTMLElement>(`#${CSS.escape(item.anchor)}`),
      )
      .filter((heading): heading is HTMLElement => Boolean(heading));
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible?.target.id) setActiveAnchor(visible.target.id);
      },
      { rootMargin: "-20% 0px -68% 0px" },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [readableToc]);

  useEffect(() => {
    let cancelled = false;
    const article = articleRef.current;
    if (!article) return;
    const articleRoot: HTMLElement = article;

    async function renderDiagrams() {
      const codeBlocks = Array.from(
        articleRoot.querySelectorAll<HTMLElement>(
          "pre > code.language-mermaid",
        ),
      );
      if (!codeBlocks.length) return;

      const { default: mermaid } = await import("mermaid");
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        themeVariables: {
          primaryColor: "#eaf0ff",
          primaryTextColor: "#0f172a",
          primaryBorderColor: "#9db8ff",
          lineColor: "#64748b",
          secondaryColor: "#f8fafc",
          tertiaryColor: "#ffffff",
          fontFamily: "var(--font-geist-sans)",
        },
      });

      await Promise.all(
        codeBlocks.map(async (code, index) => {
          const pre = code.parentElement;
          const definition = code.textContent?.trim();
          if (!pre || !definition || cancelled) return;
          try {
            const { svg, bindFunctions } = await mermaid.render(
              `blog-diagram-${index}-${Date.now()}`,
              definition,
            );
            if (cancelled) return;
            const figure = document.createElement("figure");
            figure.className = "blog-mermaid";
            figure.innerHTML = svg;
            pre.replaceWith(figure);
            bindFunctions?.(figure);
          } catch {
            pre.classList.add("blog-mermaid-fallback");
          }
        }),
      );
    }

    void renderDiagrams();
    return () => {
      cancelled = true;
    };
  }, [html]);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,46rem)_13.5rem] lg:justify-center lg:gap-10 xl:gap-14">
      {readableToc.length > 0 ? (
        <details className="mb-6 rounded-2xl border border-slate-900/10 bg-[#fbfcff] p-4 lg:hidden">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
            {language === "zh" ? "查看文章目录" : "View article contents"}
          </summary>
          <div className="mt-4">
            <TableOfContents
              items={readableToc}
              language={language}
              activeAnchor={activeAnchor}
            />
          </div>
        </details>
      ) : null}
      <article
        ref={articleRef}
        className="public-doc-prose blog-reading-prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {readableToc.length > 0 ? (
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--app-shell-nav-offset)+1.5rem)] rounded-2xl border border-slate-900/10 bg-[#fbfcff]/95 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <TableOfContents
              items={readableToc}
              language={language}
              activeAnchor={activeAnchor}
            />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
