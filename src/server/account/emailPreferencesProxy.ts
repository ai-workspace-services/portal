import { NextRequest, NextResponse } from "next/server";
import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

export async function proxyEmailPreferences(
  request: NextRequest,
  unsubscribe = false,
) {
  const key = request.nextUrl.searchParams.get("key");
  const headers = new Headers({
    "Content-Type": request.headers.get("content-type") ?? "application/json",
  });
  if (!key) {
    const session = await getAccountSession(request);
    if (!session.token)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    headers.set("Authorization", `Bearer ${session.token}`);
  }
  const endpoint = unsubscribe ? "email-unsubscribe" : "email-preferences";
  const suffix = key ? `?key=${encodeURIComponent(key)}` : "";
  try {
    const response = await fetch(
      `${getAccountServiceApiBaseUrl()}/${endpoint}${suffix}`,
      {
        method: request.method,
        headers,
        body: request.method === "GET" ? undefined : await request.text(),
        cache: "no-store",
      },
    );
    const responseHeaders = {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    };
    if (response.status === 204)
      return new NextResponse(null, { status: 204, headers: responseHeaders });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload ?? { error: "invalid_response" }, {
      status: payload === null ? 502 : response.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "account_service_unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
