import { promises as fs } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

type ContentManifest = {
  apiVersion?: unknown;
  kind?: unknown;
  metadata?: { name?: unknown };
  spec?: {
    schemaVersion?: unknown;
    locales?: unknown;
    entrypoints?: Record<string, unknown>;
  };
};

type MarketingContent = {
  hero?: {
    title?: unknown;
    line?: unknown;
    subtitle?: unknown;
    tagline?: unknown;
    primaryCta?: { label?: unknown; href?: unknown };
    secondaryCta?: { label?: unknown; href?: unknown };
  };
};

const contentRoot = path.resolve(
  process.env.WEBSITE_CONTENT_DIR ??
    process.env.CONTENT_SOURCE_DIR ??
    path.join(process.cwd(), "src", "content"),
);

const locales = ["zh", "en"] as const;

function fail(message: string): never {
  throw new Error(`Website content validation failed: ${message}`);
}

async function readFile(relativePath: string): Promise<string> {
  const absolutePath = path.join(contentRoot, relativePath);
  try {
    return await fs.readFile(absolutePath, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      fail(`missing required file ${relativePath}`);
    }
    throw error;
  }
}

function parseFrontMatter(raw: string, relativePath: string): Record<string, unknown> {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    fail(`${relativePath} must start with YAML front matter`);
  }

  const parsed = yaml.load(match[1]);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail(`${relativePath} front matter must be a YAML object`);
  }
  return parsed as Record<string, unknown>;
}

function requireString(value: unknown, field: string, relativePath: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${relativePath} requires a non-empty ${field}`);
  }
}

function validateMarketingContent(relativePath: string, metadata: MarketingContent): void {
  const hero = metadata.hero;
  if (!hero || typeof hero !== "object") {
    fail(`${relativePath} requires a hero object`);
  }

  if (!Array.isArray(hero.title) || hero.title.length === 0) {
    fail(`${relativePath} requires a non-empty hero.title array`);
  }
  hero.title.forEach((title, index) =>
    requireString(title, `hero.title[${index}]`, relativePath),
  );
  requireString(hero.line, "hero.line", relativePath);
  requireString(hero.subtitle, "hero.subtitle", relativePath);
  requireString(hero.tagline, "hero.tagline", relativePath);
  requireString(hero.primaryCta?.label, "hero.primaryCta.label", relativePath);
  requireString(hero.primaryCta?.href, "hero.primaryCta.href", relativePath);
  requireString(hero.secondaryCta?.label, "hero.secondaryCta.label", relativePath);
  requireString(hero.secondaryCta?.href, "hero.secondaryCta.href", relativePath);
}

async function validateManifest(): Promise<void> {
  const manifestPath = "content-manifest.yaml";
  const manifestExists = await fs
    .access(path.join(contentRoot, manifestPath))
    .then(() => true)
    .catch(() => false);

  if (!manifestExists) {
    fail(`missing ${manifestPath} in the Git-backed CMS source`);
  }

  const raw = await readFile(manifestPath);
  const manifest = yaml.load(raw) as ContentManifest;
  if (!manifest || typeof manifest !== "object") {
    fail(`${manifestPath} must be a YAML object`);
  }
  if (manifest.apiVersion !== "content.xworkmate.com/v1alpha1") {
    fail(`${manifestPath} has an unsupported apiVersion`);
  }
  if (manifest.kind !== "WebsiteContent") {
    fail(`${manifestPath} kind must be WebsiteContent`);
  }
  if (manifest.metadata?.name !== "portal") {
    fail(`${manifestPath} metadata.name must be portal`);
  }
  if (manifest.spec?.schemaVersion !== 1) {
    fail(`${manifestPath} spec.schemaVersion must be 1`);
  }
  const declaredLocales = Array.isArray(manifest.spec?.locales)
    ? manifest.spec.locales.filter(
        (locale): locale is string => typeof locale === "string",
      )
    : [];
  if (locales.some((locale) => !declaredLocales.includes(locale))) {
    fail(`${manifestPath} must declare zh and en locales`);
  }

  for (const [entrypoint, paths] of Object.entries(
    manifest.spec?.entrypoints ?? {},
  )) {
    if (!Array.isArray(paths)) {
      fail(`${manifestPath} entrypoint ${entrypoint} must be a path array`);
    }
    for (const entryPath of paths) {
      requireString(entryPath, `entrypoint ${entrypoint}`, manifestPath);
      await readFile(entryPath);
    }
  }
}

async function main(): Promise<void> {
  const stat = await fs.stat(contentRoot).catch(() => null);
  if (!stat?.isDirectory()) {
    fail(`content root does not exist: ${contentRoot}`);
  }

  await validateManifest();

  for (const locale of locales) {
    const marketingPath = `homepage/${locale}/marketing.md`;
    const heroPath = `homepage/${locale}/hero.md`;
    const marketing = parseFrontMatter(await readFile(marketingPath), marketingPath);
    parseFrontMatter(await readFile(heroPath), heroPath);
    validateMarketingContent(marketingPath, marketing as MarketingContent);
  }

  console.log(`Website content is valid: ${contentRoot}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
