import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@lib/authGateway";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

const ACCOUNT_API_BASE = getAccountServiceApiBaseUrl();

// Kept as a proxy alongside cancellation so a refund entry point can be
// enabled without exposing the Accounts service directly to the browser.
export async function POST(request: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const response = await fetch(`${ACCOUNT_API_BASE}/subscriptions/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ externalId: payload.externalId }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, {
    status: response.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const response = await fetch(`${ACCOUNT_API_BASE}/subscriptions/refund`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  return NextResponse.json(await response.json().catch(() => ({})), {
    status: response.status,
    headers: { "Cache-Control": "no-store" },
  });
}
