"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  Book,
  Settings,
  Zap,
  Shield,
  HelpCircle,
  Code,
  Terminal,
  Activity,
  GraduationCap,
  Layout,
  Layers,
  Puzzle,
} from "lucide-react";
import type { DocCollection, DocVersionOption } from "./types";
import { SidebarContent } from "../../components/layout/SidebarRoot";

interface DocsSidebarContentProps {
  collections: DocCollection[];
  activePath: string;
  language?: string;
}

// Helper to humanize category names
const humanize = (s: string) => {
  if (!s) return "";
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// Icon mapping for categories
const ICON_MAP: Record<string, any> = {
  "getting-started": Book,
  architecture: Zap,
  usage: Settings,
  advanced: GraduationCap,
  api: Code,
  development: Terminal,
  operations: Activity,
  governance: Shield,
  appendix: HelpCircle,
  integrations: Puzzle,
  overview: Layout,
  "core-concepts": Layers,
};

const ADVANCED_GROUP = [
  "api",
  "development",
  "operations",
  "governance",
  "advanced",
];

export function DocsSidebarContent({
  collections,
  activePath,
  language,
}: DocsSidebarContentProps) {
  // Sort collections: Console first, then others alphabetically
  const sortedCollections = [...collections].sort((a, b) => {
    if (a.slug.includes("console")) return -1;
    if (b.slug.includes("console")) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <SidebarContent>
      <nav className="space-y-8">
        {sortedCollections.map((collection) => (
          <CollectionGroup
            key={collection.slug}
            collection={collection}
            activePath={activePath}
            isChinese={language === "zh"}
          />
        ))}
      </nav>
    </SidebarContent>
  );
}

function CollectionGroup({
  collection,
  activePath,
  isChinese,
}: {
  collection: DocCollection;
  activePath: string;
  isChinese: boolean;
}) {
  const isCollectionActive = activePath.startsWith(`/docs/${collection.slug}`);
  const [isOpen, setIsOpen] = useState(isCollectionActive);

  useEffect(() => {
    if (isCollectionActive) setIsOpen(true);
  }, [isCollectionActive]);

  // Group versions by category
  const grouped: Record<string, DocVersionOption[]> = {};
  const topLevel: DocVersionOption[] = [];

  collection.versions.forEach((v) => {
    const category = v.category;
    if (!category || category === "overview" || category === "index") {
      topLevel.push(v);
    } else {
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(v);
    }
  });

  const hasAdvanced = ADVANCED_GROUP.some((k) => grouped[k]);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center justify-between text-xs font-bold uppercase tracking-[0.22em] text-text-subtle transition-colors hover:text-primary"
      >
        <span className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></span>
          {collection.title}
        </span>
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-5">
          {/* Uncategorized / Overview / README */}
          {topLevel.length > 0 && (
            <ul className="space-y-1">
              {topLevel.map((v) => (
                <SidebarLink
                  key={v.slug}
                  version={v}
                  collectionSlug={collection.slug}
                  activePath={activePath}
                  isChinese={isChinese}
                />
              ))}
            </ul>
          )}

          {/* Main Categories (Getting Started, Architecture, etc.) */}
          <div className="space-y-4">
            {Object.entries(grouped)
              .filter(([k]) => !ADVANCED_GROUP.includes(k))
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([category, versions]) => (
                <CategorySection
                  key={category}
                  title={category}
                  versions={versions}
                  collectionSlug={collection.slug}
                  activePath={activePath}
                  isChinese={isChinese}
                />
              ))}
          </div>

          {/* Advanced Section Dropdown */}
          {hasAdvanced && (
            <AdvancedSection
              grouped={grouped}
              collectionSlug={collection.slug}
              activePath={activePath}
              isChinese={isChinese}
            />
          )}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  title,
  versions,
  collectionSlug,
  activePath,
  isChinese,
}: {
  title: string;
  versions: DocVersionOption[];
  collectionSlug: string;
  activePath: string;
  isChinese: boolean;
}) {
  const Icon = ICON_MAP[title] || Book;

  // Auto-expand if active
  const isActive = versions.some(
    (v) => activePath === `/docs/${collectionSlug}/${v.slug}`,
  );

  return (
    <div className="space-y-1">
      <div
        className={`flex w-full items-center gap-2.5 px-2 py-1 text-[11px] font-bold uppercase tracking-tight ${isActive ? "text-primary" : "text-text-muted/80"}`}
      >
        <Icon
          className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-text-subtle"}`}
        />
        <span>{humanize(title)}</span>
      </div>
      <ul className="ml-3.5 space-y-1 border-l border-surface-border pl-4">
        {versions.map((v) => (
          <SidebarLink
            key={v.slug}
            version={v}
            collectionSlug={collectionSlug}
            activePath={activePath}
            isChinese={isChinese}
          />
        ))}
      </ul>
    </div>
  );
}

function AdvancedSection({
  grouped,
  collectionSlug,
  activePath,
  isChinese,
}: {
  grouped: Record<string, DocVersionOption[]>;
  collectionSlug: string;
  activePath: string;
  isChinese: boolean;
}) {
  // Check if anything inside is active to auto-expand
  const isInsideActive = ADVANCED_GROUP.some((k) =>
    grouped[k]?.some((v) => activePath === `/docs/${collectionSlug}/${v.slug}`),
  );

  const [isExpanded, setIsExpanded] = useState(isInsideActive);

  useEffect(() => {
    if (isInsideActive) setIsExpanded(true);
  }, [isInsideActive]);

  return (
    <div className="space-y-2 rounded-[12px] border border-surface-border/60 bg-surface-muted/45 p-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-xs font-bold transition-all ${isExpanded ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-primary/5 hover:text-primary"}`}
      >
        <GraduationCap
          className={`h-4 w-4 ${isExpanded ? "text-primary" : "text-text-subtle"}`}
        />
        <span className="uppercase tracking-wide">Advanced</span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 transition-transform duration-300 ${isExpanded ? "" : "-rotate-90"}`}
        />
      </button>

      {isExpanded && (
        <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-300">
          {ADVANCED_GROUP.map(
            (k) =>
              grouped[k] && (
                <div key={k} className="space-y-2 py-1">
                  <div className="flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-widest text-text-subtle/50">
                    <span className="h-[1px] w-2 bg-surface-border"></span>
                    {humanize(k)}
                  </div>
                  <ul className="ml-4 space-y-1 border-l border-surface-border/50 pl-4">
                    {grouped[k].map((v) => (
                      <SidebarLink
                        key={v.slug}
                        version={v}
                        collectionSlug={collectionSlug}
                        activePath={activePath}
                        isChinese={isChinese}
                      />
                    ))}
                  </ul>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  );
}

function SidebarLink({
  version,
  collectionSlug,
  activePath,
  isChinese,
}: {
  version: DocVersionOption;
  collectionSlug: string;
  activePath: string;
  isChinese: boolean;
}) {
  const href = `/docs/${collectionSlug}/${version.slug}`;
  const isPageActive = activePath === href;
  const pageOutline = (version.toc ?? []).filter((item) => item.level > 1);
  const visibleOutline = pageOutline.slice(0, 6);

  return (
    <li>
      <Link
        href={href}
        className={`group flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm transition-all duration-200 ${
          isPageActive
            ? "bg-primary/10 text-primary font-medium shadow-[var(--shadow-sm)]"
            : "text-text-muted hover:bg-surface-muted hover:text-text"
        }`}
      >
        {isPageActive && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        )}
        <span className="truncate">{version.title}</span>
        {!isPageActive && (
          <ChevronRight className="ml-auto h-3 w-3 opacity-0 transition-all -translate-x-2 group-hover:opacity-30 group-hover:translate-x-0" />
        )}
      </Link>
      {isPageActive && visibleOutline.length > 0 ? (
        <div className="ml-3 mt-1 border-l border-primary/20 pl-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-subtle">
            {isChinese ? "目录预览" : "Page outline"}
          </p>
          <ul className="max-h-36 space-y-0.5 overflow-y-auto pr-1">
            {visibleOutline.map((item) => (
              <li key={item.anchor}>
                <a
                  href={`#${item.anchor}`}
                  className={`block truncate rounded-md py-1 text-xs leading-4 text-text-muted transition hover:bg-primary/5 hover:text-primary ${
                    item.level > 2 ? "pl-2" : ""
                  }`}
                  title={item.title}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
          {pageOutline.length > visibleOutline.length ? (
            <p className="mt-1 text-[10px] text-text-subtle">
              {isChinese
                ? `+${pageOutline.length - visibleOutline.length} 个章节`
                : `+${pageOutline.length - visibleOutline.length} sections`}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
