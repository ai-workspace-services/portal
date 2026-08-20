/**
 * SSR boundary 解析 —— 判断一个站内 href 是否要跨 worker 边界。
 *
 * portal 一套源码会被 scripts/build-open-next-boundary.mjs 按 boundary 构建多次
 * （public / content / auth / console / workspace），每个 boundary 是一个独立的
 * OpenNext worker，buildId、assetPrefix、甚至 app 目录里包含哪些页面都不同。
 *
 * 后果：跨 boundary 的目标页面**根本不在当前 build 里**。此时 next/link 会拦截点击
 * 做软导航，去拉另一个 build 的 RSC payload；如果目标是静态预渲染页
 * （例如 /panel/* 的 `dynamic = 'error'`），React transition 永远不会 commit ——
 * URL 不变、页面不动、console 零报错。历史上「登录」「进入控制台」按钮失效都是这个。
 *
 * 所以跨界必须退回原生 <a> 整页跳转，见 components/common/BoundaryLink.tsx。
 *
 * 前缀表不写死在源码里：构建脚本把 GitOps 下发的 EdgeRoutingConfig
 * （config/cloudflare-boundaries.json 的同构体）里的 route_suffixes 注入成
 * NEXT_PUBLIC_SSR_BOUNDARY_ROUTES，和 frontend-router 的分发规则同源。
 * 单体（all-in-one / 本地 dev）构建两个变量都为空 —— 全站同一个 build，
 * 不存在跨界，一律走 next/link。
 */

export type BoundaryRoute = { prefix: string; boundary: string };

/** 当前 build 属于哪个 boundary；单体构建为空。 */
export const CURRENT_BOUNDARY = (
  process.env.NEXT_PUBLIC_SSR_BOUNDARY || ""
).trim();

function parseRoutes(raw: string | undefined): BoundaryRoute[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry): entry is BoundaryRoute =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as BoundaryRoute).prefix === "string" &&
          typeof (entry as BoundaryRoute).boundary === "string",
      )
      .map((entry) => ({ prefix: entry.prefix, boundary: entry.boundary }))
      .sort((a, b) => b.prefix.length - a.prefix.length);
  } catch {
    return [];
  }
}

/** 路径前缀 → boundary，长前缀优先。 */
export const BOUNDARY_ROUTES = parseRoutes(
  process.env.NEXT_PUBLIC_SSR_BOUNDARY_ROUTES,
);

/** 未被任何前缀命中的路径归属的 boundary（public 兜底 `/*`）。 */
const DEFAULT_BOUNDARY =
  BOUNDARY_ROUTES.find((route) => route.prefix === "/")?.boundary ?? "public";

export function isExternalHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
}

/** 站内路径归属哪个 boundary；表为空（单体构建）时返回 undefined。 */
export function resolveBoundary(href: string): string | undefined {
  if (BOUNDARY_ROUTES.length === 0 || isExternalHref(href)) {
    return undefined;
  }

  const pathname = href.split(/[?#]/, 1)[0] || "/";
  if (!pathname.startsWith("/")) {
    return undefined;
  }

  for (const route of BOUNDARY_ROUTES) {
    if (route.prefix === "/") {
      continue;
    }
    // 前缀语义和 Cloudflare route（`/xworkmate*`）、frontend-router 保持一致：
    // 纯 startsWith，所以 /xworkmate* 同时覆盖 /xworkmate-suite。
    if (pathname.startsWith(route.prefix)) {
      return route.boundary;
    }
  }

  return DEFAULT_BOUNDARY;
}

/**
 * 这个 href 从当前 build 出发是否跨 boundary。
 * 单体构建、外链、或无法判定时一律 false（继续走 next/link）。
 */
export function isCrossBoundaryHref(href: string): boolean {
  if (!CURRENT_BOUNDARY) {
    return false;
  }

  const target = resolveBoundary(href);
  return target !== undefined && target !== CURRENT_BOUNDARY;
}
