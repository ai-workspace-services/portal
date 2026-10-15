import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UserGroupManagement from "../components/UserGroupManagement";
import { BillingFacts } from "../components/SubscriptionDetails";

describe("subscription management", () => {
  it("derives annual membership from persisted subscription facts and restores only the temporary marker", async () => {
    const groups = [
      "User",
      "segment:yearly",
      "segment:quota:plus-20gb",
      "segment:subscription:unlimited",
    ];
    const preview = vi.fn(async () => ({
      requestId: "restore",
      previewToken: "reviewed",
      expiresAt: "2030-01-01",
      changes: [],
    }));
    render(
      <UserGroupManagement
        users={[
          {
            id: "annual",
            email: "annual@example.invalid",
            groups,
            temporaryUnlimited: true,
            subscriptionRecord: {
              userId: "annual",
              subscriptionType: "year",
              monthlyQuotaBytes: 20 * 1024 ** 3,
              annualQuotaBytes: 240 * 1024 ** 3,
              feeMinor: 20000,
              paymentStatus: "paid",
              note: "gift",
            },
          },
        ]}
        canEditRoles
        onPlanGroupPreview={preview}
        onPlanGroupApply={async () => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /年付/ }));
    expect(screen.getAllByText("annual@example.invalid").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /撤销临时不限量/ }));
    fireEvent.click(screen.getByRole("button", { name: /生成预览|预览变更/ }));
    await waitFor(() =>
      expect(preview).toHaveBeenCalledWith(
        "single",
        [
          {
            userId: "annual",
            groups: groups.filter(
              (group) => group !== "segment:subscription:unlimited",
            ),
          },
        ],
        expect.any(String),
      ),
    );
  });
  it("submits the original CSV to Accounts and applies only after confirmation", async () => {
    const source = "邮箱,费用\nmember@example.invalid,200元";
    const preview = {
      requestId: "request-email-upsert",
      previewToken: "server-token",
      expiresAt: "2030-10-15T12:00:00Z",
      changes: [
        {
          userId: "member",
          planId: "PLUS",
          usedBytesPreserved: 3 * 1024 ** 3,
          remainingIncludedQuota: 17 * 1024 ** 3,
          configurationSyncWillPause: false,
          after: { validFrom: "2026-08-01", validUntil: "2027-07-30" },
        },
      ],
    };
    const upload = vi.fn(async () => preview);
    const apply = vi.fn(async () => undefined);
    const { container } = render(
      <UserGroupManagement
        users={[{ id: "member", email: "member@example.invalid" }]}
        canEditRoles
        onSubscriptionRecordsImport={upload}
        onPlanGroupApply={apply}
      />,
    );
    const file = new File([source], "subscriptions.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: async () => source });
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(upload).toHaveBeenCalledWith(source, expect.any(String)),
    );
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "2026-08-01 — 2027-07-30",
    );
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "确认并应用" }));
    await waitFor(() =>
      expect(apply).toHaveBeenCalledWith(
        "batch",
        [{ userId: "member", planId: "PLUS" }],
        preview.requestId,
        preview.previewToken,
        expect.any(String),
      ),
    );
  });
  it("shows import failure even when custom user creation is unavailable", async () => {
    const { container } = render(
      <UserGroupManagement
        canEditRoles
        onSubscriptionRecordsImport={async () => {
          throw new Error("row 2: duplicate email");
        }}
      />,
    );
    const file = new File(["bad"], "bad.csv");
    Object.defineProperty(file, "text", { value: async () => "bad" });
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "duplicate email",
    );
  });
  it("displays persisted zero remaining quota and missing configuration distinctly", () => {
    const { rerender } = render(
      <BillingFacts
        snapshot={{
          billingProfile: {
            packageName: "custom-team",
            includedQuotaBytes: 40 * 1024 ** 3,
            pricingRuleVersion: "plan:custom",
          },
          quotaState: {
            remainingIncludedQuota: 0,
            proxyAccessState: "paused",
            suspendState: "active",
          },
          subscriptionValidFrom: "2026-10-15",
          subscriptionValidUntil: "2027-10-15",
        }}
      />,
    );
    expect(screen.getByText("custom-team")).toBeInTheDocument();
    expect(screen.getByText("40 GB")).toBeInTheDocument();
    expect(screen.getByText("0 GB")).toBeInTheDocument();
    expect(screen.getByText("paused / active")).toBeInTheDocument();
    rerender(<BillingFacts snapshot={{}} />);
    expect(screen.queryByText("0 GB")).not.toBeInTheDocument();
    expect(screen.getAllByText("未配置").length).toBeGreaterThan(1);
  });
});
