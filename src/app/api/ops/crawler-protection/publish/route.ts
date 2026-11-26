import { NextRequest, NextResponse } from "next/server";

import { requireOpsWafAccess } from "@server/waf/auth";
import {
  getCloudflareRemoteStatus,
  publishCloudflareCrawlerPolicy,
} from "@server/waf/providers/cloudflare";
import {
  getWebhookRemoteStatus,
  publishWebhookCrawlerPolicy,
} from "@server/waf/providers/webhook";
import { getProviderRecord } from "@server/waf/store";
import type { CrawlerPolicyInput, WafActionMode } from "@server/waf/types";

export const dynamic = "force-dynamic";

const VALID_MODES = new Set<WafActionMode>(["observe", "challenge", "block"]);

export async function GET(request: NextRequest) {
  const auth = await requireOpsWafAccess(request);
  if (!auth.ok) {
    return auth.response;
  }

  const providerId =
    request.nextUrl.searchParams.get("providerId")?.trim() || "cloudflare-default";
  const domain = request.nextUrl.searchParams.get("domain")?.trim() || undefined;

  const provider = await getProviderRecord(providerId);
  if (!provider) {
    return NextResponse.json(
      { error: "provider_not_found", message: `Provider ${providerId} not found` },
      { status: 404 },
    );
  }

  const status =
    provider.type === "cloudflare"
      ? await getCloudflareRemoteStatus(provider, domain)
      : await getWebhookRemoteStatus(provider);

  return NextResponse.json(status, { status: status.ok ? 200 : 400 });
}

export async function POST(request: NextRequest) {
  const auth = await requireOpsWafAccess(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: Partial<CrawlerPolicyInput>;
  try {
    body = (await request.json()) as Partial<CrawlerPolicyInput>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const providerId = body.providerId?.trim() || "";
  const domain = body.domain?.trim() || "";
  const mode = body.mode;
  const bots = Array.isArray(body.bots)
    ? body.bots.filter((b): b is string => typeof b === "string" && b.trim().length > 0)
    : [];
  const exceptions = Array.isArray(body.exceptions)
    ? body.exceptions.filter((e): e is string => typeof e === "string" && e.trim().length > 0)
    : undefined;

  if (!providerId) {
    return NextResponse.json({ error: "missing_provider_id" }, { status: 400 });
  }
  if (!domain) {
    return NextResponse.json({ error: "missing_domain" }, { status: 400 });
  }
  if (!mode || !VALID_MODES.has(mode)) {
    return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
  }
  if (bots.length === 0) {
    return NextResponse.json({ error: "missing_bots" }, { status: 400 });
  }

  const provider = await getProviderRecord(providerId);
  if (!provider) {
    return NextResponse.json(
      { error: "provider_not_found", message: `Provider ${providerId} not found` },
      { status: 404 },
    );
  }
  if (!provider.enabled) {
    return NextResponse.json(
      { error: "provider_disabled", message: `Provider ${provider.name} is disabled` },
      { status: 400 },
    );
  }

  const policy: CrawlerPolicyInput = {
    providerId,
    domain,
    mode,
    bots,
    exceptions,
  };

  try {
    const result =
      provider.type === "cloudflare"
        ? await publishCloudflareCrawlerPolicy(provider, policy)
        : await publishWebhookCrawlerPolicy(provider, policy);

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        providerId: provider.id,
        providerType: provider.type,
        domain,
        mode,
        appliedAction: "none",
        message: error instanceof Error ? error.message : "publish_failed",
        syncedAt: new Date().toISOString(),
      },
      { status: 400 },
    );
  }
}
