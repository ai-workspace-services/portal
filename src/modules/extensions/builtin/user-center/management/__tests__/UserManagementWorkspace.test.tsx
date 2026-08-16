import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import UserManagementWorkspace from "../components/UserManagementWorkspace";

const users = [
  {
    id: "a2f3b6e0-3c7d-4e9f-8a1b-2c3d4e5f6a7b",
    email: "admin@svc.plus",
    username: "Admin",
    role: "admin",
    groups: ["Admin"],
    active: true,
    created_at: "2026-08-16T08:25:00.000Z",
  },
  {
    id: "b8e6d1a9-7f2c-4d6e-a3b7-9f1c2d3e4f5a",
    email: "inactive@svc.plus",
    username: "Inactive",
    role: "user",
    active: false,
  },
];

describe("UserManagementWorkspace", () => {
  it("filters users and opens the matching details inspector", () => {
    render(<UserManagementWorkspace users={users} canEditRoles />);

    fireEvent.change(screen.getByPlaceholderText(/搜索用户/), {
      target: { value: "inactive" },
    });

    expect(screen.getByText("inactive@svc.plus")).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "选择 admin@svc.plus" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("inactive@svc.plus"));
    expect(screen.getAllByText("inactive@svc.plus")).toHaveLength(3);
  });

  it("uses existing callbacks for quick actions", () => {
    const onPauseUser = vi.fn();
    const onRenewUuid = vi.fn();
    render(
      <UserManagementWorkspace
        users={users}
        canEditRoles
        onPauseUser={onPauseUser}
        onRenewUuid={onRenewUuid}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "禁用用户" }));
    fireEvent.click(screen.getByRole("button", { name: "重置 UUID" }));

    expect(onPauseUser).toHaveBeenCalledWith(users[0].id);
    expect(onRenewUuid).toHaveBeenCalledWith(users[0].id);
  });

  it("supports closing and reopening the inspector", () => {
    render(<UserManagementWorkspace users={users} canEditRoles />);

    fireEvent.click(screen.getByRole("button", { name: "关闭用户详情" }));
    expect(
      screen.getByText("从用户列表选择一项以查看详情"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("admin@svc.plus"));
    expect(
      screen.getByRole("heading", { name: "用户详情" }),
    ).toBeInTheDocument();
  });
});
