import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuotaCard } from "./AccountPanels";
import { VlessConnectionCard } from "./AccountPanels";
import type { VlessNode } from "../../lib/vless";

const { toDataURLMock } = vi.hoisted(() => ({
  toDataURLMock: vi.fn(() => Promise.resolve("data:image/png;base64,test")),
}));

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("qrcode", () => ({
  toDataURL: toDataURLMock,
}));

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

  it("shows the catalog Free maximum as reference without assigning it to a legacy account", () => {
    render(
      <QuotaCard
        zh
        usage={{
          accountUuid: "account-default",
          totalBytes: 0,
          includedQuotaBytes: 0,
          remainingIncludedQuota: 0,
          usedBytes: 0,
          usagePercent: 0,
          planAssignmentStatus: "unassigned",
          defaultPlan: {
            planId: "FREE",
            displayName: "Free",
            packageName: "free",
            maxTrafficBytes: 5 * 1024 * 1024 * 1024,
            unlimited: false,
            assigned: false,
            source: "local_catalog_default",
          },
        }}
      />,
    );

    expect(
      screen.getByText("套餐 Free（默认参考） · 最大流量 5 GB / 月"),
    ).toBeInTheDocument();
    expect(screen.getByText("未分配 · 5 GB 默认额度参考")).toBeInTheDocument();
    expect(screen.queryByText("0 B / 5 GB")).not.toBeInTheDocument();
  });

  it("shows an assigned Plus plan's maximum from the API", () => {
    render(
      <QuotaCard
        zh
        usage={{
          accountUuid: "account-plus",
          totalBytes: 1024 * 1024 * 1024,
          includedQuotaBytes: 20 * 1024 * 1024 * 1024,
          remainingIncludedQuota: 19 * 1024 * 1024 * 1024,
          usedBytes: 1024 * 1024 * 1024,
          usagePercent: 5,
          planAssignmentStatus: "assigned",
          currentPlan: {
            planId: "PLUS",
            displayName: "Plus",
            packageName: "plus",
            maxTrafficBytes: 20 * 1024 * 1024 * 1024,
            catalogMaxTrafficBytes: 20 * 1024 * 1024 * 1024,
            quotaCycle: "natural_month",
            unlimited: false,
            assigned: true,
            source: "account_entitlement",
          },
        }}
      />,
    );

    expect(
      screen.getByText("套餐 Plus · 最大流量 20 GB / 月"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 GB / 20 GB")).toBeInTheDocument();
  });

  it("shows unlimited internal plans without rendering a zero-byte cap", () => {
    render(
      <QuotaCard
        zh
        usage={{
          accountUuid: "account-beta",
          totalBytes: 1024,
          includedQuotaBytes: 0,
          remainingIncludedQuota: 0,
          usedBytes: 1024,
          usagePercent: 0,
          planAssignmentStatus: "assigned",
          currentPlan: {
            planId: "UNLIMITED-BETA",
            displayName: "无限制（内测）",
            packageName: "unlimited-beta",
            maxTrafficBytes: 0,
            catalogMaxTrafficBytes: 0,
            quotaCycle: "none",
            unlimited: true,
            assigned: true,
            source: "account_entitlement",
          },
        }}
      />,
    );

    expect(screen.getAllByText(/无限制/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/0 B/)).not.toBeInTheDocument();
  });

  it("builds the subscription with the reported regional entry", async () => {
    render(
      <VlessConnectionCard
        proxyUuid="11111111-1111-4111-8111-111111111111"
        nodes={[
          {
            name: "US-XHTTP",
            address: "us.entry.example",
            region: "us-ca",
            pool_count: 1,
            open_to_users: true,
            port: 443,
            transport: "xhttp",
            uri_scheme_xhttp:
              "vless://${UUID}@${DOMAIN}:443?type=xhttp&sni=${SNI}#${TAG}",
          },
        ]}
        zh
      />,
    );

    expect(screen.getByText("VLESS 连接")).toBeInTheDocument();
    await waitFor(() => {
      expect(toDataURLMock).toHaveBeenCalledWith(
        expect.stringContaining("@us.entry.example"),
        expect.any(Object),
      );
    });
  });
});

describe("VlessConnectionCard region selector", () => {
  const regionalNode = (shortCode: string): VlessNode => ({
    name: `${shortCode}-XHTTP`,
    address: `${shortCode.toLowerCase()}.entry.example`,
    region: shortCode.toLowerCase(),
    pool_count: 1,
    open_to_users: true,
    port: 443,
    transport: "xhttp",
    uri_scheme_xhttp:
      "vless://${UUID}@${DOMAIN}:443?type=xhttp&sni=${SNI}#${TAG}",
  });

  const renderWithRegions = (shortCodes: string[]) =>
    render(
      <VlessConnectionCard
        proxyUuid="11111111-1111-4111-8111-111111111111"
        nodes={shortCodes.map(regionalNode)}
        zh
      />,
    );

  it("uses a dropdown once a fourth region would wrap the pill row", () => {
    renderWithRegions(["JP", "US", "HK", "PH"]);

    const select = screen.getByRole("combobox", { name: "选择节点区域" });
    expect(select).toBeInTheDocument();
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["HK 区域", "JP 区域", "PH 区域", "US 区域"]);
    // The pills and the select are alternatives, never both at once.
    expect(screen.queryByRole("button", { name: "HK 区域" })).toBeNull();
  });

  it("keeps pills while the regions still fit on one row", () => {
    renderWithRegions(["JP", "US", "HK"]);

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("button", { name: "HK 区域" })).toBeInTheDocument();
  });
});
