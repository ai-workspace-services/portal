"use client";

import dynamic from "next/dynamic";

/**
 * Vercel Web Analytics 的懒加载壳。
 *
 * 单独一个文件是为了让它落进独立的 chunk：开关关掉时 SiteAnalyticsBody 直接返回
 * null，这个 chunk 就永远不会被请求，等于零成本。要是在 layout 里直接 import，
 * 即使不渲染，代码也会被打进主 bundle 一起下发。
 */
const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((mod) => mod.Analytics),
  { ssr: false },
);

export default function VercelWebAnalytics() {
  return <Analytics />;
}
