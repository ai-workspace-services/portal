/**
 * The body the ops console sends when publishing a plan.
 *
 * `adminUpsertBillingPlan` (accounts api/billing_plans.go) replaces the whole
 * row -- a field absent from the request is written as its zero value, and the
 * audit trail records that as a deliberate edit. The editor only exposes the
 * packaging fields, so everything else has to be carried forward explicitly or
 * saving one plan quietly destroys its pricing and entitlements.
 */

export type BillingPlan = {
  planId: string;
  stripePriceId?: string;
  displayName?: string;
  kind: "trial" | "subscription" | "paygo_topup" | string;
  includedQuotaBytes?: number;
  packageName?: string;
  /** List price in the currency's minor unit; read by /prices. */
  priceAmount?: number;
  priceCurrency?: string;
  /** month | year | once | gb */
  priceUnit?: string;
  priceMultipliers?: Record<string, number>;
  features?: Record<string, unknown>;
  trialDays?: number;
  active?: boolean;
  sortOrder?: number;
};

export type PlanForm = {
  planId: string;
  displayName: string;
  kind: string;
  packageName: string;
  stripePriceId: string;
  includedQuotaBytes: string;
  trialDays: string;
  sortOrder: string;
  active: boolean;
  reason: string;
};

export type PlanUpsertBody = {
  planId: string;
  displayName: string;
  kind: string;
  packageName: string;
  stripePriceId: string;
  includedQuotaBytes: number;
  trialDays: number;
  sortOrder: number;
  active: boolean;
  reason: string;
  priceAmount?: number;
  priceCurrency?: string;
  priceUnit?: string;
  priceMultipliers?: Record<string, number>;
  features?: Record<string, unknown>;
};

export function buildPlanUpsertBody(
  form: PlanForm,
  existing: BillingPlan | undefined,
): PlanUpsertBody {
  const body: PlanUpsertBody = {
    planId: form.planId.trim(),
    displayName: form.displayName.trim(),
    kind: form.kind,
    packageName: form.packageName.trim() || "default",
    stripePriceId: form.stripePriceId.trim(),
    includedQuotaBytes: Number(form.includedQuotaBytes),
    trialDays: Number(form.trialDays),
    sortOrder: Number(form.sortOrder),
    active: form.active,
    reason: form.reason.trim(),
  };

  // A new plan has no price to preserve. Sending priceAmount: 0 with an empty
  // currency is rejected outright once an amount is set, and an amount of 0
  // with no currency is indistinguishable from "not published" -- so send
  // neither and let the price be set where prices are managed.
  if (existing?.priceAmount !== undefined) body.priceAmount = existing.priceAmount;
  if (existing?.priceCurrency !== undefined) body.priceCurrency = existing.priceCurrency;
  if (existing?.priceUnit !== undefined) body.priceUnit = existing.priceUnit;
  if (existing?.priceMultipliers !== undefined) {
    body.priceMultipliers = existing.priceMultipliers;
  }
  if (existing?.features !== undefined) body.features = existing.features;

  return body;
}
