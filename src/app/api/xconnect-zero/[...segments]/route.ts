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
const READ_PERMISSIONS = ["xconnect.zero.read"];
const ALLOWED_GET_ROUTES = new Map([["overview", "/admin/overview"]]);

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

function resolveRoute(segments: string[] | undefined): string | undefined {
  if (!segments || segments.length !== 1) {
    return undefined;
  }
  return ALLOWED_GET_ROUTES.get(segments[0]);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ segments?: string[] }> },
) {
  const endpointPath = resolveRoute((await context.params).segments);
  if (!endpointPath) {
    return errorResponse("control_plane_unavailable", 404);
  }

  const session = await getAccountSession(request);
  if (!session.user || !session.token) {
    return errorResponse("unauthenticated", 401);
  }

  if (
    !(await userHasRoleOrPermission(session.user, READ_ROLES, READ_PERMISSIONS))
  ) {
    return errorResponse("forbidden", 403);
  }

  let response: Response;
  try {
    response = await fetch(`${ACCOUNT_OVERLAY_API_BASE}${endpointPath}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      redirect: "manual",
    });
  } catch (error) {
    console.error("XConnect Zero control-plane request failed", error);
    return errorResponse("upstream_unreachable", 502);
  }

  if (response.status === 404) {
    return errorResponse("control_plane_unavailable", 503);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !isXConnectZeroAdminOverview(payload)) {
    return errorResponse("invalid_response", 502);
  }

  return NextResponse.json(payload, {
    status: response.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function POST() {
  return errorResponse("control_plane_unavailable", 404);
}

export function PUT() {
  return errorResponse("control_plane_unavailable", 404);
}

export function PATCH() {
  return errorResponse("control_plane_unavailable", 404);
}

export function DELETE() {
  return errorResponse("control_plane_unavailable", 404);
}
