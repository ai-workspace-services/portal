import type { NextRequest } from "next/server";

// OpenNext reconstructs an internal URL behind the Worker service binding.
// Use the GitOps-derived build-time Console host, not client-supplied forwarded
// headers. Monolith/local builds keep their actual request origin.
export function operationsRequestOrigin(request: NextRequest): string {
  const host = process.env.NEXT_PUBLIC_CONSOLE_HOST?.trim();
  if (!host) return new URL(request.url).origin;
  const url = new URL(`https://${host}`);
  if (url.host !== host || url.pathname !== "/" || url.search || url.hash)
    throw new Error("Invalid Console host configuration");
  return url.origin;
}
