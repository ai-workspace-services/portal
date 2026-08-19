import path from "node:path"
import { fileURLToPath } from "node:url"

const projectDir = path.dirname(fileURLToPath(import.meta.url))
const portalDir = path.resolve(projectDir, "..")
const staticCdnUrl = (process.env.NEXT_PUBLIC_STATIC_CDN_URL || "").replace(/\/$/, "")

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  assetPrefix: staticCdnUrl || undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: portalDir,
  },
}

export default nextConfig
