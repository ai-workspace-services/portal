"use client";

import { useEffect, useState } from "react";

/**
 * Site brand selector.
 *
 * The portal is served from two domains that share the same routes and layout:
 *   - xworkmate.com  -> "xworkmate" (product brand: XWorkmate)
 *   - svc.plus       -> "platform"  (platform brand: SVC+)
 *
 * Content components use `useSiteBrand()` to pick the matching copy set while
 * keeping the UI layout, pages, and routes identical for both domains.
 */
export type SiteBrand = "xworkmate" | "platform";

export const DEFAULT_SITE_BRAND: SiteBrand = "platform";

export function resolveSiteBrand(hostname?: string): SiteBrand {
  const host = (hostname ?? "").toLowerCase();
  if (host.includes("xworkmate")) {
    return "xworkmate";
  }
  return DEFAULT_SITE_BRAND;
}

function getHostname(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.hostname;
}

export function useSiteBrand(): SiteBrand {
  // SSR-safe: default to platform, then reconcile with the real hostname on
  // the client. Both hydration passes agree on the initial value, so there is
  // no hydration mismatch; the content simply flips to the domain's brand
  // immediately after mount.
  const [brand, setBrand] = useState<SiteBrand>(() => resolveSiteBrand(getHostname()));

  useEffect(() => {
    setBrand(resolveSiteBrand(getHostname()));
  }, []);

  return brand;
}
