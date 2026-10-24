import { describe, it, expect } from "vitest";
import { accountSyncPresentation } from "./accountSyncPresentation";
import type { AccountPolicy, AccountUsageSummary } from "./fetchAccountUsage";

const now = Date.parse("2026-10-24T00:00:00Z");
const usage: AccountUsageSummary = {
  accountUuid: "fixture-user",
  totalBytes: 0,
  networkAccessState: "active",
  syncDelaySeconds: 0,
  lastBucketAt: null,
};
const policy: AccountPolicy = {
  accountUuid: "fixture-user",
  preferredStrategy: "ewma",
  eligibleNodeGroups: ["shared"],
  expiresAt: "2026-10-24T01:00:00Z",
};
describe("authoritative collection and policy state", () => {
  it("does not turn absent snapshots into normal/zero-second sync", () => {
    expect(accountSyncPresentation(usage, null, true, now)).toMatchObject({
      label: "策略未生成",
      tone: "warning",
      delayLabel: "暂无采集记录",
      groupsLabel: "未生成",
    });
  });
  it("keeps an unavailable policy distinct from a known absence", () => {
    expect(accountSyncPresentation(usage, undefined, false, now).label).toBe(
      "Policy unavailable",
    );
  });
  it("waits for collection even with a real policy", () => {
    expect(accountSyncPresentation(usage, policy, false, now).label).toBe(
      "Awaiting collection",
    );
  });
  it("does not call an expired policy normal", () => {
    const current = {
      ...usage,
      lastBucketAt: "2026-10-23T23:59:00Z",
      syncDelaySeconds: 60,
    };
    expect(
      accountSyncPresentation(
        current,
        { ...policy, expiresAt: "2026-10-23T23:00:00Z" },
        true,
        now,
      ).label,
    ).toBe("策略已过期");
  });
  it("preserves a verified zero-byte sample as real data", () => {
    const current = {
      ...usage,
      lastBucketAt: "2026-10-23T23:59:00Z",
      syncDelaySeconds: 60,
    };
    expect(accountSyncPresentation(current, policy, true, now)).toMatchObject({
      label: "正常",
      tone: "success",
      delayLabel: "~60 s",
    });
  });
  it("retains quota suspension ahead of missing-policy status", () => {
    expect(
      accountSyncPresentation(
        { ...usage, networkAccessReason: "quota_exhausted" },
        null,
        true,
        now,
      ),
    ).toMatchObject({ label: "额度已用尽 · 已暂停", tone: "danger" });
  });
});
