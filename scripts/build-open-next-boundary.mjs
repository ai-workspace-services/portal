import { cp, lstat, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(projectRoot, "src", "app");
const generatedRoot = path.join(projectRoot, ".edge-build");
const boundary = readBoundary(process.argv.slice(2));

const boundaries = {
  public: {
    workerName: "frontend-ssr-public",
    routes: ["console-uat.onwalk.net/*", "console-uat.onwalk.net/_edge/public/*"],
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
    workerName: "frontend-ssr-content",
    routes: [
      "console-uat.onwalk.net/blogs*",
      "console-uat.onwalk.net/docs*",
      "console-uat.onwalk.net/download*",
      "console-uat.onwalk.net/_edge/content/*",
    ],
    owns: (relativePath) => startsWithAny(relativePath, ["blogs/", "docs/", "download/"]),
  },
  auth: {
    workerName: "frontend-ssr-auth",
    routes: [
      "console-uat.onwalk.net/login*",
      "console-uat.onwalk.net/register*",
      "console-uat.onwalk.net/email-verification*",
      "console-uat.onwalk.net/logout*",
      "console-uat.onwalk.net/_edge/auth/*",
    ],
    owns: (relativePath) => startsWithAny(relativePath, ["(auth)/", "logout/"]),
  },
  console: {
    workerName: "frontend-ssr-console",
    routes: [
      "console-uat.onwalk.net/panel*",
      "console-uat.onwalk.net/dashboard*",
      "console-uat.onwalk.net/_edge/console/*",
    ],
    owns: (relativePath) => startsWithAny(relativePath, ["panel/", "dashboard/"]),
  },
  workspace: {
    workerName: "frontend-ssr-workspace",
    routes: [
      "console-uat.onwalk.net/ai-workspace*",
      "console-uat.onwalk.net/cloud_iac*",
      "console-uat.onwalk.net/editor*",
      "console-uat.onwalk.net/support*",
      "console-uat.onwalk.net/xworkmate*",
      "console-uat.onwalk.net/_edge/workspace/*",
    ],
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
      uat: {
        name: `${definition.workerName}-uat`,
        routes: definition.routes.map((pattern) => ({ pattern, zone_name: "onwalk.net" })),
        services: [{ binding: "WORKER_SELF_REFERENCE", service: `${definition.workerName}-uat` }],
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
