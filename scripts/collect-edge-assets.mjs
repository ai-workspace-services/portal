import { access, cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Collects the namespaced `_edge/<boundary>/_next` static assets produced by
// scripts/build-open-next-boundary.mjs so they can be published to the static
// CDN (Cloudflare Pages) alongside the static-dashboard export. When
// NEXT_PUBLIC_STATIC_CDN_URL is set, the SSR Workers emit absolute
// `<cdn>/_edge/<boundary>/_next/...` URLs, so the CDN — not the Worker — has to
// serve these files.

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = path.join(projectRoot, ".edge-build");
const args = process.argv.slice(2);
const outArg = readOption(args, "--out");
if (!outArg) {
  throw new Error("Usage: node scripts/collect-edge-assets.mjs --out <dir> [--boundary <name>]");
}
const outRoot = path.resolve(projectRoot, outArg);
const requested = readOption(args, "--boundary");
const boundaries = requested ? [requested] : await discoverBoundaries();

if (boundaries.length === 0) {
  throw new Error(`No built SSR boundary found under ${generatedRoot}. Run yarn build:ssr:<boundary> first.`);
}

await mkdir(outRoot, { recursive: true });
const collected = [];
for (const boundary of boundaries) {
  const source = path.join(generatedRoot, boundary, ".open-next", "assets", "_edge", boundary);
  if (!await exists(source)) {
    throw new Error(`Missing namespaced assets for boundary ${boundary}: ${source}`);
  }
  const target = path.join(outRoot, "_edge", boundary);
  await rm(target, { recursive: true, force: true });
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true, dereference: true });
  collected.push(boundary);
}

console.log(`Collected edge assets for ${collected.join(", ")} into ${outRoot}`);

function readOption(argv, flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : "";
}

async function discoverBoundaries() {
  if (!await exists(generatedRoot)) return [];
  const entries = await readdir(generatedRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
