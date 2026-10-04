"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  GitBranch,
  RefreshCw,
  Search,
} from "lucide-react";
import Breadcrumbs from "@/app/panel/components/Breadcrumbs";
import {
  dailyReleaseCounts,
  periodReleaseCounts,
  isReleaseCatalog,
  latestSuccess,
  latestTagAttempts,
  RELEASE_LABELS,
  shanghaiDay,
} from "../lib/release-status";
import type {
  ReleaseCatalog,
  ReleaseEnvironment,
  ReleaseState,
  ReleasePeriod,
} from "../lib/release-status";

const WORKFLOW_URL =
  "https://github.com/ai-workspace-infra/platform-ops-toolkit/actions/workflows/daily-main-snapshot.yaml";
const COLORS: Record<ReleaseState, string> = {
  success: "bg-blue-600 text-white",
  failed: "bg-red-600 text-white",
  pending: "bg-amber-400 text-slate-900",
  skipped: "bg-slate-200 text-slate-600",
  unknown:
    "border border-dashed border-slate-400 bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
};
const SYMBOLS: Record<ReleaseState, string> = {
  success: "✓",
  failed: "×",
  pending: "…",
  skipped: "−",
  unknown: "?",
};
const PANEL =
  "min-w-0 max-w-full rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5 sm:p-6";
const dateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
async function fetchCatalog(url: string): Promise<ReleaseCatalog> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "请登录后查看发布状态。"
        : response.status === 403
          ? "当前账号没有运维访问权限。"
          : "发布数据源暂不可用，请重试。",
    );
  const payload: unknown = await response.json();
  if (!isReleaseCatalog(payload))
    throw new Error("发布数据格式异常，请检查采集任务。");
  return payload;
}
function StateBadge({ state }: { state: ReleaseState }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${COLORS[state]}`}
    >
      <span aria-hidden="true">{SYMBOLS[state]}</span>
      {RELEASE_LABELS[state]}
    </span>
  );
}

export default function ReleaseStatusPage({
  catalog,
}: { catalog?: ReleaseCatalog } = {}) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    catalog ? null : "/api/operations/releases",
    fetchCatalog,
    {
      fallbackData: catalog,
      refreshInterval: 60000,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    },
  );
  const [environment, setEnvironment] = useState<"all" | ReleaseEnvironment>(
    "all",
  );
  const [matrixPhase, setMatrixPhase] = useState<"build" | "deployment">(
    "build",
  );
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<ReleasePeriod>("day");
  const [selection, setSelection] = useState<{
    id: string;
    repository: string;
  } | null>(null);
  const [page, setPage] = useState(0);
  const releases = data?.releases;
  const attempts = useMemo(
    () =>
      (releases ?? []).filter(
        (r) =>
          (environment === "all" || r.environment === environment) &&
          `${r.tag} ${r.repositories.map((p) => p.repository).join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [releases, environment, query],
  );
  const tags = useMemo(() => latestTagAttempts(attempts), [attempts]);
  const columns = useMemo(() => tags.slice(0, 24), [tags]);
  const repositories = useMemo(
    () =>
      [
        ...new Set(
          columns.flatMap((r) => r.repositories.map((p) => p.repository)),
        ),
      ].sort(),
    [columns],
  );
  const daily = useMemo(
    () => periodReleaseCounts(releases ?? [], period),
    [releases, period],
  );
  const today = dailyReleaseCounts(releases ?? [], 1)[0];
  const selectedRelease =
    attempts.find((r) => r.id === selection?.id) ?? columns[0];
  const selectedRepo =
    selectedRelease?.repositories.find(
      (p) => p.repository === selection?.repository,
    ) ?? selectedRelease?.repositories[0];
  const stale =
    data && Date.now() - Date.parse(data.updatedAt) > 30 * 60 * 1000;
  const historyPage = Math.min(
    page,
    Math.max(0, Math.ceil(tags.length / 10) - 1),
  );

  return (
    <div className="w-full min-w-0 max-w-full space-y-5 text-[var(--color-text)]">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/panel" },
          { label: "Platform Operations", href: "/panel/operations" },
          { label: "Releases", href: "/panel/operations/releases" },
        ]}
      />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
            Platform Operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--color-heading)]">
            发布总览
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            最新版本、跨仓库结果与发布数量。
          </p>
        </div>
        <a
          href={WORKFLOW_URL}
          target="_blank"
          rel="noreferrer"
          className="tactile-button tactile-button-soft"
        >
          <GitBranch className="h-4 w-4" />
          GitHub Actions
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[var(--color-text-muted)]">
        <div className="text-sm">
          <span className="font-semibold">GitHub Actions 同步</span>
          <span className="ml-3 text-[var(--color-text-muted)]">
            {data
              ? `采集于 ${dateTime(data.updatedAt)} · 北京时间`
              : "等待发布数据"}
          </span>
          {stale && <span className="ml-2 text-amber-700">数据已过期</span>}
        </div>
        <button
          type="button"
          disabled={isValidating}
          onClick={() => void mutate()}
          className="tactile-button tactile-button-soft disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`}
          />
          {isValidating ? "同步中" : "刷新状态"}
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error.message}
          {data ? " 上次采集数据仍可查看。" : " 页面不会用示例数据替代。"}
        </div>
      )}
      {isLoading && (
        <div role="status" className={`${PANEL} text-sm`}>
          正在读取发布记录…
        </div>
      )}
      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {(["uat", "prod"] as const).map((env) => {
              const latest = latestSuccess(data.releases, env);
              return (
                <section
                  key={env}
                  className={PANEL}
                  aria-label={`${env.toUpperCase()} 最新成功发布`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-[var(--color-heading)]">
                      {env.toUpperCase()}{" "}
                      <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                        最新成功发布
                      </span>
                    </h2>
                    <span className="shrink-0 whitespace-nowrap rounded-lg bg-[var(--color-primary-muted)] px-3 py-1.5 text-sm text-[var(--color-primary)]">
                      今日{" "}
                      <strong>
                        {data.releases.some((r) => r.environment === env)
                          ? (today?.[env] ?? 0)
                          : "—"}
                      </strong>{" "}
                      个 TAG
                    </span>
                  </div>
                  {latest ? (
                    <>
                      <a
                        href={latest.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 flex items-center gap-2 break-all font-mono text-lg font-semibold text-[var(--color-primary)]"
                      >
                        {latest.tag}
                        <ArrowUpRight className="h-4 w-4 shrink-0" />
                      </a>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                        <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                        {dateTime(latest.completedAt)} ·{" "}
                        {latest.scope === "full-uat"
                          ? "完整 UAT 验收"
                          : "Serverless 范围验收"}
                      </p>
                    </>
                  ) : (
                    <p className="mt-5 text-sm text-[var(--color-text-muted)]">
                      覆盖范围内暂无成功发布证据
                    </p>
                  )}
                </section>
              );
            })}
          </div>
          <section className={PANEL}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-heading)]">
                  跨仓库发布热力图
                </h2>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  首行显示环境发布结果，其余行显示仓库阶段结果
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="状态阶段"
                  value={matrixPhase}
                  onChange={(e) =>
                    setMatrixPhase(e.target.value as typeof matrixPhase)
                  }
                  className="rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                >
                  <option value="build">仓库构建</option>
                  <option value="deployment">仓库部署</option>
                </select>
                <label className="text-xs">
                  环境{" "}
                  <select
                    aria-label="筛选环境"
                    value={environment}
                    onChange={(e) => {
                      setEnvironment(e.target.value as typeof environment);
                      setPage(0);
                    }}
                    className="ml-1 rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                  >
                    <option value="all">全部</option>
                    <option value="uat">UAT</option>
                    <option value="prod">PROD</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2">
                  <Search className="h-4 w-4 text-[var(--color-text-subtle)]" />
                  <input
                    aria-label="搜索 TAG 或仓库"
                    placeholder="搜索 TAG / 仓库"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(0);
                    }}
                    className="w-40 bg-transparent text-sm outline-none"
                  />
                </label>
              </div>
            </div>
            {columns.length ? (
              <div className="mt-5 overflow-x-auto pb-2">
                <table className="w-max min-w-[24rem] border-separate border-spacing-x-1 border-spacing-y-1 text-left">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="sticky left-0 z-10 min-w-48 bg-[var(--color-surface)] pr-4 text-xs text-[var(--color-text-muted)]"
                      >
                        仓库 / TAG
                      </th>
                      {columns.map((r) => (
                        <th
                          key={r.id}
                          scope="col"
                          className="min-w-16 text-center text-xs font-medium"
                          title={`${r.environment.toUpperCase()} · ${r.tag}`}
                        >
                          <span className="block text-[var(--color-text-subtle)]">
                            {r.environment.toUpperCase()}
                          </span>
                          <span className="mt-1 block text-[var(--color-primary)]">
                            {r.tag.match(/\d{4}\.(\d{2})\.(\d{2})(.*)/)
                              ? r.tag.replace(
                                  /^.*?\d{4}\.(\d{2})\.(\d{2})(.*)$/,
                                  "$1/$2$3",
                                )
                              : r.tag}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-[var(--color-surface)] pr-4 text-sm font-semibold text-[var(--color-heading)]"
                      >
                        环境发布结果
                      </th>
                      {columns.map((r) => (
                        <td key={r.id} className="text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setSelection({
                                id: r.id,
                                repository: r.repositories[0]?.repository ?? "",
                              })
                            }
                            aria-label={`${r.environment.toUpperCase()} ${r.tag} 环境发布：${RELEASE_LABELS[r.status]}`}
                            title={`${r.tag} · 环境发布${RELEASE_LABELS[r.status]}`}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${COLORS[r.status]}`}
                          >
                            <span aria-hidden="true">{SYMBOLS[r.status]}</span>
                          </button>
                        </td>
                      ))}
                    </tr>
                    {repositories.map((repo) => (
                      <tr key={repo}>
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-[var(--color-surface)] pr-4 font-normal"
                        >
                          <span className="block text-sm font-medium text-[var(--color-heading)]">
                            {repo.split("/")[1]}
                          </span>
                        </th>
                        {columns.map((r) => {
                          const p = r.repositories.find(
                            (item) => item.repository === repo,
                          );
                          const state = p ? p[matrixPhase] : "unknown";
                          const active =
                            selectedRelease?.id === r.id &&
                            selectedRepo?.repository === repo;
                          return (
                            <td key={r.id} className="text-center">
                              <button
                                type="button"
                                disabled={!p}
                                onClick={() =>
                                  setSelection({ id: r.id, repository: repo })
                                }
                                aria-pressed={active}
                                aria-label={`${repo} ${r.environment.toUpperCase()} ${r.tag}：${p ? `部署${RELEASE_LABELS[p.deployment]}，构建${RELEASE_LABELS[p.build]}` : "不在本次快照范围"}`}
                                title={`${r.tag} · ${p ? RELEASE_LABELS[state] : "无记录"}`}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${COLORS[state]} ${active ? "ring-2 ring-blue-600 ring-offset-2" : ""} disabled:cursor-default disabled:opacity-40`}
                              >
                                <span aria-hidden="true">{SYMBOLS[state]}</span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-5 text-sm text-[var(--color-text-muted)]">
                没有符合筛选条件的 TAG。
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3 border-t border-[color:var(--color-divider)] pt-4">
              {(Object.keys(COLORS) as ReleaseState[]).map((s) => (
                <StateBadge key={s} state={s} />
              ))}
              <p className="w-full text-xs text-[var(--color-text-muted)]">
                当前查看：{matrixPhase === "build" ? "仓库构建" : "仓库部署"}
                。环境发布结果以最新成功 TAG 为准。
              </p>
            </div>
            {selectedRelease && selectedRepo && (
              <details
                id="release-detail"
                open={!!selection}
                className="mt-5 rounded-xl border border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)]/20 p-4"
              >
                <summary className="cursor-pointer text-sm font-medium text-[var(--color-primary)]">
                  {selectedRepo.repository.split("/")[1]} ·{" "}
                  {selectedRelease.tag} · 查看详情
                </summary>
                <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="break-all text-sm font-semibold text-[var(--color-heading)]">
                      {selectedRepo.repository}
                    </p>
                    <p className="mt-1 break-all font-mono text-sm text-[var(--color-primary)]">
                      {selectedRelease.environment.toUpperCase()} ·{" "}
                      {selectedRelease.tag}
                    </p>
                  </div>
                  <a
                    href={selectedRelease.url}
                    target="_blank"
                    rel="noreferrer"
                    className="tactile-button tactile-button-soft"
                  >
                    执行记录 #{selectedRelease.runId}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="mb-1 text-[var(--color-text-subtle)]">
                      仓库构建
                    </dt>
                    <dd>
                      <StateBadge state={selectedRepo.build} />
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-[var(--color-text-subtle)]">
                      仓库部署
                    </dt>
                    <dd>
                      <StateBadge state={selectedRepo.deployment} />
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-[var(--color-text-subtle)]">
                      环境发布 / 验收
                    </dt>
                    <dd>
                      <StateBadge state={selectedRelease.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-[var(--color-text-subtle)]">
                      仓库 SHA
                    </dt>
                    <dd className="font-mono">
                      {selectedRepo.sha ? (
                        <a
                          className="text-[var(--color-primary)]"
                          href={`https://github.com/${selectedRepo.repository}/commit/${selectedRepo.sha}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {selectedRepo.sha.slice(0, 12)}
                        </a>
                      ) : (
                        "无证据"
                      )}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                  范围：{selectedRelease.scope} · 第 {selectedRelease.attempt}{" "}
                  次执行 · {dateTime(selectedRelease.completedAt)}
                </p>
              </details>
            )}
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer text-[var(--color-primary)]">
                查看完整 TAG 列表
              </summary>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {columns.map((r, i) => (
                  <li key={r.id} className="break-all font-mono">
                    {i + 1}. {r.environment.toUpperCase()} · {r.tag}
                  </li>
                ))}
              </ol>
            </details>
          </section>
          <section className={PANEL}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-heading)]">
                  发布数量
                </h2>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  北京时间 · 按所选周期内成功发布的 TAG 去重
                </p>
              </div>
              <select
                aria-label="统计周期"
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReleasePeriod)}
                className="rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              >
                <option value="day">每日 · 最近 30 天</option>
                <option value="week">每周 · 最近 12 周</option>
                <option value="year">每年 · 最近 5 年</option>
              </select>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-center text-xs">
                <thead>
                  <tr>
                    <th
                      className="sticky left-0 bg-[var(--color-surface)] px-2 text-left"
                      scope="col"
                    >
                      环境
                    </th>
                    {daily.map((d) => (
                      <th
                        scope="col"
                        key={d.day}
                        className="min-w-9 font-normal text-[var(--color-text-muted)]"
                      >
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["uat", "prod"] as const).map((env) => (
                    <tr key={env}>
                      <th
                        scope="row"
                        className="sticky left-0 bg-[var(--color-surface)] px-2 text-left"
                      >
                        {env.toUpperCase()}
                      </th>
                      {daily.map((d) => {
                        const covered =
                          d.end > shanghaiDay(data.coverage.since) &&
                          data.releases.some((r) => r.environment === env);
                        return (
                          <td
                            key={d.day}
                            className={`h-9 rounded-md ${!covered ? "border border-dashed border-slate-300" : d[env] > 0 ? (d[env] > 2 ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-900") : "bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)]"}`}
                            title={`${d.day} ${env.toUpperCase()} ${covered ? `${d[env]} 个成功 TAG（仅已采集证据）` : "未覆盖"}`}
                          >
                            {covered
                              ? `${d[env]}${d.day < shanghaiDay(data.coverage.since) ? "*" : ""}`
                              : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">
              0 = 无成功 TAG · — = 未覆盖 · * = 部分覆盖 · {data.gaps.length}{" "}
              条执行缺少发布证据，数量可能不完整。
            </p>
          </section>
          <section className={PANEL}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[var(--color-heading)]">
                历史版本
              </h2>
              <span className="text-xs text-[var(--color-text-muted)]">
                {tags.length} 个 TAG
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-[color:var(--color-divider)] text-xs text-[var(--color-text-subtle)]">
                  <tr>
                    {["环境 / TAG", "最近结果", "范围", "发布时间", "记录"].map(
                      (h) => (
                        <th
                          scope="col"
                          key={h}
                          className="px-2 py-3 font-medium"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {tags
                    .slice(historyPage * 10, historyPage * 10 + 10)
                    .map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-[color:var(--color-divider)]"
                      >
                        <td className="min-w-56 px-2 py-3">
                          <p className="text-xs text-[var(--color-text-subtle)]">
                            {r.environment.toUpperCase()}
                          </p>
                          <button
                            type="button"
                            className="mt-1 break-all text-left font-mono text-[var(--color-primary)]"
                            onClick={() => {
                              setSelection({
                                id: r.id,
                                repository: r.repositories[0]?.repository ?? "",
                              });
                              document
                                .getElementById("release-detail")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });
                            }}
                          >
                            {r.tag}
                          </button>
                        </td>
                        <td className="px-2 py-3">
                          <StateBadge state={r.status} />
                        </td>
                        <td className="px-2 py-3 text-xs">
                          {r.scope === "full-uat" ? "完整 UAT" : "Serverless"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-xs">
                          {dateTime(r.completedAt)}
                        </td>
                        <td className="px-2 py-3">
                          <a
                            className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)]"
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            #{r.runId} / {r.attempt}
                            <ArrowUpRight className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!attempts.length && (
              <p className="py-5 text-sm text-[var(--color-text-muted)]">
                暂无历史记录。
              </p>
            )}
            <div className="mt-4 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                className="tactile-button tactile-button-soft"
                disabled={historyPage === 0}
                onClick={() => setPage(historyPage - 1)}
              >
                上一页
              </button>
              <span>
                {historyPage + 1} / {Math.max(1, Math.ceil(tags.length / 10))}
              </span>
              <button
                type="button"
                className="tactile-button tactile-button-soft"
                disabled={(historyPage + 1) * 10 >= tags.length}
                onClick={() => setPage(historyPage + 1)}
              >
                下一页
              </button>
            </div>
          </section>
          <details
            className={`${PANEL} text-xs text-[var(--color-text-muted)]`}
          >
            <summary className="cursor-pointer font-semibold">
              数据覆盖与缺失证据（{data.gaps.length}）
            </summary>
            <p className="mt-3">
              从 {dateTime(data.coverage.since)} 开始采集；PROD 仅覆盖具有不可变
              TAG 身份的 Serverless 发布，不代表 Selfhost 全量发布。
            </p>
            <p className="mt-2">{data.coverage.prod}</p>
            <ul className="mt-3 space-y-2">
              {data.gaps.map((g) => (
                <li key={g.runId}>
                  <a
                    className="text-[var(--color-primary)]"
                    href={`https://github.com/ai-workspace-infra/platform-ops-toolkit/actions/runs/${g.runId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    #{g.runId}
                  </a>{" "}
                  · {g.workflow} · {g.status} · {g.reason}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
