import { mkdir, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"

const projectRoot = process.cwd()
const standaloneRoot = path.join(projectRoot, ".next", "standalone")
const serverEntrypoints = await findFilesNamed(standaloneRoot, "server.js")
const instrumentationTraces = await findFilesNamed(standaloneRoot, "instrumentation.js.nft.json")

if (serverEntrypoints.length === 0) {
  throw new Error(`Could not find a standalone server entrypoint under ${standaloneRoot}`)
}

// The VPS artifact keeps the real Node/OpenTelemetry instrumentation bundle.
// Workers cannot load that Node-only dependency graph, so the Worker-specific
// standalone copy receives the smallest valid Next.js instrumentation module.
for (const serverEntrypoint of serverEntrypoints) {
  await writeWorkerSafeInstrumentation(path.join(
    path.dirname(serverEntrypoint),
    "server",
    "instrumentation.js",
  ))
  await writeWorkerSafeInstrumentation(path.join(
    path.dirname(serverEntrypoint),
    ".next",
    "server",
    "instrumentation.js",
  ))
}

// OpenNext resolves its standalone package directory from the monorepo package
// path. Create the corresponding module next to every copied trace file too.
for (const traceFile of instrumentationTraces) {
  await writeWorkerSafeInstrumentation(traceFile.replace(/\.nft\.json$/, ""))
}

// Strip heavy Node-only or oversized packages from .next/standalone before
// OpenNext bundles them into the CF Worker artifact.
const HEAVY_WORKER_EXCLUDES = [
  "@datadog",
  "dd-trace",
  path.join("@opentelemetry", "sdk-node"),
  path.join("@opentelemetry", "sdk-trace-base"),
  path.join("@opentelemetry", "sdk-trace-node"),
  path.join("@opentelemetry", "exporter-trace-otlp-grpc"),
  path.join("@opentelemetry", "exporter-trace-otlp-proto"),
  path.join("@opentelemetry", "otlp-exporter-base"),
  path.join("@opentelemetry", "otlp-transformer"),
  path.join("@opentelemetry", "instrumentation-http"),
  path.join("@opentelemetry", "instrumentation-undici"),
  path.join("@opentelemetry", "resources"),
  "pdfjs-dist",
  "react-pdf",
  path.join("next", "dist", "compiled", "@vercel", "og"),
]
let strippedCount = 0
for (const nodeModulesDir of await findDirsNamed(standaloneRoot, "node_modules")) {
  for (const rel of HEAVY_WORKER_EXCLUDES) {
    const candidate = path.join(nodeModulesDir, rel)
    try {
      await rm(candidate, { recursive: true, force: true })
      strippedCount += 1
    } catch {
      // ignore missing
    }
  }
}

console.log(`Prepared Worker-safe instrumentation for ${serverEntrypoints.length} OpenNext bundle(s), ${instrumentationTraces.length} trace(s), pruned ${strippedCount} heavy package slot(s).`)

async function findDirsNamed(directory, dirName) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const absolutePath = path.join(directory, entry.name)
    if (entry.name === dirName) {
      found.push(absolutePath)
      continue
    }
    found.push(...await findDirsNamed(absolutePath, dirName))
  }
  return found
}

async function findFilesNamed(directory, fileName) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      found.push(...await findFilesNamed(absolutePath, fileName))
      continue
    }
    if (entry.isFile() && entry.name === fileName) found.push(absolutePath)
  }
  return found
}

async function writeWorkerSafeInstrumentation(target) {
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(
    target,
    '"use strict"\nmodule.exports = { register: async function register() {} }\n',
    "utf8",
  )
}
