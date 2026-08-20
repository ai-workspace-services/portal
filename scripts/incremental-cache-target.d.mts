export type IncrementalCacheTarget =
  | { store: "none" | "assets" }
  | { store: "kv"; kvId: string }
  | { store: "r2"; bucket: string }

export function resolveIncrementalCacheTarget(
  env?: Record<string, string | undefined>,
): IncrementalCacheTarget
