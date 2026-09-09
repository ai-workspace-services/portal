import { NextRequest, NextResponse } from "next/server";

import { getAccountServiceApiBaseUrl } from "@/server/serviceConfig";

const ALLOWED_PROVIDERS = new Set(["github", "google"]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const normalizedProvider = provider.trim().toLowerCase();
  if (!ALLOWED_PROVIDERS.has(normalizedProvider)) {
    return NextResponse.json({ error: "provider_not_found" }, { status: 404 });
  }

  // Resolve the account service from the current environment host so a UAT
  // request cannot fall back to the production Accounts endpoint.
  const accountApiBase = getAccountServiceApiBaseUrl(request.nextUrl.hostname);
  const target = new URL(
    `${accountApiBase}/oauth/login/${normalizedProvider}`,
  );
  target.searchParams.set("frontend_url", request.nextUrl.origin);

  return NextResponse.redirect(target, { status: 307 });
}
