export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { getXConnectZeroServiceBaseUrl } from "@server/serviceConfig";
import {
  getAccountSession,
  userHasRoleOrPermission,
} from "@server/account/session";
import type { AccountUserRole } from "@server/account/session";
import { isXConnectZeroAdminOverview } from "@lib/xconnectZero";

const CONTROL_PLANE_TIMEOUT_MS = 8_000;
// XConnect Zero is a self-service user feature. The accounts API applies the
// authoritative owner scope; this BFF only forwards the current session.
const READ_ROLES: AccountUserRole[] = ["admin", "operator", "user"];
const ALLOWED_ROUTES = new Map([
  ["GET overview", "/admin/overview"],
  ["GET networks", "/admin/networks"],
  ["GET devices", "/admin/devices"],
  ["GET invites", "/admin/invites"],
  ["POST invites", "/admin/invites"],
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

function resolveRoute(
  method: string,
  segments: string[] | undefined,
): string | undefined {
  if (!segments) return undefined;
  const exact = ALLOWED_ROUTES.get(`${method} ${segments.join("/")}`);
  if (exact) return exact;
  if (
    segments.length === 3 &&
    segments[0] === "networks" &&
    segments[2] === "policy"
  ) {
    return `/admin/networks/${encodeURIComponent(segments[1])}/policy`;
  }
  if (
    segments.length === 3 &&
    segments[0] === "devices" &&
    segments[2] === "revoke"
  ) {
    return `/admin/devices/${encodeURIComponent(segments[1])}/revoke`;
  }
  return undefined;
}

function requiredPermission(method: string): string {
  return method === "GET" ? "xconnect.zero.read" : "xconnect.zero.manage";
}

function getRequestHost(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host");
}

function addTrustedControllerUrl(
  body: string | undefined,
  controllerUrl: string,
): string | undefined {
  if (!body) return body;
  try {
    const payload = JSON.parse(body) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      return body;
    return JSON.stringify({
      ...(payload as Record<string, unknown>),
      controller_url: controllerUrl,
    });
  } catch {
    return body;
  }
}

async function proxy(
  request: NextRequest,
  method: string,
  context: { params: Promise<{ segments?: string[] }> },
) {
  const segments = (await context.params).segments;
  const endpointPath = resolveRoute(method, segments);
  if (!endpointPath) return errorResponse("control_plane_unavailable", 404);

  const session = await getAccountSession(request);
  if (!session.user || !session.token)
    return errorResponse("unauthenticated", 401);
  if (
    !(await userHasRoleOrPermission(session.user, READ_ROLES, [
      requiredPermission(method),
    ]))
  ) {
    return errorResponse("forbidden", 403);
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${session.token}`,
    Accept: "application/json",
  };
  const body =
    method === "GET" || method === "HEAD" ? undefined : await request.text();
  if (body)
    headers["Content-Type"] =
      request.headers.get("content-type") ?? "application/json";

  let response: Response;
  try {
    const controllerUrl = getXConnectZeroServiceBaseUrl(
      getRequestHost(request),
    );
    const accountOverlayAPIBase = `${controllerUrl}/api/overlay/v1`;
    const forwardedBody =
      method === "POST" &&
      (endpointPath === "/admin/invites" ||
        endpointPath === "/admin/networks/bootstrap")
        ? addTrustedControllerUrl(body, controllerUrl)
        : body;
    response = await fetch(`${accountOverlayAPIBase}${endpointPath}`, {
      method,
      headers,
      body: forwardedBody,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(CONTROL_PLANE_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("XConnect Zero control-plane request failed", error);
    return errorResponse("upstream_unreachable", 502);
  }
  if (response.status === 404)
    return errorResponse("control_plane_unavailable", 503);
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  const payload = await response.json().catch(() => null);
  // Only successful overview responses have the success schema. Preserve an
  // upstream authorization or validation status so the panel can report the
  // actionable control-plane failure rather than a generic 502.
  if (!response.ok) {
    return NextResponse.json(
      payload ?? { error: "control_plane_unavailable" },
      { status: response.status },
    );
  }
  if (
    method === "GET" &&
    endpointPath === "/admin/overview" &&
    !isXConnectZeroAdminOverview(payload)
  ) {
    return errorResponse("invalid_response", 502);
  }
  return NextResponse.json(payload, {
    status: response.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ segments?: string[] }> },
) {
  return proxy(request, "GET", context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ segments?: string[] }> },
) {
  return proxy(request, "POST", context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ segments?: string[] }> },
) {
  return proxy(request, "PUT", context);
}

export function PATCH() {
  return errorResponse("control_plane_unavailable", 404);
}

export function DELETE() {
  return errorResponse("control_plane_unavailable", 404);
}
