import type { NextRequest } from "next/server";

import { getAccountSession } from "@/server/account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BRIDGE_SERVER_URL = "https://xworkmate-bridge.svc.plus";

type RouteContext = {
  params: Promise<{ segments: string[] }>;
};

function bridgeServerUrl(): string {
  return (
    process.env.BRIDGE_SERVER_URL?.trim().replace(/\/+$/, "") ||
    DEFAULT_BRIDGE_SERVER_URL
  );
}

function isAllowedPath(segments: string[], method: string): boolean {
  if (segments.length === 1) {
    return method === "GET";
  }
  if (
    segments.length === 3 &&
    segments[0] === "namespaces" &&
    segments[2] === "sessions"
  ) {
    return method === "GET" || method === "POST";
  }
  if (segments.length !== 2) return false;
  return (
    (segments[1] === "events" && method === "GET") ||
    (segments[1] === "messages" && method === "POST")
  );
}

async function proxy(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { segments } = await context.params;
  if (
    !isAllowedPath(segments, request.method) ||
    segments.some((segment) => !segment || segment.includes(".."))
  ) {
    return Response.json(
      { error: { message: "Unsupported task-session path." } },
      { status: 400 },
    );
  }
  const session = await getAccountSession(request);
  if (!session.token) {
    return Response.json(
      { error: { message: "Authentication required." } },
      { status: 401 },
    );
  }

  const upstreamSegments =
    segments[0] === "namespaces" ? segments : ["sessions", ...segments];
  const target = new URL(
    `/api/v1/${upstreamSegments.map(encodeURIComponent).join("/")}`,
    bridgeServerUrl(),
  );
  target.search = request.nextUrl.search;
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body
          ? {
              "Content-Type":
                request.headers.get("content-type") ?? "application/json",
            }
          : {}),
        Authorization: `Bearer ${session.token}`,
      },
      body: body ? Buffer.from(body) : undefined,
    });
  } catch {
    return Response.json(
      { error: { message: "Bridge is unavailable." } },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
