// BFF route handlers need the same Worker ownership as frontend-router.
// Unknown APIs remain excluded from SSR bundles rather than being public pages.
export function bffBoundaryForRoute(relativePath) {
  // Public workspace service APIs are same-origin BFF handlers. They must be
  // bundled with the workspace Worker; otherwise frontend-router can dispatch
  // the request there while the Worker has no matching route and returns 404.
  if (
    relativePath.startsWith("api/ai-workspace/") ||
    relativePath.startsWith("api/xworkmate/")
  )
    return "workspace";
  if (
    relativePath === "api/auth/login/route.ts" ||
    relativePath === "api/auth/register/route.ts" ||
    relativePath === "api/auth/register/send/route.ts" ||
    relativePath === "api/auth/register/verify/route.ts" ||
    relativePath === "api/auth/verify-email/route.ts" ||
    relativePath === "api/auth/verify-email/send/route.ts" ||
    relativePath === "api/auth/token/exchange/route.ts" ||
    relativePath === "api/auth/session/route.ts" ||
    relativePath.startsWith("api/auth/mfa/")
  )
    return "auth";
  if (
    [
      "api/agent-server/[...segments]/route.ts",
      "api/agent/[...segments]/route.ts",
      "api/account/[...segments]/route.ts",
      "api/xconnect-zero/[...segments]/route.ts",
    ].includes(relativePath)
  )
    return "console";
  if (
    relativePath === "api/global-mesh/nodes/route.ts" ||
    relativePath.startsWith("api/global-mesh/")
  )
    return "public";
  return undefined;
}
