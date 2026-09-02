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
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, s-maxage=604800, immutable",
          },
        ],
      },
      {
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, s-maxage=604800, immutable",
          },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, s-maxage=604800, immutable",
          },
        ],
      },
      {
        source: "/marketing/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, s-maxage=604800, immutable",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, s-maxage=604800, immutable",
          },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, s-maxage=604800, immutable",
          },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, s-maxage=604800, immutable",
          },
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
