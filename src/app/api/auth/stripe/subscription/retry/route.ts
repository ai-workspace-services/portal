import { NextRequest, NextResponse } from "next/server";
import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

export async function POST(request: NextRequest) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // No client-provided operation, user or price IDs: Accounts locates only
  // the authenticated user's existing durable reservation.
  const response = await fetch(
    `${getAccountServiceApiBaseUrl()}/stripe/subscription/retry`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    },
  );
  return NextResponse.json(await response.json().catch(() => ({})), {
    status: response.status,
  });
}
