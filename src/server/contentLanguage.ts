import "server-only"

import { headers } from "next/headers"

export type ContentLanguage = "zh" | "en"

// `LanguageProvider` renders the first pass as `zh` on every runtime and only
// applies the visitor's stored/browser preference after hydration. Content that
// is fetched on the server is pinned to the same default so the document the
// edge caches is identical for every visitor, which is what makes a content
// route prerenderable at all.
const DEFAULT_LANGUAGE: ContentLanguage =
  (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "").trim().toLowerCase() === "en" ? "en" : "zh"

// `static`  — one cacheable document per URL (default; required for ISR/SSG)
// `request` — negotiate per request via `x-language` / `accept-language`. Keeps
//             the pre-existing behaviour, at the cost of a dynamic render on
//             every hit. Intended for the VPS/selfhost runtime, where a render
//             is free.
const REQUEST_NEGOTIATION = (process.env.CONTENT_LANGUAGE_MODE || "static").trim().toLowerCase() === "request"

export function getDefaultContentLanguage(): ContentLanguage {
  return DEFAULT_LANGUAGE
}

export function isRequestLanguageNegotiationEnabled(): boolean {
  return REQUEST_NEGOTIATION
}

function normalize(raw: string | null | undefined): ContentLanguage {
  return (raw || "").toLowerCase().includes("zh") ? "zh" : "en"
}

/**
 * Language for a route that is allowed to render dynamically — API handlers and
 * anything explicitly opted out of static rendering. Reading headers here is
 * what marks the caller dynamic, so never call it from a cacheable page.
 */
export async function getRequestContentLanguage(): Promise<ContentLanguage> {
  const store = await headers()
  const preferred = store.get("x-language") ?? store.get("accept-language")
  if (!preferred) return DEFAULT_LANGUAGE
  return normalize(preferred)
}

/**
 * Language for content rendered inside a cacheable page. Falls back to per
 * request negotiation only when `CONTENT_LANGUAGE_MODE=request`.
 */
export async function getContentLanguage(): Promise<ContentLanguage> {
  if (!REQUEST_NEGOTIATION) return DEFAULT_LANGUAGE
  return getRequestContentLanguage()
}
