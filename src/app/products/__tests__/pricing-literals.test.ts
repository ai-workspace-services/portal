import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Product pages must not carry their own price tags.
 *
 * `/products/xconnect` shipped a hardcoded plans[] quoting ¥69/month for Pro
 * with a 500 GB quota and ¥0.12/GB overage, plus a ¥199 Team tier — against a
 * catalog and a Stripe price of ¥20/month, 20 GB, ¥1/GB, and no Team plan at
 * all. Nothing failed: the page rendered its own numbers while checkout
 * charged the catalog's, and Stripe prices are immutable once created, so the
 * two could not be reconciled after the fact.
 *
 * Amounts belong to the live catalog (`formatPlanPrice`), and the per-plan
 * feature copy to `@modules/billing/catalog`, so both storefronts read one
 * source. ¥0 is allowed: a free tier has no catalog row to price.
 */
const PRODUCTS_DIR = path.resolve(__dirname, "..");

// ¥ or $ followed by a non-zero amount. "¥0" passes; "¥0.12" does not.
const PRICE_LITERAL = /[¥$](?!0(?![\d.]))\d/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("product page pricing", () => {
  it("quotes no amount the catalog does not own", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(PRODUCTS_DIR)) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, index) => {
          if (!PRICE_LITERAL.test(line)) return;
          offenders.push(`${path.relative(PRODUCTS_DIR, file)}:${index + 1}`);
        });
    }

    expect(offenders).toEqual([]);
  });
});
