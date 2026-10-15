export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { isOperationsUser } from "@server/account/adminAccess";
import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

type RouteContext = { params: Promise<{ segments: string[] }> };

// Serverless routes this boundary directly to Accounts. Selfhost must exchange
// the console session for the same authenticated request; Accounts remains the
// authority for root-only actions, permissions and team isolation.
async function proxy(request: NextRequest, context: RouteContext) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!isOperationsUser(session.user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { segments } = await context.params;
  if (
    !segments?.length ||
    segments.some(
      (part) =>
        !/^[a-zA-Z0-9@._:+-]+$/.test(part) || part === "." || part === "..",
    )
  ) {
    return NextResponse.json({ error: "invalid_admin_path" }, { status: 400 });
  }

  const headers = new Headers({
    Authorization: `Bearer ${session.token}`,
    Accept: request.headers.get("accept") ?? "application/json",
  });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  try {
    const response = await fetch(
      `${getAccountServiceApiBaseUrl()}/admin/${segments.map(encodeURIComponent).join("/")}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body: request.method === "GET" ? undefined : await request.text(),
        cache: "no-store",
        redirect: "manual",
      },
    );
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    for (const name of ["content-type", "content-disposition"]) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "account_service_unavailable" },
      { status: 502 },
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
