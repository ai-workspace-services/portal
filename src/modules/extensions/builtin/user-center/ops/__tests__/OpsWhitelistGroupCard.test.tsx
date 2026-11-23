import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OpsWhitelistGroupCard from "../components/OpsWhitelistGroupCard";

const fixture = vi.hoisted(() => ({
  groups: [
    {
      groupId: "WHITELIST-FREE",
      displayName: "白名单免费体验组",
      monthlyQuotaBytes: 5 * 1024 ** 3,
      allowedPools: ["Media-Pool"],
      active: true,
      description: "首批白名单免费组",
      members: [
        {
          userId: "u-1",
          email: "member1@example.com",
          remainingIncludedQuota: 4 * 1024 ** 3,
          includedQuotaBytes: 5 * 1024 ** 3,
          proxyAccessState: "active",
        },
      ],
    },
  ],
  mutate: vi.fn(),
}));

vi.mock("swr", () => ({
  default: () => ({ data: { groups: fixture.groups }, mutate: fixture.mutate }),
}));

vi.mock("@lib/userStore", () => ({
  useUserStore: (select: (s: unknown) => unknown) =>
    select({ user: { isRoot: true } }),
}));

beforeEach(() => {
  fixture.mutate.mockResolvedValue({ groups: fixture.groups });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ group: fixture.groups[0] }),
    }),
  );
});

describe("OpsWhitelistGroupCard", () => {
  it("updates configurable monthly quota and allowed pools", async () => {
    render(<OpsWhitelistGroupCard />);
    expect(screen.getByText("member1@example.com")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("每月免费额度（GB/月）"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText("配置修改原因"), {
      target: { value: "raise monthly whitelist allowance" },
    });
    fireEvent.click(screen.getByText("保存白名单配额与池规则"));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, opts] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/billing/whitelist-groups/WHITELIST-FREE");
    expect(opts?.method).toBe("PUT");
    expect(JSON.parse(String(opts?.body))).toMatchObject({
      monthlyQuotaBytes: 8 * 1024 ** 3,
      allowedPools: ["Media-Pool"],
      reason: "raise monthly whitelist allowance",
    });
  });

  it("adds and removes whitelist group members via auth-bounded API", async () => {
    render(<OpsWhitelistGroupCard />);
    fireEvent.change(screen.getByLabelText("新增白名单成员邮箱"), {
      target: { value: "new-whitelist@example.com" },
    });
    fireEvent.change(screen.getByLabelText("白名单成员变更原因"), {
      target: { value: "grant review access" },
    });
    fireEvent.click(screen.getByText("添加白名单成员"));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [postUrl, postOpts] = vi.mocked(fetch).mock.calls[0];
    expect(String(postUrl)).toContain(
      "/billing/whitelist-groups/WHITELIST-FREE/members",
    );
    expect(postOpts?.method).toBe("POST");
    expect(JSON.parse(String(postOpts?.body))).toEqual({
      email: "new-whitelist@example.com",
      reason: "grant review access",
    });

    vi.mocked(fetch).mockClear();
    fireEvent.click(screen.getByLabelText("移除 member1@example.com"));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [delUrl, delOpts] = vi.mocked(fetch).mock.calls[0];
    expect(String(delUrl)).toContain(
      "/billing/whitelist-groups/WHITELIST-FREE/members/u-1?reason=",
    );
    expect(delOpts?.method).toBe("DELETE");
  });
});
