export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { getAccountServiceBaseUrl } from "@server/serviceConfig";
import {
  getAccountSession,
  userHasRoleOrPermission,
} from "@server/account/session";
import type { AccountUserRole } from "@server/account/session";
import { isXConnectZeroAdminOverview } from "@lib/xconnectZero";

const ACCOUNT_OVERLAY_API_BASE = `${getAccountServiceBaseUrl()}/api/overlay/v1`;
const READ_ROLES: AccountUserRole[] = ["admin", "operator"];
const ALLOWED_ROUTES = new Map([
  ["GET overview", "/admin/overview"],
  ["GET networks", "/admin/networks"],
  ["GET devices", "/admin/devices"],
  ["GET invites", "/admin/invites"],
  ["POST networks/bootstrap", "/admin/networks/bootstrap"],
]);

type ErrorPayload = {
  error:
    | "unauthenticated"
    | "forbidden"
    | "control_plane_unavailable"
    | "upstream_unreachable"
    | "invalid_response";
};

function errorResponse(error: ErrorPayload["error"], status: number) {
  return NextResponse.json<ErrorPayload>({ error }, { status });
}

function resolveRoute(method: string, segments: string[] | undefined): string | undefined {
  if (!segments) return undefined;
  const exact = ALLOWED_ROUTES.get(`${method} ${segments.join("/")}`);
  if (exact) return exact;
  if (segments.length === 3 && segments[0] === "networks" && segments[2] === "policy") {
    return `/admin/networks/${encodeURIComponent(segments[1])}/policy`;
  }
  if (segments.length === 3 && segments[0] === "devices" && segments[2] === "revoke") {
    return `/admin/devices/${encodeURIComponent(segments[1])}/revoke`;
  }
  return undefined;
}

function requiredPermission(method: string): string {
  return method === "GET" ? "xconnect.zero.read" : "xconnect.zero.manage";
}

async function proxy(request: NextRequest, method: string, context: { params: Promise<{ segments?: string[] }> }) {
  const segments = (await context.params).segments;
  const endpointPath = resolveRoute(method, segments);
  if (!endpointPath) return errorResponse("control_plane_unavailable", 404);

  const session = await getAccountSession(request);
  if (!session.user || !session.token) return errorResponse("unauthenticated", 401);
  if (!(await userHasRoleOrPermission(session.user, READ_ROLES, [requiredPermission(method)]))) {
    return errorResponse("forbidden", 403);
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${session.token}`,
    Accept: "application/json",
  };
  const body = method === "GET" || method === "HEAD" ? undefined : await request.text();
  if (body) headers["Content-Type"] = request.headers.get("content-type") ?? "application/json";

  let response: Response;
  try {
    response = await fetch(`${ACCOUNT_OVERLAY_API_BASE}${endpointPath}`, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
  } catch (error) {
    console.error("XConnect Zero control-plane request failed", error);
    return errorResponse("upstream_unreachable", 502);
  }
  if (response.status === 404) return errorResponse("control_plane_unavailable", 503);
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  const payload = await response.json().catch(() => null);
  if (method === "GET" && endpointPath === "/admin/overview" && !isXConnectZeroAdminOverview(payload)) {
    return errorResponse("invalid_response", 502);
  }
  if (!response.ok) {
    return NextResponse.json(payload ?? { error: "control_plane_unavailable" }, { status: response.status });
  }
  return NextResponse.json(payload, { status: response.status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ segments?: string[] }> },
) {
  return proxy(request, "GET", context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ segments?: string[] }> }) {
  return proxy(request, "POST", context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ segments?: string[] }> }) {
  return proxy(request, "PUT", context);
}

export function PATCH() {
  return errorResponse("control_plane_unavailable", 404);
}

export function DELETE() {
  return errorResponse("control_plane_unavailable", 404);
}
