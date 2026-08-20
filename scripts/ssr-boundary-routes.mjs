/**
 * SSR boundary 路由表的唯一解析入口。
 *
 * 真相来自 GitOps 下发的 EdgeRoutingConfig（本地 fixture:
 * config/cloudflare-boundaries.json）里的 route_suffixes —— 也就是
 * frontend-router 真正用来分发请求的那张表。构建脚本用它决定每个 boundary
 * 打包哪些页面，守卫脚本用它判断跨界链接，客户端用它（构建期注入）决定
 * BoundaryLink 渲染 <Link> 还是 <a>。三处同源，不会漂移。
 */

/**
 * route_suffixes（`/panel*`、`/*`、`/_edge/console/*`）→ [{ prefix, boundary }]。
 * `/_edge/*` 是各 boundary 自己的静态资产命名空间，不参与页面归属。
 * 长前缀优先，和 Cloudflare route 一样按 startsWith 匹配（`/xworkmate*` 覆盖
 * `/xworkmate-suite`）。
 */
export function buildBoundaryRoutes(boundaryConfigs) {
  const routes = [];
  for (const [id, config] of Object.entries(boundaryConfigs ?? {})) {
    for (const suffix of config?.route_suffixes ?? []) {
      if (typeof suffix !== "string" || suffix.startsWith("/_edge/")) continue;
      const prefix = suffix.endsWith("*") ? suffix.slice(0, -1) : suffix;
      if (!prefix.startsWith("/")) continue;
      routes.push({ prefix: prefix === "" ? "/" : prefix, boundary: id });
    }
  }
  return routes.sort((a, b) => b.prefix.length - a.prefix.length);
}

/** app 目录下的文件路径 → 它对外的 URL 路径（去掉文件名和 (route group)）。 */
export function routeUrlPath(relativePath) {
  const segments = relativePath
    .split("/")
    .slice(0, -1)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));
  return `/${segments.join("/")}`;
}

export function resolveBoundaryForPath(pathname, routes) {
  for (const route of routes) {
    if (route.prefix === "/") continue;
    if (pathname.startsWith(route.prefix)) return route.boundary;
  }
  return routes.find((route) => route.prefix === "/")?.boundary;
}
