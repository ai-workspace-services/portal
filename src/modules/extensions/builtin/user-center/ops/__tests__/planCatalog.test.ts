import { describe, expect, it } from "vitest";
import {
  GB,
  CATALOG_FAMILIES,
  partitionCatalog,
  quotaFromGB,
  quotaToGB,
} from "../planCatalog";

describe("catalog unit boundary and version preservation", () => {
  it("roundtrips valid GB values through existing byte API", () => {
    for (const value of [0, 1, 3, 5, 20, 50, 240, 600, 1.5]) {
      expect(quotaFromGB(String(value))).toBe(value * GB);
      expect(quotaToGB(value * GB)).toBe(String(value));
    }
    for (const value of ["", "-1", "Infinity", "bad", "1e30"])
      expect(() => quotaFromGB(value)).toThrow();
    expect(quotaToGB(Number.MAX_VALUE)).toBe("");
  });
  it("never mutates or treats legacy active subscriptions as archived", () => {
    const legacy = {
      planId: "PLUS",
      kind: "subscription",
      active: true,
      stripePriceId: "price_legacy",
      includedQuotaBytes: 20 * GB,
    };
    const snapshot = JSON.stringify(legacy);
    const result = partitionCatalog([legacy]);
    expect(result.legacy).toEqual([legacy]);
    expect(JSON.stringify(legacy)).toBe(snapshot);
    expect(result.families).toHaveLength(6);
    expect(
      result.families.flatMap((f) => f.variants).every((p) => !p.active),
    ).toBe(true);
    expect(
      result.families.flatMap((f) => f.variants).some((p) => p.stripePriceId),
    ).toBe(false);
  });
  it("uses persisted edition data without resetting it to template defaults", () => {
    const template = CATALOG_FAMILIES[1].variants[0];
    const saved = {
      ...template,
      displayName: "Reviewed Plus",
      includedQuotaBytes: 25 * GB,
      features: {
        catalog_policy: { family: "plus" },
        external: { retain: true },
      },
    };
    const result = partitionCatalog([saved]);
    expect(result.families[1].variants[0]).toBe(saved);
    expect(result.legacy).toEqual([]);
  });
});
