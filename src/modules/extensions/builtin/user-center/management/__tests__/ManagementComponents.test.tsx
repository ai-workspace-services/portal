import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OverviewCards from "../components/OverviewCards";
import TrendChart from "../components/TrendChart";
import PermissionMatrixEditor from "../components/PermissionMatrixEditor";
import UserGroupManagement, {
  MONTHLY_FREE_QUOTA_LIMIT_GROUP,
  MONTHLY_PLUS_QUOTA_LIMIT_GROUP,
  MONTHLY_UNLIMITED_BETA_GROUP,
} from "../components/UserGroupManagement";

describe("Management dashboard components", () => {
  it("renders real counts including zero without replacing them with placeholders", () => {
    const { container } = render(
      <OverviewCards
        overview={{
          totalUsers: 24,
          subscribedUsers: 0,
          activeUsers: 23,
          newUsersLast24h: 0,
        }}
      />,
    );
    expect(
      Array.from(
        container.querySelectorAll("dd"),
        (element) => element.textContent,
      ),
    ).toEqual(["24", "0", "23", "0"]);
  });

  it("shows a statistics error and lets the user retry without inventing counts", () => {
    const retry = vi.fn();
    const { container } = render(
      <OverviewCards errorMessage="请求失败" onRetry={retry} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("用户统计加载失败");
    expect(
      Array.from(
        container.querySelectorAll("dd"),
        (element) => element.textContent,
      ),
    ).toEqual(["—", "—", "—", "—"]);
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("renders loading state for overview cards", () => {
    const { container } = render(<OverviewCards isLoading />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("supports switching trend granularity", () => {
    const series = {
      daily: [
        { period: "2025-03-01", total: 120, active: 80, subscribed: 40 },
        { period: "2025-03-02", total: 140, active: 90, subscribed: 50 },
      ],
      weekly: [
        { period: "2025-W09", total: 900, active: 600, subscribed: 320 },
      ],
    };

    render(<TrendChart series={series} />);

    expect(screen.queryByText("2025-03-01")).not.toBeVisible();

    const detailsButton = screen.getByRole("button", { name: "展开明细" });
    expect(detailsButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(detailsButton);

    expect(screen.getByText("2025-03-01")).toBeVisible();
    expect(detailsButton).toHaveAttribute("aria-expanded", "true");

    const weeklyButton = screen.getByRole("button", { name: "按周" });
    fireEvent.click(weeklyButton);

    expect(screen.getByText("2025-W09")).toBeVisible();
  });

  it("disables permission matrix editing when read only", () => {
    const matrix = {
      registration: { admin: true, operator: false, user: false },
    };

    render(
      <PermissionMatrixEditor
        matrix={matrix}
        roles={["admin", "operator", "user"]}
        canEdit={false}
      />,
    );

    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeDisabled();
    }
    expect(
      screen.queryByRole("button", { name: /保存/ }),
    ).not.toBeInTheDocument();
  });

  it("flags pending role updates in user group management", () => {
    const handleRoleChange = vi.fn();
    const users = [
      {
        id: "1",
        email: "admin@example.com",
        username: "admin",
        role: "admin",
        active: true,
      },
      {
        id: "2",
        email: "operator@example.com",
        role: "operator",
        active: false,
      },
    ];

    render(
      <UserGroupManagement
        users={users}
        canEditRoles
        pendingUserIds={new Set(["1"])}
        onRoleChange={handleRoleChange}
      />,
    );

    const pendingSelect = screen.getAllByRole("combobox")[0];
    expect(pendingSelect).toBeDisabled();
    expect(screen.getByText("更新中…")).toBeInTheDocument();

    const editableSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(editableSelect, { target: { value: "admin" } });
    expect(handleRoleChange).toHaveBeenCalledWith("2", "admin");
  });

  it("toggles a segment tag and preserves the rest of the user's groups", () => {
    const handleGroupsChange = vi.fn();
    const users = [
      {
        id: "1",
        email: "user@example.com",
        role: "user",
        groups: ["segment:registered", "Admin"],
      },
    ];

    render(
      <UserGroupManagement
        users={users}
        canEditRoles
        onGroupsChange={handleGroupsChange}
      />,
    );

    // 已有的自定义分组("Admin")照常展示，不被四个建议标签吞掉。
    expect(screen.getByText("Admin")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "订阅用户" }));
    expect(handleGroupsChange).toHaveBeenCalledWith("1", [
      "segment:registered",
      "Admin",
      "segment:subscribed",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "注册用户" }));
    expect(handleGroupsChange).toHaveBeenCalledWith("1", ["Admin"]);
  });

  it("disables segment tag buttons while a groups update is pending", () => {
    const users = [
      { id: "1", email: "user@example.com", role: "user", groups: [] },
    ];

    render(
      <UserGroupManagement
        users={users}
        canEditRoles
        onGroupsChange={vi.fn()}
        pendingGroupUserIds={new Set(["1"])}
      />,
    );

    expect(screen.getByRole("button", { name: "注册用户" })).toBeDisabled();
    expect(screen.getByText("更新中…")).toBeInTheDocument();
  });

  it("shows usernames and treats missing active flags as enabled", () => {
    render(
      <UserGroupManagement
        users={[
          {
            id: "1",
            email: "default-active@example.com",
            username: "defaultActive",
            role: "user",
          },
        ]}
        canEditRoles
      />,
    );

    expect(screen.getByText("用户名")).toBeInTheDocument();
    expect(screen.getByText("defaultActive")).toBeInTheDocument();
    expect(screen.getByText("活跃")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(screen.queryByText("已暂停")).not.toBeInTheDocument();
  });

  it("falls back to email when username is absent", () => {
    render(
      <UserGroupManagement
        users={[
          {
            id: "1",
            email: "fallback@example.com",
            role: "user",
            active: true,
          },
        ]}
        canEditRoles
      />,
    );

    expect(screen.getAllByText("fallback@example.com")).toHaveLength(2);
    expect(screen.getByText("活跃")).toBeInTheDocument();
  });

  it("previews a single plan change with reason, dates, usage and pause impact", async () => {
    const onPlanGroupPreview = vi.fn(async () => ({
      requestId: "request-single",
      previewToken: "preview-single",
      expiresAt: "2026-09-28T12:10:00Z",
      changes: [
        {
          userId: "1",
          planId: "PLUS",
          usedBytesPreserved: 6 * 1024 ** 3,
          remainingIncludedQuota: 14 * 1024 ** 3,
          configurationSyncWillPause: false,
        },
      ],
    }));
    const onPlanGroupApply = vi.fn(async () => undefined);

    render(
      <UserGroupManagement
        users={[
          {
            id: "1",
            email: "free@example.com",
            groups: ["Admin", MONTHLY_FREE_QUOTA_LIMIT_GROUP],
            subscriptionValidFrom: "2026-09-01T00:00:00Z",
            subscriptionValidUntil: "2026-10-31T00:00:00Z",
          },
        ]}
        canEditRoles
        onPlanGroupPreview={onPlanGroupPreview}
        onPlanGroupApply={onPlanGroupApply}
      />,
    );

    const quotaGroup = screen.getByRole("combobox", {
      name: "月度限流分组 free@example.com",
    });
    expect(
      screen.getByRole("option", { name: "不参与月度限流" }),
    ).toBeDisabled();
    fireEvent.change(quotaGroup, {
      target: { value: MONTHLY_PLUS_QUOTA_LIMIT_GROUP },
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("变更理由（必填）"), {
      target: { value: "客服工单 #42" },
    });
    fireEvent.change(screen.getByLabelText("有效期开始（可选）"), {
      target: { value: "2026-09-01" },
    });
    fireEvent.change(screen.getByLabelText("有效期结束（可选）"), {
      target: { value: "2026-10-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成预览" }));

    await waitFor(() =>
      expect(onPlanGroupPreview).toHaveBeenCalledWith(
        "single",
        [
          {
            userId: "1",
            planId: "PLUS",
            validFrom: "2026-09-01",
            validUntil: "2026-10-31",
          },
        ],
        "客服工单 #42",
      ),
    );
    expect(
      await screen.findByText(/本期已用保留 6 GiB · 新剩余额度 14 GiB/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("变更后不会因额度耗尽暂停配置同步"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认并应用" }));
    await waitFor(() =>
      expect(onPlanGroupApply).toHaveBeenCalledWith(
        "single",
        [
          {
            userId: "1",
            planId: "PLUS",
            validFrom: "2026-09-01",
            validUntil: "2026-10-31",
          },
        ],
        "request-single",
        "preview-single",
        "客服工单 #42",
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("previews and confirms batch Unlimited Beta changes with optional validity", async () => {
    const onPlanGroupPreview = vi.fn(async () => ({
      requestId: "request-batch",
      previewToken: "preview-batch",
      expiresAt: "2026-09-28T12:10:00Z",
      changes: [
        {
          userId: "1",
          planId: "UNLIMITED-BETA",
          usedBytesPreserved: 6 * 1024 ** 3,
          remainingIncludedQuota: 0,
          configurationSyncWillPause: false,
        },
        {
          userId: "2",
          planId: "UNLIMITED-BETA",
          usedBytesPreserved: 1 * 1024 ** 3,
          remainingIncludedQuota: 0,
          configurationSyncWillPause: false,
        },
      ],
    }));
    const onPlanGroupApply = vi.fn(async () => undefined);
    render(
      <UserGroupManagement
        users={[
          {
            id: "1",
            email: "one@example.com",
            groups: ["Custom", MONTHLY_FREE_QUOTA_LIMIT_GROUP],
          },
          {
            id: "2",
            email: "two@example.com",
            groups: [MONTHLY_PLUS_QUOTA_LIMIT_GROUP],
          },
        ]}
        canEditRoles
        onPlanGroupPreview={onPlanGroupPreview}
        onPlanGroupApply={onPlanGroupApply}
      />,
    );

    fireEvent.click(screen.getByLabelText("选择月度限流用户 one@example.com"));
    fireEvent.click(screen.getByLabelText("选择月度限流用户 two@example.com"));
    fireEvent.change(screen.getByLabelText("批量修改月度限流分组"), {
      target: { value: MONTHLY_UNLIMITED_BETA_GROUP },
    });
    fireEvent.click(screen.getByRole("button", { name: "预览并批量修改套餐" }));
    fireEvent.change(screen.getByLabelText("变更理由（必填）"), {
      target: { value: "内部 Beta 测试" },
    });
    fireEvent.change(screen.getByLabelText("有效期结束（可选）"), {
      target: { value: "2026-12-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成预览" }));

    await waitFor(() =>
      expect(onPlanGroupPreview).toHaveBeenCalledWith(
        "batch",
        [
          { userId: "1", planId: "UNLIMITED-BETA", validUntil: "2026-12-31" },
          { userId: "2", planId: "UNLIMITED-BETA", validUntil: "2026-12-31" },
        ],
        "内部 Beta 测试",
      ),
    );
    expect(
      await screen.findAllByText("变更后不会因额度耗尽暂停配置同步"),
    ).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "确认并应用" }));
    await waitFor(() =>
      expect(onPlanGroupApply).toHaveBeenCalledWith(
        "batch",
        [
          { userId: "1", planId: "UNLIMITED-BETA", validUntil: "2026-12-31" },
          { userId: "2", planId: "UNLIMITED-BETA", validUntil: "2026-12-31" },
        ],
        "request-batch",
        "preview-batch",
        "内部 Beta 测试",
      ),
    );
  });

  it("routes validity-only saves through the audited preview flow", async () => {
    const onPlanGroupPreview = vi.fn(async () => ({
      requestId: "request-validity",
      previewToken: "preview-validity",
      expiresAt: "2026-09-28T12:10:00Z",
      changes: [
        {
          userId: "1",
          planId: "PLUS",
          usedBytesPreserved: 0,
          remainingIncludedQuota: 0,
          configurationSyncWillPause: false,
        },
      ],
    }));
    const onPlanGroupApply = vi.fn(async () => undefined);
    render(
      <UserGroupManagement
        users={[
          {
            id: "1",
            email: "plus@example.com",
            groups: [
              "segment:subscribed",
              "segment:custom",
              MONTHLY_PLUS_QUOTA_LIMIT_GROUP,
            ],
          },
        ]}
        canEditRoles
        onPlanGroupPreview={onPlanGroupPreview}
        onPlanGroupApply={onPlanGroupApply}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "保存有效期" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/仅更新有效期，套餐和额度保持不变/),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("变更理由（必填）"), {
      target: { value: "修正订阅期限" },
    });
    fireEvent.change(screen.getByLabelText("有效期结束（可选）"), {
      target: { value: "2026-12-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成预览" }));

    await waitFor(() =>
      expect(onPlanGroupPreview).toHaveBeenCalledWith(
        "single",
        [
          {
            userId: "1",
            groups: [
              "segment:subscribed",
              "segment:custom",
              MONTHLY_PLUS_QUOTA_LIMIT_GROUP,
            ],
            validFrom: null,
            validUntil: "2026-12-31",
          },
        ],
        "修正订阅期限",
      ),
    );
    expect(
      await screen.findByText("套餐、剩余额度和配置同步状态保持不变"),
    ).toBeInTheDocument();
  });
});
