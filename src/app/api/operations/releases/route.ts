export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAccountSession } from "@server/account/session";
import { isOperationsUser } from "@server/account/adminAccess";
import { isReleaseCatalog } from "@/modules/extensions/builtin/platform-operations/lib/release-status";

const CATALOG_URL =
  "https://raw.githubusercontent.com/ai-workspace-infra/platform-ops-toolkit/release-status/releases.json";
export async function GET(request: NextRequest) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isOperationsUser(session.user))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const upstream = await fetch(CATALOG_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
    });
    if (!upstream.ok)
      return NextResponse.json(
        { error: "release_source_unavailable" },
        { status: 503 },
      );
    const payload: unknown = await upstream.json();
    if (!isReleaseCatalog(payload))
      return NextResponse.json(
        { error: "invalid_release_catalog" },
        { status: 502 },
      );
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "release_source_unavailable" },
      { status: 503 },
    );
  }
}
