import { NextResponse } from "next/server";

import { getDocCollections, getDocsHome } from "@/lib/docsServiceClient";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const [home, collections] = await Promise.all([
      getDocsHome(),
      getDocCollections(),
    ]);
    return NextResponse.json({ home, collections });
  } catch (error) {
    console.error("docs catalog request failed", { error });
    return NextResponse.json(
      { error: "docs_catalog_unavailable" },
      { status: 502 },
    );
  }
}
