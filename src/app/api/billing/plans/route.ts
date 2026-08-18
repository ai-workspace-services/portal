import { NextResponse } from "next/server";

import { getAccountServiceBaseUrl } from "@server/serviceConfig";

// accounts registers this on the ungrouped root router
// (r.GET("/api/billing/plans", h.listPublicBillingPlans)), not under
// /api/auth/ like every other proxy route in this directory — it backs the
// public pricing page and needs no session. getAccountServiceApiBaseUrl()
// would append /api/auth/ and hit the wrong path, so this uses the plain
// service base URL instead.
const ACCOUNT_SERVICE_BASE_URL = getAccountServiceBaseUrl();

export async function GET() {
  const response = await fetch(`${ACCOUNT_SERVICE_BASE_URL}/api/billing/plans`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
