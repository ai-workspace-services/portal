/** 电子书目录（教程画廊式布局，参考 pgsql.cc/docs/tutorials 的结构，沿用 xworktech 样式）。
 * 结构：页头（标题 + 一句说明）→ 横向书卡两列网格（左封面、右标题/简介/元信息）→ 「源码与构建」紧凑卡片区。
 * 数据源 src/data/ebooks.json，封面在 public/ebooks/covers/。 */
import Image from "next/image";
import catalog from "@/data/ebooks.json";

type Book = (typeof catalog.books)[number] & { blurb?: string };

export function EbookCatalog({ isChinese = true, limit, showResources = false }: { isChinese?: boolean; limit?: number; showResources?: boolean }) {
  const books = (limit ? catalog.books.slice(0, limit) : catalog.books) as Book[];
  return (
    <section aria-labelledby="docs-ebooks" className="space-y-8">
      <header className="space-y-2 border-b border-slate-900/8 pb-5">
        <h2 id="docs-ebooks" className="text-2xl font-semibold tracking-tight text-slate-950">
          {isChinese ? "电子书与教程" : "E-books & Tutorials"}
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-text-subtle">
          {isChinese
            ? "平台工程、可观测、数据基础设施与一人公司出海的图解电子书，点开即读最新版 PDF。"
            : "Illustrated e-books on platform engineering, observability, data infrastructure and solo-founder go-global. Click to read the latest PDF."}
        </p>
      </header>

      <ul className="grid gap-5 md:grid-cols-2">
        {books.map((b) => (
          <li key={b.slug}>
            <a href={b.pdf} target="_blank" rel="noopener"
               className="group flex h-full gap-4 rounded-[1rem] border border-slate-900/8 bg-white p-4 shadow-[var(--shadow-soft)] transition hover:border-primary">
              <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-md bg-slate-100 sm:w-28">
                <Image src={b.cover} alt={`${b.title} 封面`} fill sizes="112px"
                       className="object-cover transition group-hover:scale-[1.03]" />
              </div>
              <div className="flex min-w-0 flex-col">
                <h3 className="text-base font-semibold text-slate-950 group-hover:text-primary">{b.title}</h3>
                {b.blurb && <p className="mt-1 line-clamp-3 text-sm leading-6 text-text-subtle">{b.blurb}</p>}
                <ul className="mt-auto space-y-0.5 pt-3 text-xs text-text-subtle">
                  {b.tags?.length ? <li>{b.tags.join(" · ")}</li> : null}
                  <li>{b.version} · PDF {b.sizeMB} MB</li>
                </ul>
              </div>
            </a>
          </li>
        ))}
      </ul>

      {showResources && (
        <section aria-labelledby="docs-ebooks-src" className="space-y-3">
          <h2 id="docs-ebooks-src" className="text-lg font-semibold text-slate-950">
            {isChinese ? "源码包与构建说明" : "Sources & build notes"}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((b) => (
              <li key={b.slug} className="rounded-[0.75rem] border border-slate-900/8 bg-white p-3 text-sm">
                <span className="block font-medium text-slate-950">{b.title}</span>
                <span className="mt-1 flex gap-3 text-xs">
                  {b.source && <a className="text-primary hover:underline" href={b.source} target="_blank" rel="noopener">{isChinese ? "源码包" : "Source"} ↗</a>}
                  {b.readme && <a className="text-primary hover:underline" href={b.readme} target="_blank" rel="noopener">{isChinese ? "构建说明" : "Build"} ↗</a>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
