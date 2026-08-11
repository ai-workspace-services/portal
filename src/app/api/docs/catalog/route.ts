import { NextResponse } from "next/server";

import {
  getDocCollections,
  getDocsHome,
  type DocCollectionPayload,
} from "@/lib/docsServiceClient";

export const dynamic = "force-dynamic";

const PRODUCT_GROUPS = [
  {
    slug: "xworkmate",
    sourceSlugs: ["01-console", "02-accounts"],
    zh: {
      title: "XWorkmate",
      description:
        "AI Workspace · 让 AI 真正参与你的工作，而不是停留在对话中。",
    },
    en: {
      title: "XWorkmate",
      description:
        "AI Workspace · Bring AI into real work instead of keeping it in conversation.",
    },
  },
  {
    slug: "xconnect",
    sourceSlugs: ["integrations", "03-rag-server"],
    zh: {
      title: "XConnect",
      description:
        "AI Connectivity · 为你的 AI Workspace 提供稳定、安全的连接能力。",
    },
    en: {
      title: "XConnect",
      description:
        "AI Connectivity · Stable, secure connectivity for your AI Workspace.",
    },
  },
  {
    slug: "ai-workspace",
    sourceSlugs: ["get-started", "core-concepts", "zh", "en"],
    zh: {
      title: "AI Workspace",
      description: "对话、任务与工具一体化，持续产出可交付成果。",
    },
    en: {
      title: "AI Workspace",
      description:
        "Conversations, tasks, and tools in one place—continuously producing deliverables.",
    },
  },
  {
    slug: "open-platform",
    sourceSlugs: ["04-postgresql", "reference"],
    zh: {
      title: "Open Platform",
      description:
        "Platform & Infrastructure · 提供可控、可扩展的基础支撑，支持从托管到自建。",
    },
    en: {
      title: "Open Platform",
      description:
        "Platform & Infrastructure · Controlled, extensible foundations from managed services to self-hosting.",
    },
  },
] as const;

function toProductCollections(
  collections: DocCollectionPayload[],
  language: "zh" | "en",
): DocCollectionPayload[] {
  const bySlug = new Map(
    collections.map((collection) => [collection.slug, collection]),
  );

  return PRODUCT_GROUPS.map((group) => {
    const sources = group.sourceSlugs
      .map((slug) => bySlug.get(slug))
      .filter((collection): collection is DocCollectionPayload =>
        Boolean(collection),
      );
    const primary = sources[0];
    const versions = sources.flatMap((collection) => collection.versions);
    const entryVersion =
      primary?.defaultVersionSlug || primary?.versions[0]?.slug;

    return {
      slug: group.slug,
      title: group[language].title,
      description: group[language].description,
      updatedAt: primary?.updatedAt,
      tags: Array.from(
        new Set(sources.flatMap((collection) => collection.tags)),
      ),
      versions,
      defaultVersionSlug: entryVersion || "overview",
      entryHref:
        primary && entryVersion
          ? `/docs/${primary.slug}/${entryVersion}`
          : "/docs",
      articleCount: versions.length,
      category: primary?.category,
    };
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const [home, collections] = await Promise.all([
      getDocsHome(),
      getDocCollections(),
    ]);
    const preferredLanguage =
      request.headers.get("x-language") ??
      request.headers.get("accept-language") ??
      "";
    const language = preferredLanguage.toLowerCase().includes("zh")
      ? "zh"
      : "en";
    return NextResponse.json({
      home,
      collections: toProductCollections(collections, language),
    });
  } catch (error) {
    console.error("docs catalog request failed", { error });
    return NextResponse.json(
      { error: "docs_catalog_unavailable" },
      { status: 502 },
    );
  }
}
