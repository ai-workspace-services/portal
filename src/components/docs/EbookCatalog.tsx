/** 电子书封面卡片目录：点击封面/标题直达最新 PDF（Drive）。数据源 src/data/ebooks.json，封面在 public/ebooks/covers/。 */
import Image from "next/image";
import catalog from "@/data/ebooks.json";

type Book = (typeof catalog.books)[number];

export function EbookCatalog({ isChinese = true, limit }: { isChinese?: boolean; limit?: number }) {
  const books: Book[] = limit ? catalog.books.slice(0, limit) : catalog.books;
  return (
    <section aria-labelledby="docs-ebooks" className="space-y-4">
      <h2 id="docs-ebooks" className="text-xl font-semibold text-slate-950">
        {isChinese ? "电子书" : "E-books"}
      </h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((b) => (
          <li key={b.slug}>
            <a href={b.pdf} target="_blank" rel="noopener"
               className="group block h-full overflow-hidden rounded-[1rem] border border-slate-900/8 bg-white shadow-[var(--shadow-soft)] transition hover:border-primary">
              <div className="relative aspect-[3/4] bg-slate-100">
                <Image src={b.cover} alt={`${b.title} 封面`} fill sizes="(min-width:1024px) 25vw, 50vw"
                       className="object-cover transition group-hover:scale-[1.02]" />
              </div>
              <div className="p-3">
                <span className="block text-sm font-semibold text-slate-950">{b.title}</span>
                <span className="mt-1 block text-xs text-text-subtle">{b.version} · PDF {b.sizeMB} MB</span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
