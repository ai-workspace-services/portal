import { describe, expect, it } from "vitest";

import { buildPlanUpsertBody, type BillingPlan, type PlanForm } from "../planUpsert";

const form: PlanForm = {
  planId: "PRO-MONTHLY",
  displayName: "Pro 月付",
  kind: "subscription",
  packageName: "pro",
  stripePriceId: "price_123",
  includedQuotaBytes: "21474836480",
  trialDays: "0",
  sortOrder: "30",
  active: true,
  reason: "上架月付",
};

const existing: BillingPlan = {
  planId: "PRO-MONTHLY",
  kind: "subscription",
  priceAmount: 2000,
  priceCurrency: "CNY",
  priceUnit: "month",
  priceMultipliers: { region: 1.2 },
  features: { fast_lane: { mode: "quota" }, quota_cycle: "natural_month" },
};

describe("buildPlanUpsertBody", () => {
  it("carries forward the fields the form does not edit", () => {
    // adminUpsertBillingPlan replaces the whole row: a field left out of the
    // body is written as its zero value. Dropping these would zero the list
    // price (the storefront falls back to "coming soon"), erase the
    // entitlement features fast_lane/overage/dunning/quota_cycle, and reset
    // the pricing multipliers to 1.0 -- all recorded in the audit trail as a
    // deliberate edit.
    const body = buildPlanUpsertBody(form, existing);

    expect(body.priceAmount).toBe(2000);
    expect(body.priceCurrency).toBe("CNY");
    expect(body.priceUnit).toBe("month");
    expect(body.priceMultipliers).toEqual({ region: 1.2 });
    expect(body.features).toEqual({
      fast_lane: { mode: "quota" },
      quota_cycle: "natural_month",
    });
  });

  it("sends what the form does edit", () => {
    const body = buildPlanUpsertBody(form, existing);

    expect(body).toMatchObject({
      planId: "PRO-MONTHLY",
      displayName: "Pro 月付",
      kind: "subscription",
      packageName: "pro",
      stripePriceId: "price_123",
      includedQuotaBytes: 21474836480,
      trialDays: 0,
      sortOrder: 30,
      active: true,
      reason: "上架月付",
    });
  });

  it("omits price fields entirely for a brand new plan", () => {
    // accounts rejects a priceAmount with no currency, so a new plan must send
    // neither rather than an amount of 0 paired with an empty string.
    const body = buildPlanUpsertBody({ ...form, planId: "NEW-PLAN" }, undefined);

    expect("priceAmount" in body).toBe(false);
    expect("priceCurrency" in body).toBe(false);
    expect("priceUnit" in body).toBe(false);
  });

  it("trims the free-text fields and defaults an empty package name", () => {
    const body = buildPlanUpsertBody(
      { ...form, planId: "  PRO-MONTHLY  ", displayName: " Pro ", packageName: "  ", reason: " why " },
      existing,
    );

    expect(body.planId).toBe("PRO-MONTHLY");
    expect(body.displayName).toBe("Pro");
    expect(body.packageName).toBe("default");
    expect(body.reason).toBe("why");
  });
});
