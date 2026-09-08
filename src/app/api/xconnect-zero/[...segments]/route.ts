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
const MAX_REQUEST_BODY_BYTES = 16 * 1024;
const MAX_RESPONSE_BODY_BYTES = 256 * 1024;
// XConnect Zero is a self-service user feature. The accounts API applies the
// authoritative owner scope; this BFF only forwards the current session.
const READ_ROLES: AccountUserRole[] = ["admin", "operator", "user"];
const ALLOWED_ROUTES = new Map([
  ["GET overview", "/admin/overview"],
  ["GET networks", "/admin/networks"],
  ["GET devices", "/admin/devices"],
  ["GET invites", "/admin/invites"],
  ["GET registrations", "/admin/registrations"],
  ["POST invites", "/admin/invites"],
  ["POST networks/bootstrap", "/admin/networks/bootstrap"],
]);

type ErrorPayload = {
  error:
    | "unauthenticated"
    | "forbidden"
    | "control_plane_unavailable"
    | "upstream_unreachable"
    | "invalid_response"
    | "invalid_request"
    | "request_too_large";
};

function errorResponse(error: ErrorPayload["error"], status: number) {
  return NextResponse.json<ErrorPayload>(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
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
  if (
    method === "POST" &&
    segments.length === 3 &&
    segments[0] === "registrations" &&
    segments[1] &&
    (segments[2] === "approve" || segments[2] === "reject")
  ) {
    return `/admin/registrations/${encodeURIComponent(segments[1])}/${segments[2]}`;
  }
  return undefined;
}

function requiredPermission(method: string, endpointPath: string): string {
  if (endpointPath === "/admin/registrations") return "xconnect.zero.manage";
  return method === "GET" ? "xconnect.zero.read" : "xconnect.zero.manage";
}

class BodyLimitError extends Error {}

async function readRegistrationBody(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error("body timeout")),
      CONTROL_PLANE_TIMEOUT_MS,
    );
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      total += value.byteLength;
      if (total > limit) throw new BodyLimitError();
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(bytes);
  } catch (error) {
    void reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
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
      requiredPermission(method, endpointPath),
    ]))
  ) {
    return errorResponse("forbidden", 403);
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${session.token}`,
    Accept: "application/json",
  };
  const registrationRoute = endpointPath.startsWith("/admin/registrations");
  let body: string | undefined;
  try {
    const contentLength = Number(request.headers.get("content-length"));
    if (registrationRoute && contentLength > MAX_REQUEST_BODY_BYTES) {
      return errorResponse("request_too_large", 413);
    }
    if (method !== "GET" && method !== "HEAD") {
      body =
        (registrationRoute
          ? await readRegistrationBody(request.body, MAX_REQUEST_BODY_BYTES)
          : await request.text()) || undefined;
    }
  } catch (error) {
    return errorResponse(
      error instanceof BodyLimitError ? "request_too_large" : "invalid_request",
      error instanceof BodyLimitError ? 413 : 400,
    );
  }
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
  if (response.status === 404 && !(registrationRoute && method === "POST"))
    return errorResponse("control_plane_unavailable", 503);
  if (response.status === 204) {
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }
  let payload: unknown = null;
  try {
    payload = registrationRoute
      ? JSON.parse(
          await readRegistrationBody(response.body, MAX_RESPONSE_BODY_BYTES),
        )
      : await response.json();
  } catch {
    if (registrationRoute) return errorResponse("invalid_response", 502);
    payload = null;
  }
  // Only successful overview responses have the success schema. Preserve an
  // upstream authorization or validation status so the panel can report the
  // actionable control-plane failure rather than a generic 502.
  if (!response.ok) {
    return NextResponse.json(
      payload ?? { error: "control_plane_unavailable" },
      { status: response.status, headers: { "Cache-Control": "no-store" } },
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
