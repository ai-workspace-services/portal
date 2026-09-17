import type { NextRequest } from "next/server";

import { getAccountSession } from "@/server/account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PASS_THROUGH_QUERY = ["scope", "limit", "offset"] as const;

function bridgeServerUrl(): string {
  return (
    process.env.BRIDGE_SERVER_URL?.trim().replace(/\/+$/, "") ||
    (process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:8787"
      : "https://xworkmate-bridge.svc.plus")
  );
}

/**
 * The shared task catalog is per account: it requires the signed-in account's
 * token. Only local development may fall back to a bridge token from the
 * environment.
 */
async function resolveToken(request: NextRequest): Promise<string | undefined> {
  const session = await getAccountSession(request).catch(() => ({ token: undefined }));
  if (session.token) return session.token;
  if (process.env.NODE_ENV !== "development") return undefined;
  return process.env.AI_WORKSPACE_AUTH_TOKEN?.trim() || process.env.BRIDGE_AUTH_TOKEN?.trim() || undefined;
}

export async function GET(request: NextRequest): Promise<Response> {
  const token = await resolveToken(request);
  if (!token) {
    return Response.json({ ok: false, error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
  }

  const target = new URL("/api/v1/agent/catalog", bridgeServerUrl());
  for (const name of PASS_THROUGH_QUERY) {
    const value = request.nextUrl.searchParams.get(name);
    if (value !== null) target.searchParams.set(name, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return Response.json(
      { ok: false, error: { code: "bridge_unavailable", message: "Task catalog is unavailable." } },
      { status: 502 },
    );
  }

  // An outage must surface as an error, never as an empty catalog.
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
