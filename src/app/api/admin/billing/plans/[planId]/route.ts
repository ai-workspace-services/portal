export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import {
  evaluateAccountAdminAccess,
  isOperationsUser,
} from "@server/account/adminAccess";
import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

const ACCOUNT_API_BASE = getAccountServiceApiBaseUrl();

type RouteContext = { params: Promise<{ planId: string }> };

async function getWriteSession(request: NextRequest) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token) {
    return {
      response: NextResponse.json(
        { error: "unauthenticated" },
        { status: 401 },
      ),
    };
  }
  if (!isOperationsUser(session.user)) {
    return {
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  const access = await evaluateAccountAdminAccess(session.user, {
    roles: ["admin"],
    permissions: ["admin.billing.money.write"],
  });
  if (!access.allowed) {
    return {
      response: NextResponse.json(
        { error: access.reason ?? "forbidden" },
        { status: 403 },
      ),
    };
  }
  return { session };
}

function validateReason(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0)
    return "reason_required";
  if (value.trim().length > 500) return "reason_too_long";
  return null;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await getWriteSession(request);
  if (auth.response) return auth.response;
  const { planId } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const reasonError = validateReason((body as { reason?: unknown }).reason);
  if (reasonError)
    return NextResponse.json({ error: reasonError }, { status: 400 });

  const response = await fetch(
    `${ACCOUNT_API_BASE}/admin/billing/plans/${encodeURIComponent(planId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${auth.session.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  const payload = await response.json().catch(() => null);
  if (payload === null)
    return NextResponse.json({ error: "invalid_response" }, { status: 502 });
  return NextResponse.json(payload, { status: response.status });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await getWriteSession(request);
  if (auth.response) return auth.response;
  const { planId } = await context.params;
  const reason = request.nextUrl.searchParams.get("reason");
  const reasonError = validateReason(reason);
  if (reasonError)
    return NextResponse.json({ error: reasonError }, { status: 400 });

  const upstream = new URL(
    `${ACCOUNT_API_BASE}/admin/billing/plans/${encodeURIComponent(planId)}`,
  );
  upstream.searchParams.set("reason", reason!.trim());
  const response = await fetch(upstream, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${auth.session.token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (payload === null)
    return NextResponse.json({ error: "invalid_response" }, { status: 502 });
  return NextResponse.json(payload, { status: response.status });
}
