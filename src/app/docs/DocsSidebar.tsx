"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { SidebarRoot } from "../../components/layout/SidebarRoot";
import { DocsSidebarContent } from "./DocsSidebarContent";
import { useLanguage } from "@/i18n/LanguageProvider";
import docsHomeContent from "@/data/content/docs-home";
import type { DocCollection } from "./types";

const DocsSearch = dynamic(() => import("./DocsSearch"), { ssr: false });

function normalizeCollections(collections: any[]) {
  return collections.map((collection) => ({
    ...collection,
    versions: (collection.versions || []).map((version: any) =>
      typeof version === "string"
        ? {
            slug: version,
            label: version,
            title: version === "latest" ? "Overview" : version,
            description: "",
            tags: [],
            html: "",
            category: "overview",
          }
        : version,
    ),
  }));
}

export default function DocsSidebar({
  collections: providedCollections,
}: {
  collections?: DocCollection[];
}) {
  const pathname = usePathname();
  const { language } = useLanguage();

  const content =
    (docsHomeContent as any)[language] || (docsHomeContent as any).zh;
  const collections = normalizeCollections(
    providedCollections?.length
      ? providedCollections
      : content?.collections || [],
  );

  return (
    <SidebarRoot className="sticky top-[calc(var(--app-shell-nav-offset)+0.75rem)] hidden h-[calc(100vh-var(--app-shell-nav-offset)-1rem)] w-72 shrink-0 rounded-[1.15rem] border border-surface-border/80 bg-white/78 px-4 py-5 shadow-[var(--shadow-soft)] backdrop-blur lg:block">
      <div className="mb-5 shrink-0">
        <DocsSearch />
      </div>
      <DocsSidebarContent
        collections={collections}
        activePath={pathname}
        language={language}
      />
    </SidebarRoot>
  );
}

export function DocsMobileNav({
  collections: providedCollections,
}: {
  collections?: DocCollection[];
}) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const content =
    (docsHomeContent as any)[language] || (docsHomeContent as any).zh;
  const collections = normalizeCollections(
    providedCollections?.length
      ? providedCollections
      : content?.collections || [],
  );
  const activeCollection = collections.find((collection: any) =>
    pathname.startsWith("/docs/" + collection.slug),
  );

  return (
    <div className="mb-2 lg:hidden">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex min-w-0 flex-1 items-center justify-between rounded-[1rem] border border-surface-border bg-white/85 px-4 py-3 text-left shadow-[var(--shadow-soft)]"
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Menu className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="block text-eyebrow font-semibold uppercase tracking-[0.2em] text-text-subtle">
                {language === "zh" ? "文档导航" : "Documentation"}
              </span>
              <span className="mt-0.5 block text-sm font-semibold text-text">
                {activeCollection?.title ||
                  (language === "zh" ? "选择产品集合" : "Choose a collection")}
              </span>
            </span>
          </span>
          <ChevronDown
            className={
              "h-4 w-4 text-text-subtle transition-transform " +
              (isOpen ? "rotate-180" : "")
            }
            aria-hidden
          />
        </button>
        <DocsSearch compact />
      </div>

      {isOpen ? (
        <div className="mt-2 grid gap-2 rounded-[1rem] border border-surface-border bg-white/95 p-2 shadow-[var(--shadow-soft)]">
          {collections.map((collection: any) => {
            const isActive = pathname.startsWith("/docs/" + collection.slug);
            return (
              <Link
                key={collection.slug}
                prefetch={false}
                href={
                  "/docs/" +
                  collection.slug +
                  "/" +
                  collection.defaultVersionSlug
                }
                onClick={() => setIsOpen(false)}
                className={
                  "rounded-[0.8rem] px-3 py-2.5 text-sm font-semibold transition " +
                  (isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:bg-surface-muted hover:text-text")
                }
              >
                {collection.title}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
