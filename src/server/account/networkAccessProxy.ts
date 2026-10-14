import { NextRequest, NextResponse } from "next/server";
import { evaluateAccountAdminAccess } from "./adminAccess";
import { getAccountSession } from "./session";
import { resolveForwardedHost } from "./requestHost";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

export async function proxyNetworkAccess(
  request: NextRequest,
  path: string,
  permission?: string,
) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (permission) {
    const access = await evaluateAccountAdminAccess(session.user, {
      roles: ["admin"],
      permissions: [permission],
    });
    if (!access.allowed)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const response = await fetch(
    `${getAccountServiceApiBaseUrl(resolveForwardedHost(request))}/${path}`,
    {
      method: request.method,
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...(["GET", "HEAD"].includes(request.method)
        ? {}
        : { body: await request.text() }),
      cache: "no-store",
    },
  );
  const payload: unknown = await response.json().catch(() => null);
  return NextResponse.json(payload ?? { error: "invalid_response" }, {
    status: payload === null ? 502 : response.status,
    headers: { "Cache-Control": "no-store" },
  });
}
