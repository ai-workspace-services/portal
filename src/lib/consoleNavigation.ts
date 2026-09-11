export const CONSOLE_ORIGIN = "https://console.svc.plus";

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

  const [pathAndQuery, hash = ""] = href.split("#", 2);
  const [pathname = "/", query = ""] = pathAndQuery.split("?", 2);
  if (!isConsolePath(pathname)) {
    return href;
  }

  return `${CONSOLE_ORIGIN}${pathname || "/"}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}
