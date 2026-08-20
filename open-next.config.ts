import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache"
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache"
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache"

import { resolveIncrementalCacheTarget } from "./scripts/incremental-cache-target.mjs"

// Optional frontend-server Worker target. Node/VPS remains the default runtime.
//
// The incremental cache is what turns prerendered/ISR pages and cached `fetch`
// results into Worker-local reads instead of a content-service round trip on
// every request. `withRegionalCache` puts the colo-local Cache API in front of
// the store, so a hot page costs zero R2/KV operations.
function incrementalCache() {
  const { store } = resolveIncrementalCacheTarget()
  switch (store) {
    case "none":
      return undefined
    case "assets":
      return staticAssetsIncrementalCache
    case "kv":
      return withRegionalCache(kvIncrementalCache, { mode: "long-lived" })
    default:
      return withRegionalCache(r2IncrementalCache, { mode: "long-lived" })
  }
}

export default defineCloudflareConfig({
  incrementalCache: incrementalCache(),
  // Revalidations run in the Worker that discovered the stale entry. Avoids a
  // Durable Object binding, which the free plan should not have to pay for.
  queue: "direct",
  // Serve ISR/SSG hits straight from the cache, before Next's router runs.
  enableCacheInterception: true,
})
