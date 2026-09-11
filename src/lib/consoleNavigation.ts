// CONSOLE_ORIGIN used to be the literal string "https://console.svc.plus" --
// PROD's console domain, hardcoded with no environment check. Every build
// (UAT, SIT, local dev) linked its /login, /register, /panel, etc. hrefs at
// that one address, so a UAT visitor clicking "Sign in" left UAT and landed
// on PROD. This module previously had no way to know any better: it is
// imported from client components (see BoundaryLink's callers), and the
// project's environment-aware config (src/server/runtime-loader.ts) is
// `server-only` and throws if evaluated in the browser.
//
// The fix threads the same per-environment fact BoundaryLink already reads
// for boundary identity (NEXT_PUBLIC_SSR_BOUNDARY, injected at build time in
// scripts/build-open-next-boundary.mjs) through one more build-time env var,
// NEXT_PUBLIC_CONSOLE_HOST -- sourced from the same GitOps EdgeRoutingConfig
// console_host that config/cloudflare-boundaries.json declares per
// environment (uat -> console-cloudflare-uat.onwalk.net, prod ->
// console.svc.plus). NEXT_PUBLIC_* values are inlined at build time, so this
// is safe to read from both server and client code.
//
// A monolith or local-dev build never sets NEXT_PUBLIC_CONSOLE_HOST (see the
// build script's own comment on why) -- there, every path is same-origin
// already, so toConsoleHref leaves such hrefs untouched rather than
// guessing at a production fallback.
function resolveConsoleOrigin(): string | undefined {
  const host = process.env.NEXT_PUBLIC_CONSOLE_HOST?.trim();
  return host ? `https://${host}` : undefined;
}

export const CONSOLE_ORIGIN = resolveConsoleOrigin();

const CONSOLE_PATH_PREFIXES = [
  "/login",
  "/register",
  "/email-verification",
  "/logout",
  "/panel",
  "/dashboard",
] as const;

export function isConsolePath(pathname: string): boolean {
  return CONSOLE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function toConsoleHref(href: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) {
    return href;
  }

  if (!CONSOLE_ORIGIN) {
    return href;
  }

  const [pathAndQuery, hash = ""] = href.split("#", 2);
  const [pathname = "/", query = ""] = pathAndQuery.split("?", 2);
  if (!isConsolePath(pathname)) {
    return href;
  }

  return `${CONSOLE_ORIGIN}${pathname || "/"}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}
