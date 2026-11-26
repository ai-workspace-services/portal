import { NextRequest, NextResponse } from "next/server";

import { requireOpsWafAccess } from "@server/waf/auth";
import { deleteProvider, listProviders, upsertProvider } from "@server/waf/store";
import type { WafProviderUpsertInput } from "@server/waf/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireOpsWafAccess(request);
  if (!auth.ok) {
    return auth.response;
  }

  const providers = await listProviders();
  return NextResponse.json({ providers });
}

async function handleUpsert(request: NextRequest, defaultStatus = 200) {
  const auth = await requireOpsWafAccess(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: Partial<WafProviderUpsertInput>;
  try {
    body = (await request.json()) as Partial<WafProviderUpsertInput>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const type = body.type;
  if (type !== "cloudflare" && type !== "webhook") {
    return NextResponse.json(
      { error: "invalid_provider_type", message: "type must be cloudflare or webhook" },
      { status: 400 },
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!name && !id) {
    return NextResponse.json(
      { error: "missing_name", message: "Provider name or id is required" },
      { status: 400 },
    );
  }

  const provider = await upsertProvider({
    id: id || undefined,
    type,
    name: name || id,
    enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    domain: typeof body.domain === "string" ? body.domain : undefined,
    zoneId: typeof body.zoneId === "string" ? body.zoneId : undefined,
    planTier: body.planTier,
    endpointUrl: typeof body.endpointUrl === "string" ? body.endpointUrl : undefined,
    credentialSource: body.credentialSource,
    secret: typeof body.secret === "string" ? body.secret : undefined,
  });

  return NextResponse.json({ provider }, { status: defaultStatus });
}

export async function POST(request: NextRequest) {
  return handleUpsert(request, 201);
}

export async function PUT(request: NextRequest) {
  return handleUpsert(request, 200);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireOpsWafAccess(request);
  if (!auth.ok) {
    return auth.response;
  }

  let id = request.nextUrl.searchParams.get("id")?.trim() || "";
  if (!id) {
    try {
      const body = (await request.json()) as { id?: string };
      id = typeof body.id === "string" ? body.id.trim() : "";
    } catch {
      // Ignore missing body.
    }
  }

  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const result = await deleteProvider(id);
  if (!result.deleted) {
    const status = result.reason === "cannot_delete_builtin" ? 400 : 404;
    return NextResponse.json({ error: result.reason || "delete_failed" }, { status });
  }

  return NextResponse.json({ ok: true, id });
}
