import { NextRequest, NextResponse } from "next/server";

import { requireOpsWafAccess } from "@server/waf/auth";
import { testCloudflareConnection } from "@server/waf/providers/cloudflare";
import { testWebhookConnection } from "@server/waf/providers/webhook";
import { getProviderRecord } from "@server/waf/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireOpsWafAccess(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: { providerId?: string; domain?: string } = {};
  try {
    body = (await request.json()) as { providerId?: string; domain?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const providerId = body.providerId?.trim() || "cloudflare-default";
  const provider = await getProviderRecord(providerId);
  if (!provider) {
    return NextResponse.json(
      { error: "provider_not_found", message: `Provider ${providerId} not found` },
      { status: 404 },
    );
  }

  const domain = typeof body.domain === "string" ? body.domain.trim() : undefined;
  try {
    const result =
      provider.type === "cloudflare"
        ? await testCloudflareConnection(provider, domain)
        : await testWebhookConnection(provider);

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        providerId: provider.id,
        message: error instanceof Error ? error.message : "test_failed",
      },
      { status: 400 },
    );
  }
}
