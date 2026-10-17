import { NextRequest, NextResponse } from "next/server";

import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const response = await fetch(
    `${getAccountServiceApiBaseUrl()}/password/forgot`,
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
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

export function GET() {
  return NextResponse.json(
    { error: "method_not_allowed" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
