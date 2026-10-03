export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";

import { createUpstreamProxyHandler } from "@lib/apiProxy";
import { getAccountSession } from "@server/account/session";
import { resolveForwardedHost } from "@server/account/requestHost";
import { getAccountServiceBaseUrl } from "@server/serviceConfig";

const AGENT_SERVER_PREFIX = "/api/agent-server";

function createHandler(request: NextRequest) {
  const upstreamBaseUrl = getAccountServiceBaseUrl(
    resolveForwardedHost(request),
  );
  return createUpstreamProxyHandler({
    upstreamBaseUrl,
    upstreamPathPrefix: AGENT_SERVER_PREFIX,
    getAdditionalHeaders: async (request) => {
      // Keep explicit Authorization from caller (e.g. agent token) untouched.
      if (request.headers.get("authorization")) {
        return undefined;
      }

      // For dashboard browser calls, forward the current account session token.
      const session = await getAccountSession(request);
      if (!session.token) {
        return undefined;
      }

      return {
        authorization: `Bearer ${session.token}`,
        "x-account-session": session.token,
      };
    },
  });
}

export function GET(request: NextRequest) {
  return createHandler(request)(request);
}

export function POST(request: NextRequest) {
  return createHandler(request)(request);
}

export function PUT(request: NextRequest) {
  return createHandler(request)(request);
}

export function PATCH(request: NextRequest) {
  return createHandler(request)(request);
}

export function DELETE(request: NextRequest) {
  return createHandler(request)(request);
}

export function HEAD(request: NextRequest) {
  return createHandler(request)(request);
}

export function OPTIONS(request: NextRequest) {
  return createHandler(request)(request);
}
