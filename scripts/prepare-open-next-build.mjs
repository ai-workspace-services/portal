import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const projectRoot = process.cwd()
const standaloneRoot = path.join(projectRoot, ".next", "standalone")
const instrumentationTarget = path.join(
  standaloneRoot,
  ".next",
  "server",
  "instrumentation.js",
)

// The VPS artifact keeps the real Node/OpenTelemetry instrumentation bundle.
// Workers cannot load that Node-only dependency graph, so the Worker-specific
// standalone copy receives the smallest valid Next.js instrumentation module.
await mkdir(path.dirname(instrumentationTarget), { recursive: true })
await writeFile(
  instrumentationTarget,
  '"use strict"\nmodule.exports = { register: async function register() {} }\n',
  "utf8",
)
console.log("Prepared Worker-safe instrumentation for OpenNext.")
