import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuotaCard } from "./AccountPanels";
import { VlessConnectionCard } from "./AccountPanels";

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

  it("shows the Free maximum for a legacy default package", () => {
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
          billingProfile: { packageName: "default", includedQuotaBytes: 0 },
        }}
      />,
    );

    expect(
      screen.getByText("套餐 default · 最大流量 5 GB / 月"),
    ).toBeInTheDocument();
    expect(screen.getByText("0 B / 5 GB")).toBeInTheDocument();
  });

  it("builds the subscription with the matching lowercase regional entry", async () => {
    render(
      <VlessConnectionCard
        proxyUuid="11111111-1111-4111-8111-111111111111"
        nodes={[
          {
            name: "US-XHTTP",
            address: "runtime-us.internal",
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
    expect(screen.getByRole("button", { name: "JP 区域" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "HK 区域" })).toBeInTheDocument();
    await waitFor(() => {
      expect(toDataURLMock).toHaveBeenCalledWith(
        expect.stringContaining("@us-xconnect.svc.plus"),
        expect.any(Object),
      );
    });
  });
});
