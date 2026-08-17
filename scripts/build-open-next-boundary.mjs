import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(projectRoot, "src", "app");
const generatedRoot = path.join(projectRoot, ".edge-build");
const boundary = readBoundary(process.argv.slice(2));
const cloudflareConfigPath = process.env.CLOUDFLARE_BOUNDARY_CONFIG
  ? path.resolve(projectRoot, process.env.CLOUDFLARE_BOUNDARY_CONFIG)
  : path.join(projectRoot, "config", "cloudflare-boundaries.json");
const cloudflareConfig = normaliseCloudflareConfig(JSON.parse(await readFile(cloudflareConfigPath, "utf8")));
const cloudflareEnvironment = process.env.CLOUDFLARE_ENV || "uat";
const environmentConfig = cloudflareConfig.environments?.[cloudflareEnvironment];
const boundaryConfig = cloudflareConfig.boundaries?.[boundary];
if (!environmentConfig || !boundaryConfig) {
  throw new Error(`Cloudflare boundary config is missing environment=${cloudflareEnvironment} boundary=${boundary}`);
}

const boundaries = {
  public: {
    workerName: boundaryConfig.worker_name,
    routeSuffixes: boundaryConfig.route_suffixes,
    owns: (relativePath) => !isApi(relativePath) && !startsWithAny(relativePath, [
      "(auth)/",
      "blogs/",
      "docs/",
      "download/",
      "logout/",
      "panel/",
      "dashboard/",
      "ai-workspace/",
      "cloud_iac/",
      "editor/",
      "support/",
      "xworkmate/",
      "xworkmate-suite/",
    ]),
  },
  content: {
    workerName: boundaryConfig.worker_name,
    routeSuffixes: boundaryConfig.route_suffixes,
    owns: (relativePath) => startsWithAny(relativePath, ["blogs/", "docs/", "download/"]),
  },
  auth: {
    workerName: boundaryConfig.worker_name,
    routeSuffixes: boundaryConfig.route_suffixes,
    owns: (relativePath) => startsWithAny(relativePath, ["(auth)/", "logout/"]),
  },
  console: {
    workerName: boundaryConfig.worker_name,
    routeSuffixes: boundaryConfig.route_suffixes,
    owns: (relativePath) => startsWithAny(relativePath, ["panel/", "dashboard/"]),
  },
  workspace: {
    workerName: boundaryConfig.worker_name,
    routeSuffixes: boundaryConfig.route_suffixes,
    owns: (relativePath) => startsWithAny(relativePath, [
      "ai-workspace/",
      "cloud_iac/",
      "editor/",
      "support/",
      "xworkmate/",
      "xworkmate-suite/",
    ]),
  },
};

const definition = boundaries[boundary];
if (!definition) {
  throw new Error(`Unknown SSR boundary: ${boundary}. Expected one of ${Object.keys(boundaries).join(", ")}.`);
}
const routes = definition.routeSuffixes.map((suffix) => `${environmentConfig.console_host}${suffix}`);

const boundaryRoot = path.join(generatedRoot, boundary);
await rm(boundaryRoot, { recursive: true, force: true });
await mkdir(path.join(boundaryRoot, "src", "app"), { recursive: true });

await writeFile(
  path.join(boundaryRoot, "package.json"),
  `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`,
);
await writeFile(path.join(boundaryRoot, "tsconfig.json"), `${JSON.stringify({
  extends: "../../tsconfig.json",
  compilerOptions: { baseUrl: "../.." },
  include: ["../../src", "../../types", "./**/*.ts", "./**/*.tsx"],
}, null, 2)}\n`);
await writeFile(
  path.join(boundaryRoot, "next.config.mjs"),
  [
    'import baseConfig from "../../next.config.mjs";',
    "",
    "export default {",
    "  ...baseConfig,",
    `  assetPrefix: "/_edge/${boundary}",`,
    `  generateBuildId: async () => "${boundary}-${releaseId()}",`,
    "};",
    "",
  ].join("\n"),
);
await writeFile(
  path.join(boundaryRoot, "open-next.config.ts"),
  [
    'import { defineCloudflareConfig } from "@opennextjs/cloudflare";',
    "",
    "export default defineCloudflareConfig({});",
    "",
  ].join("\n"),
);
if (boundary === "console") {
  await writeFile(path.join(boundaryRoot, "middleware.ts"), [
    'import type { NextRequest } from "next/server";',
    'import { NextResponse } from "next/server";',
    'import { SESSION_COOKIE_NAME } from "../../src/lib/authGateway";',
    "",
    "export function middleware(request: NextRequest) {",
    '  const { pathname } = request.nextUrl;',
    '  if (pathname !== "/panel" && !pathname.startsWith("/panel/")) return undefined;',
    '  if (request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim()) return undefined;',
    '  const loginUrl = new URL("/login", request.url);',
    '  const redirect = `${pathname}${request.nextUrl.search}`;',
    '  if (redirect !== "/login") loginUrl.searchParams.set("redirect", redirect);',
    '  return NextResponse.redirect(loginUrl);',
    "}",
    "",
    "export const config = {",
    '  matcher: ["/panel/:path*"],',
    "};",
    "",
  ].join("\n"));
}
await writeFile(path.join(boundaryRoot, "instrumentation.ts"), [
  'export * from "../../instrumentation";',
  "",
].join("\n"));
await writeFile(
  path.join(boundaryRoot, "wrangler.jsonc"),
  `${JSON.stringify({
    "$schema": "../../node_modules/wrangler/config-schema.json",
    name: definition.workerName,
    main: ".open-next/worker.js",
    compatibility_date: "2026-08-17",
    compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
    assets: { directory: ".open-next/assets", binding: "ASSETS" },
    services: [{ binding: "WORKER_SELF_REFERENCE", service: definition.workerName }],
    env: {
      [cloudflareEnvironment]: {
        name: `${definition.workerName}-${cloudflareEnvironment}`,
        routes: routes.map((pattern) => ({ pattern, zone_name: environmentConfig.zone_name })),
        services: [{ binding: "WORKER_SELF_REFERENCE", service: `${definition.workerName}-${cloudflareEnvironment}` }],
        images: { binding: "IMAGES" },
      },
    },
  }, null, 2)}\n`,
);

const entries = await findRouteEntries(appRoot);
const selectedPages = entries.filter((entry) => entry.kind === "page" && definition.owns(entry.relativePath));
if (selectedPages.length === 0) {
  throw new Error(`SSR boundary ${boundary} selected no pages`);
}

const selected = new Set(["layout.tsx", "not-found.tsx"]);
for (const page of selectedPages) {
  selected.add(page.relativePath);
  for (const ancestor of parentPaths(page.relativePath)) {
    for (const layoutName of ["layout.tsx", "loading.tsx", "error.tsx", "template.tsx"]) {
      const candidate = ancestor ? `${ancestor}/${layoutName}` : layoutName;
      if (entries.some((entry) => entry.relativePath === candidate)) selected.add(candidate);
    }
  }
}
if (boundary === "public") {
  for (const entry of entries) {
    if (entry.relativePath === "sitemap.ts" || entry.relativePath === "robots.ts") selected.add(entry.relativePath);
  }
}

for (const relativePath of selected) {
  const source = path.join(appRoot, relativePath);
  try {
    const sourceStats = await lstat(source);
    if (!sourceStats.isFile()) continue;
  } catch {
    continue;
  }
  const target = path.join(boundaryRoot, "src", "app", relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  const importPath = relativeImport(target, source);
  await writeFile(target, `export { default } from ${JSON.stringify(importPath)};\nexport * from ${JSON.stringify(importPath)};\n`);
}

await copyPublicAssets(path.join(projectRoot, "public"), path.join(boundaryRoot, "public"));
await run("yarn", ["exec", "next", "build", boundaryRoot], projectRoot);
await run("node", [path.join(projectRoot, "scripts", "prepare-open-next-build.mjs")], boundaryRoot);
await run(
  process.execPath,
  [
    path.join(projectRoot, "node_modules", "@opennextjs", "cloudflare", "dist", "cli", "index.js"),
    "build",
    "--skipNextBuild",
    "--config",
    "wrangler.jsonc",
  ],
  boundaryRoot,
);
await namespaceStaticAssets(boundaryRoot, boundary);

console.log(`Built SSR boundary ${boundary}: ${selectedPages.length} page entries`);

function readBoundary(args) {
  const index = args.indexOf("--boundary");
  return index >= 0 ? args[index + 1] : "";
}

function normaliseCloudflareConfig(config) {
  if (config.kind !== "EdgeRoutingConfig") return config;
  const spec = config.spec ?? {};
  const cloudflare = spec.cloudflare ?? {};
  const hosts = spec.hosts ?? {};
  const environment = config.metadata?.environment ?? process.env.CLOUDFLARE_ENV ?? "uat";
  const boundaries = Object.fromEntries((spec.ssr ?? []).map((item) => [item.id, {
    worker_name: item.worker_name,
    route_suffixes: item.route_suffixes,
  }]));
  return {
    environments: {
      [environment]: {
        console_host: hosts.console_cloudflare,
        zone_name: cloudflare.zone_name,
      },
    },
    boundaries,
  };
}

function releaseId() {
  return (process.env.GITHUB_SHA || process.env.SOURCE_VERSION || "local").slice(0, 16);
}

function isApi(relativePath) {
  return relativePath === "api" || relativePath.startsWith("api/");
}

function startsWithAny(value, prefixes) {
  return prefixes.some((prefix) => value.startsWith(prefix));
}

function parentPaths(relativePath) {
  const parentPaths = [];
  const segments = relativePath.split("/").slice(0, -1);
  for (let index = 0; index <= segments.length; index += 1) {
    parentPaths.push(segments.slice(0, index).join("/"));
  }
  return parentPaths;
}

async function findRouteEntries(directory, prefix = "") {
  const entries = [];
  for (const directoryEntry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${directoryEntry.name}` : directoryEntry.name;
    const absolutePath = path.join(directory, directoryEntry.name);
    if (directoryEntry.isDirectory()) {
      entries.push(...await findRouteEntries(absolutePath, relativePath));
      continue;
    }
    if (!directoryEntry.isFile()) continue;
    const kind = directoryEntry.name === "page.tsx" ? "page" : "entry";
    entries.push({ relativePath, kind });
  }
  return entries;
}

async function copyPublicAssets(source, target) {
  await cp(source, target, { recursive: true, dereference: true });
}

async function namespaceStaticAssets(buildRoot, name) {
  const assetsRoot = path.join(buildRoot, ".open-next", "assets");
  const nextAssets = path.join(assetsRoot, "_next");
  const namespacedNextAssets = path.join(assetsRoot, "_edge", name, "_next");
  await mkdir(path.dirname(namespacedNextAssets), { recursive: true });
  await cp(nextAssets, namespacedNextAssets, { recursive: true, dereference: true });
}

function relativeImport(fromFile, toFile) {
  const source = path.relative(path.dirname(fromFile), toFile).replaceAll(path.sep, "/");
  return source.startsWith(".") ? source.replace(/\.(tsx|ts)$/, "") : `./${source.replace(/\.(tsx|ts)$/, "")}`;
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", env: process.env });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}
