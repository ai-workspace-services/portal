import path from "node:path"
import { fileURLToPath } from "node:url"

const projectDir = path.dirname(fileURLToPath(import.meta.url))
const portalDir = path.resolve(projectDir, "..")

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: portalDir,
  },
}

export default nextConfig
