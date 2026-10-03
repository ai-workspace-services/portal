import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "./src/lib/authGateway";
import { CONSOLE_ORIGIN, isConsolePath } from "./src/lib/consoleNavigation";

const MARKETING_HOSTS = new Set(["xworktech.com", "www.xworktech.com"]);

function isProtectedPath(pathname: string): boolean {
  return pathname === "/panel" || pathname.startsWith("/panel/");
}

function buildRedirectTarget(request: NextRequest): string {
  const query = request.nextUrl.search;
  return `${request.nextUrl.pathname}${query}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (MARKETING_HOSTS.has(request.nextUrl.hostname) && isConsolePath(pathname)) {
    const target = new URL(`${CONSOLE_ORIGIN}${pathname}`);
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target);
  }

  if (!isProtectedPath(pathname)) {
    return undefined;
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim();
  if (token) {
    return undefined;
  }

  const loginUrl = new URL("/login", request.url);
  const redirect = buildRedirectTarget(request);
  if (redirect && redirect !== "/login") {
    loginUrl.searchParams.set("redirect", redirect);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:css|gif|ico|jpg|jpeg|js|map|png|svg|txt|webp|woff|woff2|xml)$).*)",
  ],
};
