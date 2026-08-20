import { NextResponse } from "next/server";

import { getLatestBlogPosts } from "@/lib/docsServiceClient";
import { getRequestContentLanguage } from "@server/contentLanguage";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 7;
const MAX_LIMIT = 20;

function parseLimit(rawLimit: string | null): number {
  if (!rawLimit) {
    return DEFAULT_LIMIT;
  }

  const parsedLimit = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsedLimit, MAX_LIMIT);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"));

  const posts = await getLatestBlogPosts(limit, await getRequestContentLanguage());
  const latestPosts = posts.slice(0, limit).map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
  }));

  return NextResponse.json(latestPosts);
}
