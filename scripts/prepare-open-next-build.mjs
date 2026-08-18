import { mkdir, readdir, writeFile } from "node:fs/promises"
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

console.log(`Prepared Worker-safe instrumentation for ${serverEntrypoints.length} OpenNext bundle(s) and ${instrumentationTraces.length} trace(s).`)

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
