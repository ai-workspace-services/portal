export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";

import { createUpstreamProxyHandler } from "@lib/apiProxy";
import { getAccountServiceBaseUrl } from "@server/serviceConfig";

const AGENT_PREFIX = "/api/agent";

function createHandler(request: NextRequest) {
  const upstreamBaseUrl = getAccountServiceBaseUrl(request.nextUrl.hostname);
  return createUpstreamProxyHandler({
    upstreamBaseUrl,
    upstreamPathPrefix: AGENT_PREFIX,
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
