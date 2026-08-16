import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AccountGettingStarted from "../AccountGettingStarted";
import type { User } from "@lib/userStore";

const baseUser = {
  id: "user-1",
  uuid: "user-1",
  proxyUuid: "proxy-1",
  email: "member@svc.plus",
  username: "Member",
  mfaEnabled: true,
  mfaPending: false,
  emailVerified: true,
  passwordSet: true,
  role: "user",
  groups: [],
  permissions: [],
  isUser: true,
  isOperator: false,
  isAdmin: false,
  isReadOnly: false,
} satisfies User;

describe("AccountGettingStarted", () => {
  it("derives account and connection readiness from the current user", () => {
    render(<AccountGettingStarted user={baseUser} isReadOnlyRole={false} />);

    expect(screen.getByText("开始使用")).toBeInTheDocument();
    expect(screen.getByText("已完成")).toBeInTheDocument();
    expect(screen.getByText("可以连接")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "查看 VLESS 二维码" }),
    ).toHaveAttribute("href", "#connections");
  });

  it("shows a safe setup state when credentials are not ready", () => {
    render(
      <AccountGettingStarted
        user={{
          ...baseUser,
          emailVerified: false,
          mfaEnabled: false,
          proxyUuid: "",
        }}
        isReadOnlyRole={false}
      />,
    );

    expect(screen.getByText("需要设置")).toBeInTheDocument();
    expect(screen.getByText("等待配置")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "完成安全设置" })).toHaveAttribute(
      "href",
      "/panel/account?setupMfa=1",
    );
  });
});
