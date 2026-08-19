"use client"

import { useEffect } from "react"

const consoleOrigin = (process.env.NEXT_PUBLIC_CONSOLE_ORIGIN || "").replace(/\/$/, "")

// The static export is published to the CDN hostname that also serves the SSR
// boundaries' assets, so it is reachable as a website even though it only holds
// the marketing pages. Every other route -- /login, /panel, /products/* -- lives
// on the console host, and landing on one here would otherwise dead-end on the
// static 404 page. Hand the visitor over instead, keeping the path they asked
// for.
export function ConsoleHandoff() {
  useEffect(() => {
    if (!consoleOrigin) return
    let target: URL
    try {
      target = new URL(consoleOrigin)
    } catch {
      return
    }
    if (window.location.host === target.host) return
    const { pathname, search, hash } = window.location
    window.location.replace(`${target.origin}${pathname}${search}${hash}`)
  }, [])

  return null
}
