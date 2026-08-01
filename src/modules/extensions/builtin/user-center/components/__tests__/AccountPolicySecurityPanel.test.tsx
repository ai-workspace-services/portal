import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AccountPolicySecurityPanel from "../AccountPolicySecurityPanel";

vi.mock("swr", () => ({
  default: vi.fn(() => ({
    data: {
      preferredStrategy: "ewma",
      eligibleNodeGroups: ["hk-premium"],
      authState: "mfa",
      degradeMode: "safe",
    },
    error: undefined,
    isLoading: false,
  })),
}));

vi.mock("../../lib/fetchAccountUsage", () => ({
  fetchAccountPolicy: vi.fn(),
}));

describe("AccountPolicySecurityPanel", () => {
  it("separates MFA status from the authoritative policy snapshot", () => {
    render(
      <AccountPolicySecurityPanel mfaEnabled mfaPending={false} canManageMfa />,
    );

    expect(screen.getByText("已启用")).toBeInTheDocument();
    expect(screen.getByText("ewma")).toBeInTheDocument();
    expect(screen.getByText("hk-premium")).toBeInTheDocument();
    expect(screen.getByText("mfa")).toBeInTheDocument();
    expect(screen.getByText("safe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /管理 MFA/ })).toHaveAttribute(
      "href",
      "/panel/account?setupMfa=1",
    );
  });
});
