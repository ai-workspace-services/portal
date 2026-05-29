import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BRIDGE_SERVER_URL = "https://xworkmate-bridge.svc.plus";

function bridgeServerUrl(): string {
  return (
    process.env.BRIDGE_SERVER_URL?.trim().replace(/\/+$/, "") ||
    DEFAULT_BRIDGE_SERVER_URL
  );
}

function bridgeAuthToken(): string {
  return process.env.BRIDGE_AUTH_TOKEN?.trim() ?? "";
}

function jsonError(message: string, status = 500): Response {
  return Response.json({ error: { message } }, { status });
}

function bridgeHeaders(): HeadersInit {
  const token = bridgeAuthToken();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  const action = request.nextUrl.searchParams.get("action") ?? "ping";
  if (action !== "ping") {
    return jsonError("Unsupported xworkmate bridge action.", 400);
  }

  const response = await fetch(`${bridgeServerUrl()}/api/ping`, {
    cache: "no-store",
    headers: bridgeHeaders(),
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

  const response = await fetch(`${bridgeServerUrl()}/acp/rpc`, {
    method: "POST",
    cache: "no-store",
    headers: bridgeHeaders(),
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
