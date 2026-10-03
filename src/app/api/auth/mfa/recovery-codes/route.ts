import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@lib/authGateway";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

async function proxy(request: NextRequest, method: "GET" | "POST" | "DELETE") {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { error: "session_required" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  const init: RequestInit = { method, headers, cache: "no-store" };
  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(await request.json().catch(() => ({})));
  }

  try {
    const upstream = await fetch(
      `${getAccountServiceApiBaseUrl()}/mfa/recovery-codes`,
      init,
    );
    const data = await upstream.json().catch(() => ({}));
    const response = NextResponse.json(data, {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "account_service_unreachable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function GET(request: NextRequest) {
  return proxy(request, "GET");
}

export function POST(request: NextRequest) {
  return proxy(request, "POST");
}

export function DELETE(request: NextRequest) {
  return proxy(request, "DELETE");
}
