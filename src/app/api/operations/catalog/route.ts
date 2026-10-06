import { NextRequest, NextResponse } from "next/server";
import { getAccountSession } from "@server/account/session";
import { isOperationsUser } from "@server/account/adminAccess";
import { snapshotCatalog } from "@/modules/extensions/builtin/platform-operations/lib/snapshot-plan";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getAccountSession(request);
    if (!session.user || !session.token)
      return NextResponse.json(
        { error: "unauthenticated" },
        { status: 401, headers },
      );
    if (!isOperationsUser(session.user))
      return NextResponse.json(
        { error: "forbidden" },
        { status: 403, headers },
      );
    return NextResponse.json(snapshotCatalog, { headers });
  } catch {
    return NextResponse.json(
      { error: "session_unavailable" },
      { status: 503, headers },
    );
  }
}
