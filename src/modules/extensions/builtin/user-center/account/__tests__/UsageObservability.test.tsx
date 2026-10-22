import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UsageCard } from "../../components/xds/AccountPanels";
import {
  currentUtcMonthStartIso,
  summarizeUsageBuckets,
} from "../../lib/fetchAccountUsage";

describe("currentUtcMonthStartIso & summarizeUsageBuckets UTC boundaries", () => {
  it("computes the UTC month start regardless of local timezone offset", () => {
    const sample = new Date("2026-10-21T16:45:12.345Z");
    expect(currentUtcMonthStartIso(sample)).toBe("2026-10-01T00:00:00.000Z");

    const monthEdge = new Date("2026-03-01T00:00:00.000Z");
    expect(currentUtcMonthStartIso(monthEdge)).toBe("2026-03-01T00:00:00.000Z");
  });

  it("aggregates buckets across 1h, 24h, and UTC month-to-date windows", () => {
    const now = new Date("2026-10-21T12:00:00.000Z");
    const buckets = [
      // Before current UTC month -> excluded from all windows
      { bucketStart: "2026-09-30T23:59:00.000Z", totalBytes: 9999 },
      // Exactly at UTC month start -> included in monthToDate only
      { bucketStart: "2026-10-01T00:00:00.000Z", totalBytes: 1000 },
      // Exactly 24h ago -> included in last24Hours and monthToDate
      { bucketStart: "2026-10-20T12:00:00.000Z", totalBytes: 500 },
      // Just outside 24h window -> included in monthToDate only
      { bucketStart: "2026-10-20T11:59:59.000Z", totalBytes: 300 },
      // Exactly 1h ago -> included in last1Hour, last24Hours, and monthToDate
      { bucketStart: "2026-10-21T11:00:00.000Z", totalBytes: 200 },
      // Just outside 1h window -> included in last24Hours and monthToDate
      { bucketStart: "2026-10-21T10:59:59.000Z", totalBytes: 100 },
      // Exactly at now -> included in all three
      { bucketStart: "2026-10-21T12:00:00.000Z", totalBytes: 50 },
      // Future bucket beyond now -> excluded from all windows
      { bucketStart: "2026-10-21T12:05:00.000Z", totalBytes: 7777 },
    ];

    const summary = summarizeUsageBuckets(buckets, now);
    expect(summary).toEqual({
      last1Hour: 250,
      last24Hours: 850,
      monthToDate: 2150,
    });
  });
});

describe("UsageCard observability states", () => {
  it("1. renders dashes and error notice on query failure, never 0 B or true-zero message", () => {
    render(
      <UsageCard
        zh
        error={true}
        breakdown={{ last1Hour: 0, last24Hours: 0, monthToDate: 0 }}
        hasTraffic={false}
      />,
    );

    expect(screen.getByTestId("usage-query-error")).toHaveTextContent(
      "用量数据暂时无法加载，请稍后刷新重试",
    );
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText("0 B")).not.toBeInTheDocument();
    expect(screen.queryByText(/还没有流量数据/)).not.toBeInTheDocument();
  });

  it("2. renders dashes and loading notice when loading without data", () => {
    render(
      <UsageCard
        zh
        loading={true}
        breakdown={{ last1Hour: 0, last24Hours: 0, monthToDate: 0 }}
        hasTraffic={false}
      />,
    );

    expect(screen.getByTestId("usage-loading")).toHaveTextContent(
      "正在加载用量数据…",
    );
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText("0 B")).not.toBeInTheDocument();
    expect(screen.queryByText(/还没有流量数据/)).not.toBeInTheDocument();
  });

  it("3. renders 0 B and true-zero guidance when query succeeded and usage is genuinely zero", () => {
    render(<UsageCard zh buckets={[]} error={false} loading={false} />);

    expect(screen.getAllByText("0 B")).toHaveLength(3);
    expect(screen.getByTestId("usage-true-zero")).toHaveTextContent(
      "还没有流量数据。连接节点产生流量后，这里会按小时、24 小时和当月累计显示。",
    );
  });

  it("4. renders recorded bytes alongside a stale data notice when sync delay exceeds threshold or freshnessState is stale", () => {
    const { rerender } = render(
      <UsageCard
        zh
        breakdown={{
          last1Hour: 1024,
          last24Hours: 2048,
          monthToDate: 4096,
        }}
        hasTraffic
        syncDelaySeconds={600}
        lastBucketAt="2026-10-21T08:30:00Z"
      />,
    );

    expect(screen.getByText("1 KB")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
    expect(screen.getByText("4 KB")).toBeInTheDocument();
    expect(screen.getByTestId("usage-stale-notice")).toHaveTextContent(
      "数据同步延迟",
    );
    expect(screen.getByTestId("usage-stale-notice")).toHaveTextContent(
      "2026-10-21 08:30:00 UTC",
    );

    rerender(
      <UsageCard
        zh
        breakdown={{
          last1Hour: 1024,
          last24Hours: 2048,
          monthToDate: 4096,
        }}
        hasTraffic
        freshnessState="stale"
        lastBucketAt="2026-10-21T09:15:00Z"
      />,
    );

    expect(screen.getByText("1 KB")).toBeInTheDocument();
    expect(screen.getByTestId("usage-stale-notice")).toHaveTextContent(
      "2026-10-21 09:15:00 UTC",
    );
  });
});
