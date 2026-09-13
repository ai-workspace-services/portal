import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@lib/authGateway";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

export async function POST(request: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "session_required" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const response = await fetch(
    `${getAccountServiceApiBaseUrl()}/password/reset/mfa`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
