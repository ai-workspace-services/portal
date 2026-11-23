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

    expect(screen.getAllByText("额度已用尽 · 已暂停")).toHaveLength(2);
    expect(
      screen.getByText(
        "可通过升级套餐恢复；新套餐支付成功并生效后，按新额度恢复访问。配额续期或调整后也会自动恢复。",
      ),
    ).toBeInTheDocument();
  });

  it("explains one-time 5GB trial exhaustion and reactivation via subscription", () => {
    render(
      <SubscriptionStatusCard
        zh
        records={[]}
        usageSummary={{
          accountUuid: "account-trial",
          totalBytes: 5 * 1024 ** 3,
          usedBytes: 5 * 1024 ** 3,
          usagePercent: 100,
          planAssignmentStatus: "assigned",
          networkAccessState: "paused",
          networkAccessReason: "trial_exhausted",
          currentPlan: {
            planId: "TRIAL-5GB-ONCE",
            displayName: "一次性 5GB 体验",
            packageName: "trial",
            maxTrafficBytes: 5 * 1024 ** 3,
            unlimited: false,
            assigned: true,
            source: "account_entitlement",
          },
        }}
      />,
    );

    expect(screen.getAllByText("体验流量已用尽 · 已暂停")).toHaveLength(2);
    expect(
      screen.getByText(
        "5 GB 一次性体验流量已用尽，节点流量已暂停（控制台登录正常）。订阅任意付费套餐后立即恢复访问。",
      ),
    ).toBeInTheDocument();
  });

  it("explains paused mode when subscription is required", () => {
    render(
      <SubscriptionStatusCard
        zh
        records={[]}
        usageSummary={{
          accountUuid: "account-paused",
          totalBytes: 0,
          usedBytes: 0,
          usagePercent: 0,
          planAssignmentStatus: "assigned",
          networkAccessState: "paused",
          networkAccessReason: "subscription_required",
          currentPlan: {
            planId: "PAUSED",
            displayName: "暂停流量",
            packageName: "paused",
            maxTrafficBytes: 0,
            unlimited: false,
            assigned: true,
            source: "account_entitlement",
          },
        }}
      />,
    );

    expect(screen.getAllByText("暂无有效订阅 · 已暂停")).toHaveLength(2);
    expect(
      screen.getByText(
        "当前暂无有效付费订阅，节点流量已暂停（控制台登录正常）。选择套餐并完成订阅后自动开启流量。",
      ),
    ).toBeInTheDocument();
  });
});
