// Which store keeps prerendered pages and cached `fetch` results for the
// Cloudflare Workers runtime. Read by both `open-next.config.ts` (to pick the
// override) and `scripts/build-open-next-boundary.mjs` (to emit the matching
// binding), so the two can never disagree.
//
//   r2     `NEXT_INC_CACHE_R2_BUCKET`, from PORTAL_INCREMENTAL_CACHE_BUCKET
//   kv     `NEXT_INC_CACHE_KV`, from PORTAL_INCREMENTAL_CACHE_KV_ID
//   assets read-only, served from the Worker's own static assets: build-time
//          prerender only, no revalidation
//   none   no cache; every request re-renders and re-fetches
//
// The default follows whichever binding the deployment supplied, so a pipeline
// that has not been taught about the cache yet keeps its previous behaviour
// instead of failing to build.
export function resolveIncrementalCacheTarget(env = process.env) {
  const bucket = (env.PORTAL_INCREMENTAL_CACHE_BUCKET || "").trim()
  const kvId = (env.PORTAL_INCREMENTAL_CACHE_KV_ID || "").trim()
  const requested = (env.PORTAL_INCREMENTAL_CACHE || "").trim().toLowerCase()
  const store = requested || (bucket ? "r2" : kvId ? "kv" : "none")

  switch (store) {
    case "none":
    case "assets":
      return { store }
    case "kv":
      if (!kvId) throw new Error("PORTAL_INCREMENTAL_CACHE=kv requires PORTAL_INCREMENTAL_CACHE_KV_ID")
      return { store, kvId }
    case "r2":
      if (!bucket) throw new Error("PORTAL_INCREMENTAL_CACHE=r2 requires PORTAL_INCREMENTAL_CACHE_BUCKET")
      return { store, bucket }
    default:
      throw new Error(`Unknown PORTAL_INCREMENTAL_CACHE: ${store}. Expected r2, kv, assets, or none.`)
  }
}
