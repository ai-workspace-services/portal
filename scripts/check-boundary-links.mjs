#!/usr/bin/env node
/**
 * 守卫：禁止跨 SSR boundary 使用 next/link。
 *
 * 背景见 src/lib/ssrBoundaries.ts。一句话：跨界目标页不在当前 build 里，
 * next/link 的软导航对静态预渲染目标会静默挂死 —— 点了没反应、URL 不变、
 * console 零报错，是最难排查的一类故障（历史上「登录」「进入控制台」都栽过）。
 *
 * 判定方式：
 *   1. 从 config/cloudflare-boundaries.json 的 route_suffixes 得到路由归属表；
 *   2. 以 src/app 下的页面/布局为种子，沿 import 图算出每个模块会被打进哪些 boundary；
 *   3. 模块里凡是用了 next/link 的 <Link>：
 *        - href 是字面量且目标 boundary 不等于宿主 boundary  → 跨界，必须报错
 *        - href 是变量/表达式且宿主 boundary 不止一个        → 无法静态判定，
 *          这类组件（导航、页脚、面包屑）历史上就是重灾区，一律要求用 BoundaryLink
 *   修法都一样：`import BoundaryLink from '@/components/common/BoundaryLink'`，
 *   同界时它就是 next/link，跨界时自动退回原生 <a>。
 *
 * 同一个坑还有第二个入口：useRouter() 的 router.push/replace。它和 next/link 走的是
 * 同一套软导航，跨界一样会挂死，而且更隐蔽（没有可点的 DOM 可查）。所以字面量目标
 * 跨界的 router.push/replace 也一并拦下，改用 window.location.assign() 整页跳转。
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBoundaryRoutes,
  resolveBoundaryForPath,
  routeUrlPath,
} from "./ssr-boundary-routes.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const srcRoot = path.join(projectRoot, "src");
const appRoot = path.join(srcRoot, "app");

const ALIASES = [
  ["@/", "src/"],
  ["@src/", "src/"],
  ["@components/", "src/components/"],
  ["@i18n/", "src/i18n/"],
  ["@lib/", "src/lib/"],
  ["@server/", "src/server/"],
  ["@extensions/", "src/modules/extensions/"],
  ["@modules/", "src/modules/"],
  ["@theme/", "src/components/theme/"],
];
const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs"];
const SPECIAL_FILES = [
  "layout",
  "template",
  "loading",
  "error",
  "not-found",
  "default",
];
// BoundaryLink 本身就是「跨界时不用 next/link」这条规则的实现，是唯一豁免。
const ALLOWED_NEXT_LINK = new Set(["src/components/common/BoundaryLink.tsx"]);

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      await walk(full, out);
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

const files = await walk(srcRoot);
const fileSet = new Set(files);
const sources = new Map(
  await Promise.all(files.map(async (f) => [f, await readFile(f, "utf8")])),
);

function resolveSpecifier(fromFile, specifier) {
  let target = null;
  if (specifier.startsWith(".")) {
    target = path.resolve(path.dirname(fromFile), specifier);
  } else {
    const alias = ALIASES.find(([prefix]) => specifier.startsWith(prefix));
    if (!alias) return null;
    target = path.join(
      projectRoot,
      alias[1] + specifier.slice(alias[0].length),
    );
  }

  if (fileSet.has(target)) return target;
  for (const ext of EXTENSIONS) {
    if (fileSet.has(target + ext)) return target + ext;
  }
  for (const ext of EXTENSIONS) {
    const indexFile = path.join(target, `index${ext}`);
    if (fileSet.has(indexFile)) return indexFile;
  }
  return null;
}

const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)[\s\S]{0,400}?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function importsOf(file) {
  const found = new Set();
  for (const match of sources.get(file).matchAll(IMPORT_RE)) {
    const specifier = match[1] || match[2];
    const resolved = specifier && resolveSpecifier(file, specifier);
    if (resolved) found.add(resolved);
  }
  return found;
}

// ---- 1. 种子：app 目录下的页面与它们的祖先布局 -------------------------------
const routes = buildBoundaryRoutes(
  JSON.parse(
    await readFile(
      path.join(projectRoot, "config", "cloudflare-boundaries.json"),
      "utf8",
    ),
  ).boundaries,
);
if (routes.length === 0)
  throw new Error("no route_suffixes found in boundary config");

const appFiles = files.filter((f) => f.startsWith(appRoot + path.sep));
const rel = (f) => path.relative(appRoot, f).split(path.sep).join("/");
const isApiRoute = (r) => r === "api" || r.startsWith("api/");

const pages = appFiles.filter(
  (f) => /\/page\.(tsx|ts|jsx|js)$/.test(f) && !isApiRoute(rel(f)),
);
const pageBoundary = new Map(
  pages.map((f) => [f, resolveBoundaryForPath(routeUrlPath(rel(f)), routes)]),
);

/** 每个种子文件会被打进哪些 boundary。 */
const seeds = new Map();
for (const [file, boundary] of pageBoundary) {
  seeds.set(file, new Set([boundary]));
}
for (const file of appFiles) {
  const base = path.basename(file, path.extname(file));
  if (!SPECIAL_FILES.includes(base)) continue;
  const dirPrefix = path.dirname(file) + path.sep;
  const owners = new Set();
  for (const [page, boundary] of pageBoundary) {
    if (page.startsWith(dirPrefix)) owners.add(boundary);
  }
  // 根 layout / not-found 会被复制进每个 boundary
  if (owners.size > 0) seeds.set(file, owners);
}

// ---- 2. 沿 import 图把 boundary 归属传播下去 ---------------------------------
const hostBoundaries = new Map();
const queue = [...seeds.entries()].map(([file, set]) => [file, set]);
while (queue.length > 0) {
  const [file, incoming] = queue.pop();
  const current = hostBoundaries.get(file) ?? new Set();
  const added = [...incoming].filter((b) => !current.has(b));
  if (added.length === 0 && hostBoundaries.has(file)) continue;
  for (const b of incoming) current.add(b);
  hostBoundaries.set(file, current);
  for (const next of importsOf(file)) {
    queue.push([next, new Set(added.length > 0 ? added : incoming)]);
  }
}

// ---- 3. 找出 next/link 的用法并判定 ------------------------------------------
const NEXT_LINK_IMPORT_RE =
  /import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\})?\s*from\s*["']next\/link["']/;
const violations = [];

for (const file of files) {
  const source = sources.get(file);
  const importMatch = source.match(NEXT_LINK_IMPORT_RE);
  if (!importMatch) continue;
  if (
    ALLOWED_NEXT_LINK.has(
      path.relative(projectRoot, file).split(path.sep).join("/"),
    )
  )
    continue;

  const component = importMatch[1];
  const hosts = hostBoundaries.get(file);
  if (!hosts || hosts.size === 0) continue; // 不可达（测试夹具等），不管

  const usageRe = new RegExp(
    `<${component}\\b[\\s\\S]{0,400}?href=(\\{[^}]*\\}|"[^"]*"|'[^']*')`,
    "g",
  );
  for (const usage of source.matchAll(usageRe)) {
    const raw = usage[1];
    const line = source.slice(0, usage.index).split("\n").length;
    const literal =
      raw.startsWith('"') || raw.startsWith("'") ? raw.slice(1, -1) : null;

    if (literal !== null) {
      if (!literal.startsWith("/")) continue; // 外链/锚点，交给 <a>
      const target = resolveBoundaryForPath(literal.split(/[?#]/)[0], routes);
      const crossing = [...hosts].filter((host) => host !== target);
      if (crossing.length > 0) {
        violations.push({
          file,
          line,
          detail: `href="${literal}" 属于 ${target} boundary，但本模块会被打进 ${crossing.join(", ")}`,
        });
      }
      continue;
    }

    if (hosts.size > 1) {
      violations.push({
        file,
        line,
        detail: `href=${raw.replace(/\s+/g, " ").slice(0, 60)} 无法静态判定，而本模块跨 ${[...hosts].join(", ")} 多个 boundary`,
      });
    }
  }
}

// ---- 4. router.push/replace 是同一个坑的第二个入口 --------------------------
const ROUTER_NAV_RE =
  /\brouter\s*\.\s*(push|replace)\(\s*(["'`])(\/[^"'`$]*)\2/g;

for (const file of files) {
  const hosts = hostBoundaries.get(file);
  if (!hosts || hosts.size === 0) continue;

  const source = sources.get(file);
  for (const usage of source.matchAll(ROUTER_NAV_RE)) {
    const href = usage[3];
    const target = resolveBoundaryForPath(href.split(/[?#]/)[0], routes);
    const crossing = [...hosts].filter((host) => host !== target);
    if (crossing.length === 0) continue;

    violations.push({
      file,
      line: source.slice(0, usage.index).split("\n").length,
      detail: `router.${usage[1]}("${href}") 落在 ${target} boundary，但本模块会被打进 ${crossing.join(", ")}`,
      fix: "改用 window.location.assign()，跨界只能整页跳转",
    });
  }
}

violations.sort((a, b) =>
  a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file),
);

if (violations.length === 0) {
  console.log("boundary-links: OK —— 没有跨 boundary 的 next/link");
  process.exit(0);
}

console.error(
  `boundary-links: 发现 ${violations.length} 处跨 boundary 的软导航\n`,
);
for (const violation of violations) {
  console.error(
    `  ${path.relative(projectRoot, violation.file)}:${violation.line}`,
  );
  console.error(`    ${violation.detail}`);
  if (violation.fix) console.error(`    → ${violation.fix}`);
}
console.error(
  `\n修法：改用 BoundaryLink（@/components/common/BoundaryLink），`,
);
console.error(
  `同 boundary 内它就是 next/link，跨界时自动退回原生 <a> 整页跳转。`,
);
process.exit(1);
