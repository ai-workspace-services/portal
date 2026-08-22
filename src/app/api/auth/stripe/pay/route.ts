import { NextRequest, NextResponse } from "next/server";

import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

const ACCOUNT_API_BASE = getAccountServiceApiBaseUrl();

// Keep the browser on the console origin while the account service performs
// authentication and decorates the Stripe Payment Link with client context.
export async function GET(request: NextRequest) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const response = await fetch(`${ACCOUNT_API_BASE}/stripe/pay`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.token}`,
      Accept: "text/html,application/json",
    },
    redirect: "manual",
    cache: "no-store",
  });

  const location = response.headers.get("location");
  if (location && response.status >= 300 && response.status < 400) {
    return NextResponse.redirect(location, response.status);
  }

  const data = await response.json().catch(() => ({ error: "stripe_pay_failed" }));
  return NextResponse.json(data, { status: response.status });
}
