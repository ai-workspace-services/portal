import path from "path";
import { fileURLToPath } from "url";
import { withContentlayer } from "next-contentlayer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsSiteBaseUrl = (process.env.NEXT_PUBLIC_DOCS_BASE_URL || "https://docs.svc.plus").replace(/\/$/, "");
const staticCdnUrl = (process.env.NEXT_PUBLIC_STATIC_CDN_URL || "").replace(/\/$/, "");

const nextConfig = {
  // ===============================
  // 🚀 生产优化 —— 最关键的三行
  // ===============================
  output: "standalone",
  compress: true,         // Gzip 压缩输出（确保小体积网络传输）
  assetPrefix: staticCdnUrl || undefined,

  // 配置允许的外部图片域名
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dl.svc.plus',
      },
      {
        protocol: 'https',
        hostname: 'www.svc.plus',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  webpack: (config) => {
    // 添加 YAML 文件支持
    config.module.rules.push({
      test: /\.ya?ml$/i,
      type: 'asset/source',
    });

    // 显式 alias，保证 Turbopack 也能解析
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@components": path.join(__dirname, "src", "components"),
      "@i18n": path.join(__dirname, "src", "i18n"),
      "@lib": path.join(__dirname, "src", "lib"),
      "@types": path.join(__dirname, "types"),
      "@server": path.join(__dirname, "src", "server"),
      "@modules": path.join(__dirname, "src", "modules"),
      "@extensions": path.join(__dirname, "src", "modules", "extensions"),
      "@theme": path.join(__dirname, "src", "components", "theme"),
      "@src": path.join(__dirname, "src"),
      "@": path.join(__dirname, "src"),
    };

    // 添加模块搜索路径
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      __dirname,
      path.join(__dirname, "src"),
    ];

    return config;
  },
  async headers() {
    // immutable 的前提是「URL 变了内容才会变」。只有 /_next/static 满足：
    // 生产构建给它内容哈希文件名。其余路径都是稳定 URL、内容可变，标成
    // immutable 就意味着改动在缓存过期前到不了回访用户。
    //
    // dev 例外：Turbopack 会复用 chunk 文件名（同一个 _abc1234._.js 内容已变），
    // 配上 immutable 后浏览器永不重取——改动看不到，严重时旧 chunk 还 import
    // 已删除的模块导致白屏。所以开发环境一律不缓存。
    const isDev = process.env.NODE_ENV === "development";
    const hashedAsset = isDev
      ? "no-store, must-revalidate"
      : "public, max-age=604800, s-maxage=604800, immutable";
    // 稳定 URL 的静态资源：边缘仍长缓存，浏览器每小时回源校验一次
    const stableAsset = isDev
      ? "no-store, must-revalidate"
      : "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400";
    // 爬虫读取且随内容变化的文件，不能让浏览器/边缘长期钉住
    const crawlerFile = isDev
      ? "no-store, must-revalidate"
      : "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";
    return [
      {
        // 首页与全站公共营销页开启 Cloudflare 边缘 1 小时缓存 (s-maxage=3600)
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/products/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/download/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // 静态资产开启 168 小时 (7 天 = 604800 秒) 强缓存
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: hashedAsset },
        ],
      },
      {
        source: "/static/:path*",
        headers: [{ key: "Cache-Control", value: stableAsset },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: stableAsset },
        ],
      },
      {
        source: "/marketing/:path*",
        headers: [{ key: "Cache-Control", value: stableAsset },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: stableAsset },
        ],
      },
      {
        source: "/robots.txt",
        headers: [{ key: "Cache-Control", value: crawlerFile },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [{ key: "Cache-Control", value: crawlerFile },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ALLOWED_ORIGINS || "https://console.svc.plus,http://localhost:3000" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With, X-Account-Session" },
        ],
      },
    ];
  },

  reactStrictMode: true,
  typedRoutes: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default withContentlayer(nextConfig);
