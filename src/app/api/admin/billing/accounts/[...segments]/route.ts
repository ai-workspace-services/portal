export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import {
  evaluateAccountAdminAccess,
  isOperationsUser,
} from "@server/account/adminAccess";
import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";
import type { AccountUserRole } from "@server/account/session";

const ACCOUNT_API_BASE = getAccountServiceApiBaseUrl();
const READ_ROLES: AccountUserRole[] = ["admin", "operator"];
const READ_PERMISSIONS = ["admin.users.list.read"];
const WRITE_ROLES: AccountUserRole[] = ["admin"];

const ACTION_PERMISSIONS: Record<string, string[]> = {
  plan: ["admin.settings.write"],
  quota: ["admin.settings.write"],
  "grant-trial": ["admin.settings.write"],
  "clear-arrears": ["admin.settings.write"],
  balance: ["admin.billing.money.write"],
};

type RouteContext = {
  params: Promise<{ segments: string[] }>;
};

type ErrorPayload = { error: string };

async function proxyBillingAccountRequest(
  request: NextRequest,
  context: RouteContext,
  method: "GET" | "POST",
) {
  const session = await getAccountSession(request);
  const user = session.user;

  if (!user || !session.token) {
    return NextResponse.json<ErrorPayload>(
      { error: "unauthenticated" },
      { status: 401 },
    );
  }

  if (!isOperationsUser(user)) {
    return NextResponse.json<ErrorPayload>(
      { error: "forbidden" },
      { status: 403 },
    );
  }

  const { segments } = await context.params;
  const normalizedSegments = (segments ?? [])
    .map((segment) => segment.trim())
    .filter(Boolean);
  const action = normalizedSegments.length === 2 ? normalizedSegments[1] : "";
  const permission = method === "GET"
    ? { roles: READ_ROLES, permissions: READ_PERMISSIONS }
    : { roles: WRITE_ROLES, permissions: ACTION_PERMISSIONS[action] ?? [] };
  const access = await evaluateAccountAdminAccess(user, permission);

  if (!access.allowed) {
    return NextResponse.json<ErrorPayload>(
      { error: access.reason ?? "forbidden" },
      { status: 403 },
    );
  }

  if (normalizedSegments.length < 1 || normalizedSegments.length > 2) {
    return NextResponse.json<ErrorPayload>(
      { error: "invalid_account_path" },
      { status: 400 },
    );
  }

  if (method === "POST" && !ACTION_PERMISSIONS[action]) {
    return NextResponse.json<ErrorPayload>(
      { error: "unsupported_account_action" },
      { status: 404 },
    );
  }

  const endpoint = `${ACCOUNT_API_BASE}/admin/billing/accounts/${normalizedSegments
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
  const headers = new Headers({
    Authorization: `Bearer ${session.token}`,
    Accept: "application/json",
  });
  const body = method === "POST" ? await request.text() : undefined;
  if (body !== undefined) {
    headers.set(
      "Content-Type",
      request.headers.get("content-type") ?? "application/json",
    );
  }

  const response = await fetch(endpoint, {
    method,
    headers,
    body,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);

  if (payload === null) {
    return NextResponse.json<ErrorPayload>(
      { error: "invalid_response" },
      { status: 502 },
    );
  }

  return NextResponse.json(payload, { status: response.status });
}

export function GET(request: NextRequest, context: RouteContext) {
  return proxyBillingAccountRequest(request, context, "GET");
}

export function POST(request: NextRequest, context: RouteContext) {
  return proxyBillingAccountRequest(request, context, "POST");
}
