import { describe, expect, it } from "vitest";
import {
  dailyReleaseCounts,
  periodReleaseCounts,
  isReleaseCatalog,
  latestSuccess,
  latestTagAttempts,
  shanghaiDay,
} from "./release-status";
import type { ReleaseAttempt } from "./release-status";
const release = (overrides: Partial<ReleaseAttempt> = {}): ReleaseAttempt => ({
  id: "1:1:uat:daily-build-2026.10.04",
  runId: 1,
  attempt: 1,
  environment: "uat",
  tag: "daily-build-2026.10.04",
  scope: "full-uat",
  status: "success",
  workflow: "daily-main-snapshot.yaml",
  url: "https://github.com/ai-workspace-infra/platform-ops-toolkit/actions/runs/1",
  startedAt: "2026-10-03T15:30:00Z",
  completedAt: "2026-10-03T16:30:00Z",
  repositories: [],
  ...overrides,
});
describe("release evidence", () => {
  it("counts unique tags per environment and Shanghai completion day", () => {
    const rows = [
      release(),
      release({ id: "retry", attempt: 2 }),
      release({ environment: "prod", tag: "v1.0.0" }),
      release({ status: "failed", tag: "daily-build-2026.10.04-r2" }),
    ];
    expect(
      dailyReleaseCounts(rows, 2, new Date("2026-10-04T10:00:00Z")),
    ).toEqual([
      { day: "2026-10-03", uat: 0, prod: 0 },
      { day: "2026-10-04", uat: 1, prod: 1 },
    ]);
    expect(shanghaiDay("2026-10-03T15:59:59Z")).toBe("2026-10-03");
  });
  it("preserves the last accepted tag after a newer failed attempt", () => {
    const success = release();
    expect(
      latestSuccess(
        [
          success,
          release({ status: "failed", completedAt: "2026-10-04T10:00:00Z" }),
        ],
        "uat",
      ),
    ).toBe(success);
  });
  it("prefers Daily full UAT verdict over a successful child deployment", () => {
    const parent = release({ status: "failed" });
    expect(
      latestTagAttempts([
        parent,
        release({
          id: "child",
          scope: "serverless",
          startedAt: "2026-10-04T00:00:00Z",
        }),
      ]),
    ).toEqual([parent]);
  });
  it("does not admit arbitrary execution URLs or mutable refs", () => {
    const catalog = {
      schemaVersion: 1,
      source: "github-actions",
      updatedAt: "2026-10-04T00:00:00Z",
      timezone: "Asia/Shanghai",
      coverage: {
        since: "2026-10-01T00:00:00Z",
        refreshDays: 30,
        prod: "serverless",
      },
      gaps: [],
      releases: [release()],
    };
    expect(isReleaseCatalog(catalog)).toBe(true);
    expect(
      isReleaseCatalog({
        ...catalog,
        releases: [release({ url: "javascript:alert(1)" })],
      }),
    ).toBe(false);
    expect(
      isReleaseCatalog({ ...catalog, releases: [release({ tag: "main" })] }),
    ).toBe(false);
  });
});

it("deduplicates tags across the selected week/year, with Monday week boundaries", () => {
  const rows = [
    release(),
    release({ id: "next", completedAt: "2026-10-04T17:00:00Z" }),
    release({
      tag: "daily-build-2026.10.05-r2",
      completedAt: "2026-10-05T00:00:00Z",
    }),
  ];
  const weeks = periodReleaseCounts(
    rows,
    "week",
    new Date("2026-10-05T10:00:00Z"),
  );
  expect(weeks.at(-2)?.uat).toBe(1);
  expect(weeks.at(-1)?.uat).toBe(2);
  expect(
    periodReleaseCounts(rows, "year", new Date("2026-10-05T10:00:00Z")).at(-1)
      ?.uat,
  ).toBe(2);
});
