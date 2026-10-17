export type ReleaseState =
  | "success"
  | "failed"
  | "pending"
  | "skipped"
  | "unknown";
export type ReleaseEnvironment = "uat" | "prod";
export interface RepositoryRelease {
  repository: string;
  tag: string;
  sha: string;
  build: ReleaseState;
  deployment: ReleaseState;
}
export interface ReleaseAttempt {
  id: string;
  runId: number;
  attempt: number;
  environment: ReleaseEnvironment;
  tag: string;
  scope: string;
  status: ReleaseState;
  workflow: string;
  url: string;
  startedAt: string;
  completedAt: string | null;
  repositories: RepositoryRelease[];
}
export interface ReleaseCatalog {
  schemaVersion: 1;
  source: "github-actions";
  updatedAt: string;
  timezone: "Asia/Shanghai";
  coverage: { since: string; refreshDays: number; prod: string };
  gaps: { runId: number; workflow: string; status: string; reason: string }[];
  releases: ReleaseAttempt[];
}
const STATES = new Set(["success", "failed", "pending", "skipped", "unknown"]);
const TAG =
  /^(?:(?:uat-)?daily-build-\d{4}\.\d{2}\.\d{2}(?:-r[1-9]\d*)?|v[0-9][A-Za-z0-9._-]*)$/;
const REPO = /^ai-workspace-(?:infra|lab|services|xstream)\/[A-Za-z0-9._-]+$/;
const validDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
export function isReleaseCatalog(value: unknown): value is ReleaseCatalog {
  if (!value || typeof value !== "object") return false;
  const c = value as ReleaseCatalog;
  return (
    c.schemaVersion === 1 &&
    c.source === "github-actions" &&
    c.timezone === "Asia/Shanghai" &&
    validDate(c.updatedAt) &&
    !!c.coverage &&
    validDate(c.coverage.since) &&
    typeof c.coverage.prod === "string" &&
    Number.isInteger(c.coverage.refreshDays) &&
    Array.isArray(c.gaps) &&
    c.gaps.every(
      (g) =>
        g &&
        Number.isSafeInteger(g.runId) &&
        typeof g.reason === "string" &&
        typeof g.workflow === "string" &&
        typeof g.status === "string",
    ) &&
    Array.isArray(c.releases) &&
    c.releases.every(
      (r) =>
        r &&
        typeof r.id === "string" &&
        Number.isSafeInteger(r.runId) &&
        Number.isInteger(r.attempt) &&
        (r.environment === "uat" || r.environment === "prod") &&
        typeof r.tag === "string" &&
        TAG.test(r.tag) &&
        typeof r.scope === "string" &&
        typeof r.workflow === "string" &&
        STATES.has(r.status) &&
        validDate(r.startedAt) &&
        (r.completedAt === null || validDate(r.completedAt)) &&
        r.url ===
          `https://github.com/ai-workspace-infra/platform-ops-toolkit/actions/runs/${r.runId}` &&
        Array.isArray(r.repositories) &&
        r.repositories.every(
          (p) =>
            p &&
            typeof p.repository === "string" &&
            REPO.test(p.repository) &&
            TAG.test(p.tag) &&
            typeof p.sha === "string" &&
            /^(?:[a-f0-9]{40})?$/.test(p.sha) &&
            STATES.has(p.build) &&
            STATES.has(p.deployment),
        ),
    )
  );
}
export function shanghaiDay(value: string): string {
  const d = new Date(Date.parse(value) + 8 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}
export function latestSuccess(
  releases: ReleaseAttempt[],
  environment: ReleaseEnvironment,
): ReleaseAttempt | undefined {
  return releases
    .filter(
      (r) =>
        r.environment === environment &&
        (environment !== "uat" || r.scope === "full-uat") &&
        r.status === "success" &&
        r.completedAt,
    )
    .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!))[0];
}
export function dailyReleaseCounts(
  releases: ReleaseAttempt[],
  days: number,
  now = new Date(),
): { day: string; uat: number; prod: number }[] {
  const end = shanghaiDay(now.toISOString());
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(
      Date.parse(`${end}T00:00:00Z`) - (days - i - 1) * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    const accepted = releases.filter(
      (r) =>
        r.status === "success" &&
        (r.environment !== "uat" || r.scope === "full-uat") &&
        r.completedAt &&
        shanghaiDay(r.completedAt) === day,
    );
    return {
      day,
      uat: new Set(
        accepted.filter((r) => r.environment === "uat").map((r) => r.tag),
      ).size,
      prod: new Set(
        accepted.filter((r) => r.environment === "prod").map((r) => r.tag),
      ).size,
    };
  });
}
export function latestTagAttempts(
  releases: ReleaseAttempt[],
): ReleaseAttempt[] {
  const unique = new Map<string, ReleaseAttempt>();
  for (const r of [...releases].sort(
    (a, b) =>
      Date.parse(b.completedAt ?? b.startedAt) -
        Date.parse(a.completedAt ?? a.startedAt) || b.attempt - a.attempt,
  )) {
    const key = `${r.environment}:${r.tag}`;
    // Full Daily UAT is the authority when the same tag also has child serverless runs.
    const old = unique.get(key);
    if (
      !old ||
      (r.environment === "uat" &&
        r.scope === "full-uat" &&
        old.scope !== "full-uat")
    )
      unique.set(key, r);
  }
  return [...unique.values()].sort(
    (a, b) =>
      Date.parse(b.completedAt ?? b.startedAt) -
      Date.parse(a.completedAt ?? a.startedAt),
  );
}
export const RELEASE_LABELS: Record<ReleaseState, string> = {
  success: "成功",
  failed: "失败",
  pending: "进行中",
  skipped: "跳过",
  unknown: "缺少证据",
};

export type ReleasePeriod = "day" | "week" | "year";
export function periodReleaseCounts(
  releases: ReleaseAttempt[],
  period: ReleasePeriod,
  now = new Date(),
): { day: string; label: string; end: string; uat: number; prod: number }[] {
  const anchor = new Date(`${shanghaiDay(now.toISOString())}T00:00:00Z`);
  const count = period === "day" ? 30 : period === "week" ? 12 : 5;
  if (period === "week")
    anchor.setUTCDate(anchor.getUTCDate() - ((anchor.getUTCDay() + 6) % 7));
  if (period === "year") {
    anchor.setUTCMonth(0, 1);
  }
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(anchor);
    if (period === "year")
      start.setUTCFullYear(start.getUTCFullYear() - count + i + 1);
    else
      start.setUTCDate(
        start.getUTCDate() - (count - i - 1) * (period === "week" ? 7 : 1),
      );
    const end = new Date(start);
    if (period === "year") end.setUTCFullYear(end.getUTCFullYear() + 1);
    else end.setUTCDate(end.getUTCDate() + (period === "week" ? 7 : 1));
    const day = start.toISOString().slice(0, 10);
    const endDay = end.toISOString().slice(0, 10);
    const accepted = releases.filter(
      (r) =>
        r.status === "success" &&
        (r.environment !== "uat" || r.scope === "full-uat") &&
        r.completedAt &&
        shanghaiDay(r.completedAt) >= day &&
        shanghaiDay(r.completedAt) < endDay,
    );
    return {
      day,
      end: endDay,
      label:
        period === "year"
          ? day.slice(0, 4)
          : period === "week"
            ? `${day.slice(5)} 周`
            : day.slice(5),
      uat: new Set(
        accepted.filter((r) => r.environment === "uat").map((r) => r.tag),
      ).size,
      prod: new Set(
        accepted.filter((r) => r.environment === "prod").map((r) => r.tag),
      ).size,
    };
  });
}
