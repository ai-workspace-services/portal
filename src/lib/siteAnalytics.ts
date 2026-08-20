/**
 * 站点分析工具的开关与凭据，全部由环境变量下发（GitOps → CI 构建环境 → 这里），
 * 源码里不再写死任何 measurement id / token / 厂商假设。
 *
 * 为什么用 NEXT_PUBLIC_：公共 boundary 的首页等页面是静态预渲染的，layout 在
 * **构建期**执行，Worker 运行时的 vars 影响不到已经渲染好的 HTML。所以这些值必须
 * 在构建期就 inline 进去。（也因此下面必须写成完整的 process.env.XXX 字面量，
 * 不能用 process.env[key] 动态取，否则 Next 不会替换。）
 *
 * 取值语义：
 *   未设置        → 用 FALLBACK 里的历史默认值（GitOps 全量下发后可以删掉 FALLBACK）
 *   空串/off/false/0 → 关闭该项
 *   其它          → 作为 id/token 使用
 * 另有总开关 NEXT_PUBLIC_ANALYTICS_DISABLED=1，一把全关（预发、私有化部署用）。
 */

const DISABLED_VALUES = new Set(["", "off", "false", "0", "no"]);

/**
 * 迁移期的历史默认值：GitOps 还没下发时保持线上行为不变。
 * cloudflare 没有默认值 —— 它原来写的是 CF_TOKEN_PLACEHOLDER，全仓库没有任何地方
 * 替换过这个占位符，等于一直在往 Cloudflare 打无效 token，属于该关掉的东西。
 */
const FALLBACK = {
  googleId: "G-T4VM8G4Q42",
  datafastId: "dfid_RRpFATHOgNffArMsKNpYT",
} as const;

function resolve(
  raw: string | undefined,
  fallback?: string,
): string | undefined {
  if (raw === undefined) {
    return fallback;
  }

  const trimmed = raw.trim();
  return DISABLED_VALUES.has(trimmed.toLowerCase()) ? undefined : trimmed;
}

function resolveFlag(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }

  const trimmed = raw.trim().toLowerCase();
  return DISABLED_VALUES.has(trimmed)
    ? false
    : ["1", "on", "true", "yes"].includes(trimmed);
}

export type SiteAnalyticsConfig = {
  /** Google Analytics measurement id */
  googleId?: string;
  /** Cloudflare Web Analytics beacon token */
  cloudflareToken?: string;
  /** DataFast website id */
  datafastId?: string;
  /**
   * Vercel Web Analytics。默认关：本站跑在 Cloudflare 上，
   * /_vercel/insights/script.js 不存在，开着只会每页 404 一次并被 MIME 拦下。
   * 真部署到 Vercel 时把 NEXT_PUBLIC_ANALYTICS_VERCEL 设成 1 即可。
   */
  vercel: boolean;
};

export function resolveSiteAnalytics(): SiteAnalyticsConfig {
  if (resolveFlag(process.env.NEXT_PUBLIC_ANALYTICS_DISABLED, false)) {
    return { vercel: false };
  }

  return {
    googleId: resolve(
      process.env.NEXT_PUBLIC_ANALYTICS_GOOGLE_ID,
      FALLBACK.googleId,
    ),
    cloudflareToken: resolve(
      process.env.NEXT_PUBLIC_ANALYTICS_CLOUDFLARE_TOKEN,
    ),
    datafastId: resolve(
      process.env.NEXT_PUBLIC_ANALYTICS_DATAFAST_ID,
      FALLBACK.datafastId,
    ),
    vercel: resolveFlag(process.env.NEXT_PUBLIC_ANALYTICS_VERCEL, false),
  };
}
