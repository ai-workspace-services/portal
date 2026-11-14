/**
 * The body the ops console sends when publishing a plan.
 */

export type BillingPlan = {
  planId: string;
  stripePriceId?: string;
  displayName?: string;
  kind: "subscription" | "service" | string;
  includedQuotaBytes?: number;
  packageName?: string;
  /** List price in the currency's minor unit; read by /prices and /products/xconnect. */
  priceAmount?: number;
  priceCurrency?: string;
  /** month | year | hour | once */
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
    packageName: form.packageName.trim() || "custom",
    stripePriceId: form.stripePriceId.trim(),
    includedQuotaBytes: Number(form.includedQuotaBytes),
    trialDays: 0,
    sortOrder: Number(form.sortOrder),
    active: form.active,
    reason: form.reason.trim(),
  };

  if (existing?.priceAmount !== undefined) body.priceAmount = existing.priceAmount;
  if (existing?.priceCurrency !== undefined) body.priceCurrency = existing.priceCurrency;
  if (existing?.priceUnit !== undefined) body.priceUnit = existing.priceUnit;
  if (existing?.priceMultipliers !== undefined) {
    body.priceMultipliers = existing.priceMultipliers;
  }
  if (existing?.features !== undefined) body.features = existing.features;

  return body;
}
