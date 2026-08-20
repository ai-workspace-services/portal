export const revalidate = 300;
// Documents added between two builds still render on first request.
export const dynamicParams = true;

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import DocMetaPanel from "@/components/doc/DocMetaPanel";
import { PublicPageIntro } from "@/components/public/PublicPageShell";
import { isFeatureEnabled } from "@lib/featureToggles";
import { getContentLanguage } from "@server/contentLanguage";

import Feedback from "../../Feedback";
import DocActions from "../../DocActions";
import { getDocVersion, getDocVersionParams } from "../../resources.server";

export async function generateStaticParams() {
  return getDocVersionParams();
}

function DocsBreadcrumbs({
  items,
}: {
  items: { label: string; href: string }[];
}) {
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-text-muted">
      {items.map((item, index) => (
        <div key={item.href} className="flex items-center gap-2">
          {index > 0 ? (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          ) : null}
          <Link
            href={item.href}
            className={`rounded-[12px] border px-3 py-1.5 transition ${
              index === items.length - 1
                ? "border-slate-900/8 bg-white/84 font-medium text-slate-900"
                : "border-slate-900/8 bg-white text-slate-600 hover:text-primary"
            }`}
          >
            {item.label}
          </Link>
        </div>
      ))}
    </nav>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string; slug: string[] }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const doc = await getDocVersion(
    resolvedParams.collection,
    resolvedParams.slug,
  );
  if (!doc) return {};

  return {
    title: `${doc.version.title} - ${doc.collection.title} | Documentation`,
    description: doc.version.description,
  };
}

export default async function DocVersionPage({
  params,
}: {
  params: Promise<{ collection: string; slug: string[] }>;
}) {
  if (!isFeatureEnabled("appModules", "/docs")) {
    notFound();
  }

  const resolvedParams = await params;
  const doc = await getDocVersion(
    resolvedParams.collection,
    resolvedParams.slug,
  );
  if (!doc) {
    notFound();
  }

  const { collection, version } = doc;
  const isChinese =
    version.language === "zh" || (await getContentLanguage()) === "zh";
  const breadcrumbs = [
    { label: isChinese ? "文档中心" : "Documentation", href: "/docs" },
    { label: collection.title, href: `/docs/${collection.slug}` },
    { label: version.title, href: `/docs/${collection.slug}/${version.slug}` },
  ];

  return (
    <div className="flex gap-6 xl:gap-8">
      <article className="min-w-0 flex-1 space-y-6">
        <section className="rounded-[1rem] border border-slate-900/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,248,250,0.98))] p-5 shadow-[var(--shadow-soft)] lg:p-6">
          <DocsBreadcrumbs items={breadcrumbs} />
          <PublicPageIntro
            eyebrow={isChinese ? "文档中心" : "Documentation"}
            title={version.title}
            subtitle={version.description}
            titleClassName="text-[2.3rem] tracking-[-0.06em] sm:text-[2.9rem]"
          />
        </section>

        <section className="rounded-[1rem] border border-slate-900/8 bg-white/90 p-5 shadow-[var(--shadow-soft)] lg:p-6">
          <article
            className="public-doc-prose"
            dangerouslySetInnerHTML={{ __html: version.html }}
          />
        </section>

        <div className="print:hidden">
          <Feedback isChinese={isChinese} />
        </div>
      </article>

      <aside className="hidden w-64 shrink-0 print:hidden lg:block xl:w-72">
        <div className="sticky top-[100px]">
          <div className="rounded-[0.95rem] border border-slate-900/8 bg-white/88 p-5 shadow-[var(--shadow-soft)]">
            {version.toc.length > 0 ? (
              <>
                <p className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-subtle">
                  {isChinese ? "本页目录" : "On this page"}
                </p>
                <nav aria-label={isChinese ? "本页目录" : "On this page"}>
                  <ul className="space-y-1 border-l border-slate-900/8">
                    {version.toc.map((item) => (
                      <li key={item.anchor}>
                        <a
                          href={`#${item.anchor}`}
                          className={`block border-l-2 border-transparent py-1.5 pr-2 text-sm leading-5 text-text-muted transition hover:border-primary hover:text-primary ${
                            item.level === 1 ? "pl-3 font-medium" : "pl-5"
                          }`}
                        >
                          {item.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="my-5 border-t border-slate-900/8" />
              </>
            ) : null}
            <p className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-subtle">
              {isChinese ? "页面信息" : "Page details"}
            </p>
            <DocMetaPanel
              description={undefined}
              updatedAt={version.updatedAt}
              tags={version.tags}
            />
            <div className="my-5 border-t border-slate-900/8" />
            <DocActions
              isChinese={isChinese}
              collection={collection.slug}
              slug={version.slug}
              title={version.title}
              markdown={version.markdown}
              editUrl={version.editUrl}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
