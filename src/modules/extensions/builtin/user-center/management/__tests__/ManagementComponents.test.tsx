import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OverviewCards from "../components/OverviewCards";
import TrendChart from "../components/TrendChart";
import PermissionMatrixEditor from "../components/PermissionMatrixEditor";
import UserGroupManagement from "../components/UserGroupManagement";

describe("Management dashboard components", () => {
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
});
