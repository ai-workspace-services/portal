import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { publicDiscovery } from "../src/data/content/public-discovery";
import { generatePublicDiscovery } from "./generate-public-discovery";

const temporaryRoots: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("discovery generation", () => {
  it("generates both locales and reproducible indexes from one reviewed source", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "portal-geo-test-"));
    temporaryRoots.push(root);
    const content = path.join(root, "content");
    await mkdir(content);
    await writeFile(
      path.join(content, "discovery.json"),
      JSON.stringify(publicDiscovery),
    );
    for (const product of publicDiscovery.products) {
      const directory = path.join(root, "src/app/products", product.slug);
      await mkdir(directory, { recursive: true });
      await writeFile(
        path.join(directory, "page.tsx"),
        "export default function Page() {}",
      );
    }
    await generatePublicDiscovery(content, root);
    const first = await readFile(path.join(root, "public/llms.txt"), "utf8");
    for (const product of publicDiscovery.products) {
      expect(
        await readFile(
          path.join(root, "public/products", `${product.slug}.md`),
          "utf8",
        ),
      ).toContain(product.description.zh);
      expect(
        await readFile(
          path.join(root, "public/products", `${product.slug}.en.md`),
          "utf8",
        ),
      ).toContain(product.description.en);
    }
    expect(
      await readFile(path.join(root, "public/llms-full.txt"), "utf8"),
    ).toContain("## Current availability");
    await generatePublicDiscovery(content, root);
    expect(await readFile(path.join(root, "public/llms.txt"), "utf8")).toBe(
      first,
    );
    const unreviewed = path.join(root, "src/app/products/unreviewed");
    await mkdir(unreviewed);
    await writeFile(
      path.join(unreviewed, "page.tsx"),
      "export default function Page() {}",
    );
    await expect(generatePublicDiscovery(content, root)).rejects.toThrow(
      "no reviewed discovery facts",
    );
  });
});
