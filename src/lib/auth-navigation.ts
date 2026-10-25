import { normalizeReferralCode } from "./referral-code";

/** Accept only paths that remain on the current origin after URL parsing. */
export function safeAuthDestination(
  value: string | null | undefined,
): string | null {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x20\x7f]/.test(value)
  )
    return null;
  try {
    const url = new URL(value, "https://auth.invalid");
    return url.origin === "https://auth.invalid"
      ? `${url.pathname}${url.search}${url.hash}`
      : null;
  } catch {
    return null;
  }
}

export function buildAuthHref(
  path: "/register" | "/login",
  destination?: string | null,
  referralCode?: string | null,
  needMfa = false,
): string {
  const query = new URLSearchParams();
  const target = safeAuthDestination(destination);
  if (target) query.set(path === "/register" ? "returnTo" : "redirect", target);
  const code = normalizeReferralCode(referralCode);
  if (code) query.set("ref", code);
  if (needMfa) query.set("needMfa", "1");
  return `${path}${query.size ? `?${query}` : ""}`;
}
