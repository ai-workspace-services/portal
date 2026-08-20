import { access } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { resolveIncrementalCacheTarget } from "./incremental-cache-target.mjs";

// Deploys one SSR boundary built by scripts/build-open-next-boundary.mjs.
//
// `wrangler deploy` on its own uploads the Worker but leaves the incremental
// cache empty, so every prerendered page would be regenerated on its first
// request instead of being served from the build output. Seeding the cache
// first is what makes the build-time prerender worth anything.

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const boundary = readOption(args, "--boundary");
if (!boundary) {
  throw new Error("Usage: node scripts/deploy-open-next-boundary.mjs --boundary <name>");
}

const boundaryRoot = path.join(projectRoot, ".edge-build", boundary);
const wranglerConfig = path.join(boundaryRoot, "wrangler.jsonc");
try {
  await access(wranglerConfig);
} catch {
  throw new Error(`SSR boundary ${boundary} is not built: ${wranglerConfig} is missing. Run yarn build:ssr:${boundary} first.`);
}

const openNextCli = path.join(projectRoot, "node_modules", "@opennextjs", "cloudflare", "dist", "cli", "index.js");
const { store } = resolveIncrementalCacheTarget();

if (store === "r2" || store === "kv") {
  await run(process.execPath, [openNextCli, "populateCache", "remote", "--config", "wrangler.jsonc"], boundaryRoot);
} else {
  console.log(`No remote incremental cache configured (store=${store}); skipping cache population.`);
}

await run("yarn", ["exec", "wrangler", "deploy", "--config", wranglerConfig], projectRoot);

console.log(`Deployed SSR boundary ${boundary}`);

function readOption(argv, flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : "";
}

function run(command, commandArgs, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd, stdio: "inherit", env: process.env });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${commandArgs.join(" ")} exited with code ${code}`));
    });
  });
}
