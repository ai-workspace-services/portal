import { NextRequest, NextResponse } from "next/server";
import { getAccountSession } from "@/server/account/session";
import { resolveForwardedHost } from "@/server/account/requestHost";
import { getAccountServiceApiBaseUrl } from "@/server/serviceConfig";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const forwardedHost = resolveForwardedHost(request);
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    /* Invalid Origin is forbidden. */
  }
  if (!originHost || originHost !== (forwardedHost || request.nextUrl.host))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const session = await getAccountSession(request);
  if (!session.user || !session.token)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const payload = await request.json().catch(() => null);
  if (
    !payload ||
    typeof payload.currency !== "string" ||
    !/^[A-Z]{3}$/.test(payload.currency)
  )
    return NextResponse.json({ error: "invalid_currency" }, { status: 400 });
  try {
    const response = await fetch(
      `${getAccountServiceApiBaseUrl(forwardedHost)}/referrals/settlements`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ currency: payload.currency }),
        cache: "no-store",
      },
    );
    const data: unknown = await response.json().catch(() => null);
    return NextResponse.json(data ?? { error: "invalid_response" }, {
      status: data === null ? 502 : response.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "account_service_unavailable" },
      { status: 502 },
    );
  }
}
