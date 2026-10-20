import { NextRequest, NextResponse } from "next/server";
import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

export async function GET(request: NextRequest) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const response = await fetch(
    `${getAccountServiceApiBaseUrl()}/stripe/subscription/pending`,
    {
      headers: { Authorization: `Bearer ${session.token}` },
      cache: "no-store",
    },
  );
  return NextResponse.json(await response.json().catch(() => ({})), {
    status: response.status,
    headers: { "Cache-Control": "no-store" },
  });
}
