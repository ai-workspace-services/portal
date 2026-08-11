import { NextRequest, NextResponse } from "next/server";

import { searchDocs } from "@/lib/docsServiceClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  if (!query) {
    return NextResponse.json([]);
  }

  try {
    const hits = await searchDocs(query, 12);
    return NextResponse.json(hits);
  } catch (error) {
    console.error("docs search failed", { query, error });
    return NextResponse.json(
      { error: "docs_search_unavailable" },
      { status: 502 },
    );
  }
}
