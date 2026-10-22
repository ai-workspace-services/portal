import { NextRequest, NextResponse } from "next/server";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (action !== "request" && action !== "confirm")
    return NextResponse.json({ error: "invalid_action" }, { status: 404 });
  const input = await request.json().catch(() => null);
  if (
    typeof input?.email !== "string" ||
    !input.email.includes("@") ||
    input.email.length > 254
  )
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const payload =
    action === "request"
      ? { email: input.email }
      : {
          email: input.email,
          code: input.code,
          reason: input.reason,
          authorized: input.authorized === true,
        };
  try {
    const upstream = await fetch(
      `${getAccountServiceApiBaseUrl()}/mfa/recovery/${action}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        redirect: "error",
      },
    );
    return NextResponse.json(await upstream.json(), {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "account_service_unreachable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
