export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import {
  evaluateAccountAdminAccess,
  isOperationsUser,
} from "@server/account/adminAccess";
import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

const ACCOUNT_API_BASE = getAccountServiceApiBaseUrl();

type RouteContext = { params: Promise<{ groupId: string; userId: string }> };

function validateReason(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "reason_required";
  }
  if (value.trim().length > 500) {
    return "reason_too_long";
  }
  return null;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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

  const { groupId, userId } = await context.params;
  let reason = request.nextUrl.searchParams.get("reason");
  if (!reason) {
    const body = await request.json().catch(() => null);
    if (body && typeof body === "object" && typeof (body as { reason?: unknown }).reason === "string") {
      reason = (body as { reason: string }).reason;
    }
  }
  const reasonError = validateReason(reason);
  if (reasonError) {
    return NextResponse.json({ error: reasonError }, { status: 400 });
  }

  const upstream = new URL(
    `${ACCOUNT_API_BASE}/admin/billing/whitelist-groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
  );
  upstream.searchParams.set("reason", reason!.trim());

  const response = await fetch(upstream, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (payload === null) {
    return NextResponse.json({ error: "invalid_response" }, { status: 502 });
  }
  return NextResponse.json(payload, { status: response.status });
}
