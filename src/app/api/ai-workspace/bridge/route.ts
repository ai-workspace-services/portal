import type { NextRequest } from "next/server";
import { getXWorkmateSessionContext } from "@/server/xworkmate/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BRIDGE_SERVER_URL = "https://xworkmate-bridge.svc.plus";

function jsonError(message: string, status = 500): Response {
  return Response.json({ error: { message } }, { status });
}

async function getBridgeContext() {
  const { profile } = await getXWorkmateSessionContext();
  const bridgeUrl = profile?.profile?.bridgeUrl?.trim().replace(/\/+$/, "") || DEFAULT_BRIDGE_SERVER_URL;
  const bridgeToken = profile?.profile?.bridgeToken?.trim() || process.env.BRIDGE_AUTH_TOKEN?.trim() || "";
  
  return { bridgeUrl, bridgeToken };
}

function bridgeHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  const action = request.nextUrl.searchParams.get("action") ?? "ping";
  if (action !== "ping") {
    return jsonError("Unsupported bridge action.", 400);
  }

  const { bridgeUrl, bridgeToken } = await getBridgeContext();

  const response = await fetch(`${bridgeUrl}/api/ping`, {
    cache: "no-store",
    headers: bridgeHeaders(bridgeToken),
  });
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const { bridgeUrl, bridgeToken } = await getBridgeContext();

  const response = await fetch(`${bridgeUrl}/acp/rpc`, {
    method: "POST",
    cache: "no-store",
    headers: bridgeHeaders(bridgeToken),
    body: JSON.stringify(payload),
  });
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}
