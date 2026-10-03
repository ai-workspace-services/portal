import { NextRequest, NextResponse } from "next/server";

import { applySessionCookie, deriveMaxAgeFromExpires } from "@lib/authGateway";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const response = await fetch(
    `${getAccountServiceApiBaseUrl()}/account/reactivate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
  const data = (await response.json().catch(() => ({}))) as {
    token?: string;
    expiresAt?: string;
  };
  const result = NextResponse.json(data, { status: response.status });
  if (response.ok && data.token) {
    applySessionCookie(
      result,
      data.token,
      deriveMaxAgeFromExpires(data.expiresAt),
      request.headers.get("host") ?? undefined,
    );
  }
  return result;
}
