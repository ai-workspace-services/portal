import { NextRequest, NextResponse } from "next/server";

import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as {
    email?: unknown;
    code?: unknown;
    password?: unknown;
  } | null;
  const email =
    typeof payload?.email === "string"
      ? payload.email.trim().toLowerCase()
      : "";
  const code = typeof payload?.code === "string" ? payload.code.trim() : "";
  const password =
    typeof payload?.password === "string" ? payload.password : "";
  if (
    !email ||
    !email.includes("@") ||
    !/^\d{6}$/.test(code) ||
    password.length < 8
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${getAccountServiceApiBaseUrl()}/password/forgot/confirm-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, code, password }),
        cache: "no-store",
      },
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "account_service_unreachable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function GET() {
  return NextResponse.json(
    { error: "method_not_allowed" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
