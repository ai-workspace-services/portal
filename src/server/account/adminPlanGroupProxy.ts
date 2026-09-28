import { NextRequest, NextResponse } from "next/server";

import { evaluateAccountAdminAccess } from "@server/account/adminAccess";
import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

type ErrorPayload = { error: string };

export async function proxyAdminPlanGroupRequest(
  request: NextRequest,
  upstreamPath: string,
): Promise<NextResponse> {
  const session = await getAccountSession(request);
  if (!session.user || !session.token) {
    return NextResponse.json<ErrorPayload>(
      { error: "unauthenticated" },
      { status: 401 },
    );
  }

  const access = await evaluateAccountAdminAccess(session.user, {
    roles: ["admin"],
    permissions: ["admin.settings.write"],
  });
  if (!access.allowed) {
    return NextResponse.json<ErrorPayload>(
      { error: access.reason ?? "forbidden" },
      { status: 403 },
    );
  }

  const body = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json<ErrorPayload>(
      { error: "invalid_request" },
      { status: 400 },
    );
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json<ErrorPayload>(
      { error: "invalid_request" },
      { status: 400 },
    );
  }
  const requestBody = payload as Record<string, unknown>;
  const reason = requestBody.reason;
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return NextResponse.json<ErrorPayload>(
      { error: "reason_required" },
      { status: 400 },
    );
  }
  if (reason.trim().length > 500) {
    return NextResponse.json<ErrorPayload>(
      { error: "reason_too_long" },
      { status: 400 },
    );
  }
  if (requestBody.mode !== "preview" && requestBody.mode !== "apply") {
    return NextResponse.json<ErrorPayload>(
      { error: "invalid_mode" },
      { status: 400 },
    );
  }

  const headers = new Headers({
    Authorization: `Bearer ${session.token}`,
    Accept: "application/json",
    "Content-Type": request.headers.get("content-type") ?? "application/json",
  });
  const response = await fetch(
    `${getAccountServiceApiBaseUrl()}${upstreamPath}`,
    {
      method: "PUT",
      headers,
      body,
      cache: "no-store",
    },
  );
  const responseBody = await response.json().catch(() => null);
  if (responseBody === null) {
    return NextResponse.json<ErrorPayload>(
      { error: "invalid_response" },
      { status: 502 },
    );
  }
  return NextResponse.json(responseBody, { status: response.status });
}
