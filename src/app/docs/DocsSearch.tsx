"use client";

import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useLanguage } from "@/i18n/LanguageProvider";

type SearchHit = {
  slug: string;
  title: string;
  excerpt?: string;
  collection?: string;
  href: string;
};

export default function DocsSearch({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < 2) {
      setHits([]);
      setLoading(false);
      setFailed(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await fetch(
          `/api/docs/search?query=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("search failed");
        const nextHits = (await response.json()) as SearchHit[];
        setHits(nextHits);
        setActiveIndex(0);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFailed(true);
          setHits([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  function visit(hit: SearchHit): void {
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && hits.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % hits.length);
    } else if (event.key === "ArrowUp" && hits.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + hits.length) % hits.length);
    } else if (event.key === "Enter" && hits[activeIndex]) {
      event.preventDefault();
      visit(hits[activeIndex]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 rounded-[0.8rem] border border-surface-border bg-white/80 text-text-muted transition hover:border-primary/25 hover:text-primary ${compact ? "h-10 w-10 justify-center" : "w-full px-3 py-2.5"} ${className}`}
        aria-label={isChinese ? "搜索文档" : "Search documentation"}
      >
        <Search className="h-4 w-4" aria-hidden />
        {!compact ? (
          <>
            <span className="text-sm">
              {isChinese ? "搜索文档…" : "Search docs…"}
            </span>
            <kbd className="ml-auto rounded border border-surface-border bg-surface-muted px-1.5 py-0.5 text-[10px] text-text-subtle">
              ⌘K
            </kbd>
          </>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh]">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label={isChinese ? "关闭搜索" : "Close search"}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={isChinese ? "搜索文档" : "Search documentation"}
            className="relative w-full max-w-2xl overflow-hidden rounded-[1.25rem] border border-surface-border bg-white shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-surface-border px-4">
              <Search className="h-5 w-5 text-text-subtle" aria-hidden />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={
                  isChinese
                    ? "搜索标题、正文和标签"
                    : "Search titles, content, and tags"
                }
                className="h-14 min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-subtle"
                role="combobox"
                aria-expanded={hits.length > 0}
                aria-controls="docs-search-results"
                aria-activedescendant={
                  hits[activeIndex]
                    ? `docs-search-result-${activeIndex}`
                    : undefined
                }
              />
              {loading ? (
                <Loader2
                  className="h-4 w-4 animate-spin text-primary"
                  aria-hidden
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-text-subtle hover:bg-surface-muted hover:text-text"
                  aria-label={isChinese ? "关闭搜索" : "Close search"}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>

            <div
              id="docs-search-results"
              role="listbox"
              className="max-h-[58vh] overflow-y-auto p-2"
            >
              {failed ? (
                <p className="px-4 py-8 text-center text-sm text-danger">
                  {isChinese
                    ? "搜索暂时不可用，请稍后重试。"
                    : "Search is temporarily unavailable."}
                </p>
              ) : query.trim().length < 2 ? (
                <p className="px-4 py-8 text-center text-sm text-text-subtle">
                  {isChinese
                    ? "输入至少两个字符开始搜索。"
                    : "Type at least two characters to search."}
                </p>
              ) : !loading && hits.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-text-subtle">
                  {isChinese
                    ? "没有找到匹配文档。"
                    : "No matching documents found."}
                </p>
              ) : (
                hits.map((hit, index) => (
                  <button
                    id={`docs-search-result-${index}`}
                    key={hit.slug}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => visit(hit)}
                    className={`flex w-full items-start gap-3 rounded-[0.9rem] px-4 py-3 text-left transition ${
                      index === activeIndex
                        ? "bg-primary/8"
                        : "hover:bg-surface-muted"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-heading">
                        {hit.title}
                      </p>
                      <p className="mt-1 text-xs font-medium text-primary/70">
                        {hit.collection}
                      </p>
                      {hit.excerpt ? (
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-text-muted">
                          {hit.excerpt}
                        </p>
                      ) : null}
                    </div>
                    <ArrowRight
                      className="mt-1 h-4 w-4 shrink-0 text-text-subtle"
                      aria-hidden
                    />
                  </button>
                ))
              )}
            </div>
            <footer className="flex gap-4 border-t border-surface-border bg-surface-muted/55 px-4 py-2 text-[11px] text-text-subtle">
              <span>↑↓ {isChinese ? "选择" : "Navigate"}</span>
              <span>↵ {isChinese ? "打开" : "Open"}</span>
              <span>esc {isChinese ? "关闭" : "Close"}</span>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
