import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchAccountBillingSummary,
  fetchAccountPolicy,
  fetchAccountUsageSummary,
} from "./fetchAccountUsage";

describe("fetchAccountUsage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the authoritative usage summary from the account api", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accountUuid: "acct-1",
          totalBytes: 384,
          sourceOfTruth: "postgresql",
          planAssignmentStatus: "unassigned",
          defaultPlan: {
            planId: "FREE",
            displayName: "Free",
            packageName: "free",
            maxTrafficBytes: 5 * 1024 * 1024 * 1024,
            unlimited: false,
            assigned: false,
            source: "local_catalog_default",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(fetchAccountUsageSummary()).resolves.toEqual({
      accountUuid: "acct-1",
      totalBytes: 384,
      sourceOfTruth: "postgresql",
      planAssignmentStatus: "unassigned",
      defaultPlan: {
        planId: "FREE",
        displayName: "Free",
        packageName: "free",
        maxTrafficBytes: 5 * 1024 * 1024 * 1024,
        unlimited: false,
        assigned: false,
        source: "local_catalog_default",
      },
    });
  });

  it("loads the authoritative policy snapshot from the account api", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ accountUuid: "acct-1", preferredStrategy: "ewma" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(fetchAccountPolicy()).resolves.toEqual({
      accountUuid: "acct-1",
      preferredStrategy: "ewma",
    });
  });

  it("loads the authoritative billing summary from the account api", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accountUuid: "acct-1",
          sourceOfTruth: "postgresql",
          billingProfile: {
            packageName: "starter",
            pricingRuleVersion: "pricing-v1",
          },
          ledger: [
            {
              id: "ledger-1",
              entryType: "traffic_charge",
              ratedBytes: 50,
              amountDelta: -12.5,
              balanceAfter: 87.5,
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(fetchAccountBillingSummary()).resolves.toEqual({
      accountUuid: "acct-1",
      sourceOfTruth: "postgresql",
      billingProfile: {
        packageName: "starter",
        pricingRuleVersion: "pricing-v1",
      },
      ledger: [
        {
          id: "ledger-1",
          entryType: "traffic_charge",
          ratedBytes: 50,
          amountDelta: -12.5,
          balanceAfter: 87.5,
        },
      ],
    });
  });
});
