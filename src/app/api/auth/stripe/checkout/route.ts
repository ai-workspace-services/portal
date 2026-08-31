import { NextRequest, NextResponse } from "next/server";

import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

const ACCOUNT_API_BASE = getAccountServiceApiBaseUrl();

export async function POST(request: NextRequest) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const input = await request.json().catch(() => ({}));
  // Keep the BFF boundary explicit: the browser may select a catalog plan and
  // its public Price ID, but can never forward credentials or arbitrary Stripe
  // parameters to Accounts.
  const payload = {
    planId: typeof input?.planId === "string" ? input.planId : "",
    stripePriceId:
      typeof input?.stripePriceId === "string" ? input.stripePriceId : "",
    mode: input?.mode === "payment" ? "payment" : "subscription",
    productSlug:
      typeof input?.productSlug === "string" ? input.productSlug : "",
    sourcePath:
      typeof input?.sourcePath === "string" ? input.sourcePath : "/prices",
  };
  const response = await fetch(`${ACCOUNT_API_BASE}/stripe/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
