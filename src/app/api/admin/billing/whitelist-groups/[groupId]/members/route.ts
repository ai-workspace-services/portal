export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import {
  evaluateAccountAdminAccess,
  isOperationsUser,
} from "@server/account/adminAccess";
import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

const ACCOUNT_API_BASE = getAccountServiceApiBaseUrl();

type RouteContext = { params: Promise<{ groupId: string }> };

function validateReason(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "reason_required";
  }
  if (value.trim().length > 500) {
    return "reason_too_long";
  }
  return null;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!isOperationsUser(session.user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const access = await evaluateAccountAdminAccess(session.user, {
    roles: ["admin", "operator"],
    permissions: ["admin.settings.write"],
  });
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason ?? "forbidden" },
      { status: 403 },
    );
  }

  const { groupId } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const email =
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";
  if (!email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }
  const reasonError = validateReason((body as { reason?: unknown }).reason);
  if (reasonError) {
    return NextResponse.json({ error: reasonError }, { status: 400 });
  }

  const response = await fetch(
    `${ACCOUNT_API_BASE}/admin/billing/whitelist-groups/${encodeURIComponent(groupId)}/members`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  const payload = await response.json().catch(() => null);
  if (payload === null) {
    return NextResponse.json({ error: "invalid_response" }, { status: 502 });
  }
  return NextResponse.json(payload, { status: response.status });
}
