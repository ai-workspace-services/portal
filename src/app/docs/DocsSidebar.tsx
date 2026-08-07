"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { SidebarRoot } from "../../components/layout/SidebarRoot";
import { DocsSidebarContent } from "./DocsSidebarContent";
import { useLanguage } from "@/i18n/LanguageProvider";
import docsHomeContent from "@/data/content/docs-home";

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

export default function DocsSidebar() {
  const pathname = usePathname();
  const { language } = useLanguage();

  const content =
    (docsHomeContent as any)[language] || (docsHomeContent as any).zh;
  const collections = normalizeCollections(content?.collections || []);

  return (
    <SidebarRoot className="sticky top-[calc(var(--app-shell-nav-offset)+0.75rem)] hidden h-[calc(100vh-var(--app-shell-nav-offset)-1rem)] w-72 shrink-0 rounded-[1.15rem] border border-surface-border/80 bg-white/78 px-4 py-5 shadow-[var(--shadow-soft)] backdrop-blur lg:block">
      <DocsSidebarContent collections={collections} activePath={pathname} />
    </SidebarRoot>
  );
}

export function DocsMobileNav() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const content =
    (docsHomeContent as any)[language] || (docsHomeContent as any).zh;
  const collections = content?.collections || [];
  const activeCollection = collections.find((collection: any) =>
    pathname.startsWith("/docs/" + collection.slug),
  );

  return (
    <div className="mb-2 lg:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between rounded-[1rem] border border-surface-border bg-white/85 px-4 py-3 text-left shadow-[var(--shadow-soft)]"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Menu className="h-4 w-4" aria-hidden />
          </span>
          <span>
            <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-text-subtle">
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

      {isOpen ? (
        <div className="mt-2 grid gap-2 rounded-[1rem] border border-surface-border bg-white/95 p-2 shadow-[var(--shadow-soft)]">
          {collections.map((collection: any) => {
            const isActive = pathname.startsWith("/docs/" + collection.slug);
            return (
              <Link
                key={collection.slug}
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
