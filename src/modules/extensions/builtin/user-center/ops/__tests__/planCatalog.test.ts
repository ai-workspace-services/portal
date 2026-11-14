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
    for (const value of [0, 1, 3, 5, 20, 30, 50, 1.5]) {
      expect(quotaFromGB(String(value))).toBe(value * GB);
      expect(quotaToGB(value * GB)).toBe(String(value));
    }
    for (const value of ["", "-1", "Infinity", "bad", "1e30"]) {
      expect(() => quotaFromGB(value)).toThrow();
    }
    expect(quotaToGB(Number.MAX_VALUE)).toBe("");
  });

  it("partitions only the 4 families and routes trial/payg into legacy", () => {
    const trialPlan = {
      planId: "FREE-3GB-2026",
      kind: "trial",
      packageName: "free",
      active: true,
      includedQuotaBytes: 3 * GB,
    };
    const paygPlan = {
      planId: "PAYG-TOPUP-50",
      kind: "paygo_topup",
      packageName: "payg",
      active: true,
    };
    const result = partitionCatalog([trialPlan, paygPlan]);
    expect(result.legacy).toEqual([trialPlan, paygPlan]);
    expect(result.families.map((f) => f.id)).toEqual([
      "free",
      "plus",
      "pro",
      "custom",
    ]);
    expect(
      result.families.flatMap((f) => f.variants).every((p) => !p.active),
    ).toBe(true);
  });

  it("uses persisted edition data without resetting it to template defaults", () => {
    const template = CATALOG_FAMILIES[1].variants[0];
    const saved = {
      ...template,
      displayName: "Reviewed Plus",
      includedQuotaBytes: 30 * GB,
      features: {
        family: "plus",
        dunning: { grace_days: 3 },
      },
    };
    const result = partitionCatalog([saved]);
    expect(result.families[1].variants[0]).toBe(saved);
    expect(result.legacy).toEqual([]);
  });
});
