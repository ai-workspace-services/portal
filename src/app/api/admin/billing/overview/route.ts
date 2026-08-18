export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import {
  evaluateAccountAdminAccess,
  isOperationsUser,
} from "@server/account/adminAccess";
import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

const ACCOUNT_API_BASE = getAccountServiceApiBaseUrl();

export async function GET(request: NextRequest) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!isOperationsUser(session.user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const access = await evaluateAccountAdminAccess(session.user, {
    roles: ["admin", "operator"],
    permissions: ["admin.users.metrics.read"],
  });
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason ?? "forbidden" }, { status: 403 });
  }

  const upstream = new URL(`${ACCOUNT_API_BASE}/admin/billing/overview`);
  request.nextUrl.searchParams.forEach((value, key) => upstream.searchParams.set(key, value));
  const response = await fetch(upstream, {
    headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (payload === null) return NextResponse.json({ error: "invalid_response" }, { status: 502 });
  return NextResponse.json(payload, { status: response.status });
}
