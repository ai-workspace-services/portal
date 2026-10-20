import { NextRequest, NextResponse } from "next/server";
import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

export async function POST(request: NextRequest) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await request.json().catch(() => ({}));
  const payload = {
    planId: typeof input?.planId === "string" ? input.planId : "",
    stripePriceId:
      typeof input?.stripePriceId === "string" ? input.stripePriceId : "",
    mode: "subscription",
    productSlug:
      typeof input?.productSlug === "string" ? input.productSlug : "",
  };
  const response = await fetch(
    `${getAccountServiceApiBaseUrl()}/stripe/subscription/preview`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
  return NextResponse.json(await response.json().catch(() => ({})), {
    status: response.status,
  });
}
