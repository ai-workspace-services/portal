import "server-only";
import type { NextRequest } from "next/server";

// Service bindings preserve the public Console host in forwarded headers.
// Fall back to the request URL when a Fetch Request has no Host header.
export function resolveForwardedHost(
  request?: NextRequest,
): string | undefined {
  if (!request) return undefined;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return host?.trim() || request.nextUrl.hostname;
}
