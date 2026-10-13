import { NextRequest, NextResponse } from "next/server";
import { getAccountSession } from "@/server/account/session";
import { resolveForwardedHost } from "@/server/account/requestHost";
import { getAccountServiceApiBaseUrl } from "@/server/serviceConfig";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token)
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const response = await fetch(
      `${getAccountServiceApiBaseUrl(resolveForwardedHost(request))}/referrals`,
      {
        headers: {
          Authorization: `Bearer ${session.token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
    const payload: unknown = await response.json().catch(() => null);
    return NextResponse.json(payload ?? { error: "invalid_response" }, {
      status: payload === null ? 502 : response.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "account_service_unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
