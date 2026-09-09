import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuotaCard } from "./AccountPanels";

describe("QuotaCard", () => {
  it("shows a configuration-sync pause when monthly quota is exhausted", () => {
    render(
      <QuotaCard
        zh
        usage={{
          accountUuid: "account-1",
          totalBytes: 1024,
          includedQuotaBytes: 1024,
          remainingIncludedQuota: 0,
          usedBytes: 1024,
          usagePercent: 100,
          quotaExhausted: true,
          networkAccessState: "paused",
          networkAccessReason: "quota_exhausted",
          billingProfile: { packageName: "default" },
        }}
      />,
    );

    expect(screen.getByText("额度已用尽 · 已暂停")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "本月配额已用尽，用户配置同步已暂停。配额续期或调整后会自动恢复。",
    );
  });

  it("keeps active accounts in the normal state", () => {
    render(
      <QuotaCard
        zh
        usage={{
          accountUuid: "account-2",
          totalBytes: 512,
          includedQuotaBytes: 1024,
          remainingIncludedQuota: 512,
          usedBytes: 512,
          usagePercent: 50,
          quotaExhausted: false,
          networkAccessState: "active",
          networkAccessReason: "",
        }}
      />,
    );

    expect(screen.getByText("正常")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
