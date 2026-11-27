import { NextRequest, NextResponse } from "next/server";

import { getAccountSession } from "@server/account/session";
import { getSanitizedConfigDocument } from "@server/connectors/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAccountSession(request);
  if (!session.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const userId = session.user.uuid || session.user.id;
  const doc = await getSanitizedConfigDocument(userId);
  return NextResponse.json(doc, {
    headers: { "Cache-Control": "no-store" },
  });
}
