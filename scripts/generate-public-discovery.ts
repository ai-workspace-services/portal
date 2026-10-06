import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  llmsIndex,
  productMarkdown,
  validateDiscovery,
} from "../src/lib/public-discovery";

export async function generatePublicDiscovery(
  contentRoot: string,
  projectRoot = process.cwd(),
): Promise<void> {
  const data: unknown = JSON.parse(
    await readFile(path.join(contentRoot, "discovery.json"), "utf8"),
  );
  validateDiscovery(data);
  const productRoot = path.join(projectRoot, "src/app/products");
  const productRoutes: string[] = [];
  for (const entry of await readdir(productRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[a-z0-9-]+$/.test(entry.name)) continue;
    try {
      await readFile(path.join(productRoot, entry.name, "page.tsx"));
      productRoutes.push(`/products/${entry.name}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  for (const product of data.products) {
    if (!productRoutes.includes(`/products/${product.slug}`))
      throw new Error(`Discovery product has no public page: ${product.slug}`);
  }
  for (const route of productRoutes) {
    if (
      !data.products.some((product) => `/products/${product.slug}` === route)
    ) {
      throw new Error(
        `Public product page has no reviewed discovery facts: ${route}`,
      );
    }
  }
  const outputRoot = path.join(projectRoot, "src/data/content");
  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    path.join(outputRoot, "public-discovery.ts"),
    `// Generated from knowledge/content/website/discovery.json. Do not edit.\nimport type { PublicDiscovery } from "../../lib/public-discovery";\nexport const publicDiscovery: PublicDiscovery = ${JSON.stringify(data, null, 2)};\nexport const publicProductRoutes: string[] = ${JSON.stringify(productRoutes.sort())};\n`,
  );
  await mkdir(path.join(projectRoot, "public/products"), { recursive: true });
  for (const product of data.products) {
    for (const locale of ["zh", "en"] as const) {
      await writeFile(
        path.join(
          projectRoot,
          "public/products",
          `${product.slug}${locale === "en" ? ".en" : ""}.md`,
        ),
        productMarkdown(data, product, locale),
      );
    }
  }
  await writeFile(path.join(projectRoot, "public/llms.txt"), llmsIndex(data));
  await writeFile(
    path.join(projectRoot, "public/llms-full.txt"),
    `${llmsIndex(data)}\n${data.products.map((product) => productMarkdown(data, product, "en")).join("\n")}`,
  );
}
