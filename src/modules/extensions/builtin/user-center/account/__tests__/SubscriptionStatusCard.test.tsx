import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SubscriptionStatusCard from "../SubscriptionStatusCard";

describe("SubscriptionStatusCard", () => {
  it("shows the assigned plan, quota, validity and retained history", () => {
    render(
      <SubscriptionStatusCard
        zh
        records={[
          {
            id: "subscription-1",
            status: "active",
            meta: { expiresAt: "2030-05-01T00:00:00.000Z" },
          },
          { id: "subscription-0", status: "expired" },
        ]}
        usageSummary={{
          accountUuid: "account-1",
          totalBytes: 2 * 1024 ** 3,
          usedBytes: 2 * 1024 ** 3,
          usagePercent: 10,
          periodEnd: "2030-04-01T00:00:00.000Z",
          planAssignmentStatus: "assigned",
          currentPlan: {
            planId: "PLUS-20GB",
            displayName: "Plus 20GB",
            packageName: "plus",
            maxTrafficBytes: 20 * 1024 ** 3,
            unlimited: false,
            assigned: true,
            source: "account_entitlement",
          },
        }}
      />,
    );

    expect(screen.getByText("我的订阅")).toBeInTheDocument();
    expect(screen.getByText("Plus 20GB")).toBeInTheDocument();
    expect(screen.getAllByText(/20 GB/).length).toBeGreaterThan(0);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("正常")).toBeInTheDocument();
  });

  it("makes quota exhaustion and disconnect explicit", () => {
    render(
      <SubscriptionStatusCard
        zh
        records={[]}
        usageSummary={{
          accountUuid: "account-1",
          totalBytes: 5 * 1024 ** 3,
          usedBytes: 5 * 1024 ** 3,
          usagePercent: 100,
          planAssignmentStatus: "assigned",
          networkAccessState: "paused",
          networkAccessReason: "quota_exhausted",
          currentPlan: {
            planId: "FREE-5GB",
            displayName: "Free 5GB",
            packageName: "free",
            maxTrafficBytes: 5 * 1024 ** 3,
            unlimited: false,
            assigned: true,
            source: "account_entitlement",
          },
        }}
      />,
    );

    expect(screen.getAllByText("额度已用尽 · 已断流")).toHaveLength(2);
    expect(
      screen.getByText("已停止配置同步并断开代理连接；恢复额度后可重新连接。"),
    ).toBeInTheDocument();
  });
});
