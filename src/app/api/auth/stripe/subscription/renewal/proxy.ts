import { NextRequest, NextResponse } from "next/server";
import { getAccountSession } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

export async function renewalProxy(request: NextRequest, preview = false) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input =
    request.method === "POST" ? await request.json().catch(() => ({})) : null;
  const payload = preview
    ? { planId: typeof input?.planId === "string" ? input.planId : "" }
    : {
        previewToken:
          typeof input?.previewToken === "string" ? input.previewToken : "",
      };
  try {
    const response = await fetch(
      `${getAccountServiceApiBaseUrl()}/stripe/subscription/renewal${preview ? "/preview" : ""}`,
      {
        method: request.method,
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        ...(request.method === "POST" ? { body: JSON.stringify(payload) } : {}),
        cache: "no-store",
      },
    );
    return NextResponse.json(await response.json().catch(() => ({})), {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { error: "renewal_service_unavailable" },
      { status: 502 },
    );
  }
}
