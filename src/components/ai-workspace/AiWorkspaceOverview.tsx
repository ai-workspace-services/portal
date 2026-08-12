"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  Loader2,
  PencilLine,
  RefreshCw,
} from "lucide-react";

import {
  buildWorkbenchProjection,
  type TaskThread,
  type WorkbenchItem,
  type WorkbenchProject,
} from "@/lib/xworkmate/workbenchProjection";
import { cn } from "@/lib/utils";
import {
  AiWorkspaceAnalyticsPanel,
  normalizeAnalyticsDashboard,
  type AnalyticsDashboard,
} from "@/components/ai-workspace/AiWorkspaceAnalyticsPanel";

type ActivityWindow = "7d" | "30d" | "all";

type TrialStatus = {
  mode: "trial" | "account";
  trial?: {
    used: number;
    limit: number;
    remaining: number;
  };
  registerHref?: string;
};

const activityWindowLabels: Record<ActivityWindow, string> = {
  "7d": "7日",
  "30d": "30日",
  all: "全部",
};

async function loadThreads(signal: AbortSignal): Promise<TaskThread[]> {
  const response = await fetch("/api/ai-workspace/threads", {
    credentials: "include",
    cache: "no-store",
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`加载工作台数据失败：${response.status}`);
  }
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("工作台服务返回了无效的线程列表。");
  }
  return payload as TaskThread[];
}

async function loadTrialStatus(signal: AbortSignal): Promise<TrialStatus> {
  const response = await fetch("/api/ai-workspace/trial", {
    credentials: "include",
    cache: "no-store",
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`加载试用状态失败：${response.status}`);
  }
  return (await response.json()) as TrialStatus;
}

async function loadAnalytics(signal: AbortSignal): Promise<AnalyticsDashboard | null> {
  const response = await fetch("/api/ai-workspace/dashboard", {
    credentials: "include",
    cache: "no-store",
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  return normalizeAnalyticsDashboard((await response.json()) as unknown);
}

export function AiWorkspaceOverview(): React.ReactNode {
  const searchParams = useSearchParams();
  const trialEntry = searchParams?.get("entry") === "trial";
  const [threads, setThreads] = useState<TaskThread[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [activityWindow, setActivityWindow] = useState<ActivityWindow>("7d");
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    setError("");
    try {
      const requestSignal = signal ?? new AbortController().signal;
      const nextTrialStatus = trialEntry
        ? await loadTrialStatus(requestSignal)
        : null;
      if (nextTrialStatus) {
        setTrialStatus(nextTrialStatus);
      }
      const [nextThreads, nextAnalytics] =
        nextTrialStatus?.mode === "trial"
          ? [[], null]
          : await Promise.all([
              loadThreads(requestSignal),
              loadAnalytics(requestSignal).catch(() => null),
            ]);
      setThreads(nextThreads);
      setAnalytics(nextAnalytics);
      setStatus("ready");
    } catch (reason) {
      if (signal?.aborted) {
        return;
      }
      console.warn("AI Workspace overview request failed", reason);
      setThreads([]);
      setError(
        reason instanceof Error ? reason.message : "加载工作台数据失败。",
      );
      setStatus("error");
    }
  }, [trialEntry]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const projection = useMemo(
    () => buildWorkbenchProjection(threads),
    [threads],
  );
  const attentionItems = projection.items.filter(
    (item) => item.state !== "completed",
  );
  const maxActivity = Math.max(
    1,
    ...projection.workloadSeries.map((entry) => entry.value),
  );
  const isAnonymousTrial = trialEntry && trialStatus?.mode === "trial";
  const registerHref =
    trialStatus?.registerHref ??
    "/register?returnTo=%2Fai-workspace%3Fentry%3Dtrial";

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-[#f8f9fa] px-4 py-4 text-[#1c1b1f] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <section className="rounded-[20px] border border-slate-200/80 bg-[#f2f5f8] p-4 sm:p-[18px]">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900">
                工作台
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {isAnonymousTrial
                  ? "先跑通一个真实任务，再把工作沉淀下来"
                  : "把零碎进展沉淀为清晰工作"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {isAnonymousTrial ? (
                <>
                  <span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 sm:inline-flex">
                    访客试用 · {trialStatus.trial?.remaining ?? 0}/
                    {trialStatus.trial?.limit ?? 5}
                  </span>
                  <Link
                    href={registerHref}
                    className="hidden rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 sm:inline-flex"
                  >
                    注册后保存会话
                  </Link>
                </>
              ) : null}
              <div
                className="flex rounded-[9px] bg-white/65 p-1"
                role="group"
                aria-label="活动时间范围"
              >
                {(Object.keys(activityWindowLabels) as ActivityWindow[]).map(
                  (window) => (
                    <button
                      key={window}
                      type="button"
                      aria-pressed={activityWindow === window}
                      onClick={() => setActivityWindow(window)}
                      className={cn(
                        "rounded-[7px] px-2.5 py-1 text-xs font-semibold transition",
                        activityWindow === window
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800",
                      )}
                    >
                      {activityWindowLabels[window]}
                    </button>
                  ),
                )}
              </div>
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed"
                disabled={status === "loading"}
                aria-label="刷新工作台数据"
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    status === "loading" && "animate-spin",
                  )}
                />
              </button>
              <Link
                href="/ai-workspace/conversation/new?entry=trial"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-slate-900 text-white transition hover:bg-slate-700"
                aria-label="快速记录"
              >
                <PencilLine className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {isAnonymousTrial ? (
              <>
                <OverviewMetric label="已执行任务" value={trialStatus.trial?.used ?? 0} />
                <OverviewMetric label="剩余试用" value={trialStatus.trial?.remaining ?? 0} />
                <OverviewMetric label="会话保存" value="注册后" />
                <OverviewMetric label="制品下载" value="注册后" />
              </>
            ) : (
              <>
                <OverviewMetric label="TaskThreads" value={projection.items.length} />
                <OverviewMetric label="待处理" value={attentionItems.length} />
                <OverviewMetric label="推进中专项" value={projection.projects.length} />
                <OverviewMetric label="已归档产物" value={projection.inbox.length} />
              </>
            )}
          </div>

          {isAnonymousTrial ? <div className="mt-3 rounded-[10px] bg-white/60 p-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-500">
                工作活跃度
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {activityWindow === "all"
                  ? "服务端全部记录"
                  : `服务端近 ${activityWindow.replace("d", "")} 天记录`}
              </span>
            </div>
            <div className="mt-2 flex gap-1.5" aria-label="近七日工作活跃度">
              {projection.workloadSeries.map((entry) => (
                <div key={entry.name} className="min-w-0 flex-1">
                  <div
                    title={`${entry.name}：${entry.value} 项活动`}
                    className="h-6 rounded-[5px] bg-blue-600"
                    style={{
                      opacity:
                        entry.value === 0
                          ? 0.1
                          : 0.28 + (entry.value / maxActivity) * 0.72,
                    }}
                  />
                </div>
              ))}
            </div>
          </div> : null}
        </section>

        {!isAnonymousTrial ? (
          <div className="mt-4">
            <AiWorkspaceAnalyticsPanel projection={projection} dashboard={analytics} />
          </div>
        ) : null}

        {status === "error" && !isAnonymousTrial ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="font-semibold underline underline-offset-2"
            >
              重试
            </button>
          </div>
        ) : null}

        {isAnonymousTrial ? (
          <section className="mt-4 rounded-[18px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 px-5 py-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">
                  Guest workspace
                </p>
                <h2 className="mt-1 text-base font-extrabold text-slate-900">
                  现在开始一个真实任务
                </h2>
                <p className="mt-1 max-w-[620px] text-sm leading-6 text-slate-500">
                  访客模式可以先执行任务；注册后即可保存会话、创建持久化任务并下载制品。
                </p>
              </div>
              <Link
                href="/ai-workspace/conversation/new?entry=trial"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(37,99,235,0.2)] transition hover:bg-blue-700"
              >
                开始新任务
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : null}

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <OverviewSection title="需要你处理">
            {status === "loading" ? (
              <OverviewLoading />
            ) : attentionItems.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {attentionItems.slice(0, 5).map((item) => (
                  <TaskRow key={item.sessionKey} item={item} />
                ))}
              </div>
            ) : (
              <OverviewEmpty
                icon={CheckCircle2}
                title={isAnonymousTrial ? "访客模式暂不保存任务" : "当前没有待处理事项"}
                subtitle={
                  isAnonymousTrial
                    ? "执行中的结果会显示在当前工作区，注册后可继续跟进。"
                    : "新的 TaskThread 会自动出现在这里。"
                }
              />
            )}
          </OverviewSection>

          <OverviewSection title="正在推进的专项">
            {status === "loading" ? (
              <OverviewLoading />
            ) : projection.projects.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {projection.projects.slice(0, 5).map((project) => (
                  <ProjectRow key={project.label} project={project} />
                ))}
              </div>
            ) : (
              <OverviewEmpty
                icon={FolderOpen}
                title={isAnonymousTrial ? "注册后开始沉淀专项" : "暂无正在推进的专项"}
                subtitle={
                  isAnonymousTrial
                    ? "保存会话后，任务会按工作目录聚合为专项。"
                    : "绑定工作目录后，TaskThread 会自动聚合为专项。"
                }
              />
            )}
          </OverviewSection>
        </div>
      </div>
    </main>
  );
}

function OverviewMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="h-[76px] rounded-[10px] bg-white/70 px-3 py-2.5">
      <p className="truncate text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-extrabold tracking-[-0.03em] text-slate-900">
        {value}
      </p>
    </div>
  );
}

function OverviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200/80 bg-white px-[18px] pb-3 pt-4">
      <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
      <div className="mt-3 border-t border-slate-100">{children}</div>
    </section>
  );
}

function OverviewLoading() {
  return (
    <div className="flex min-h-44 items-center justify-center text-sm font-medium text-slate-400">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      正在读取工作台数据…
    </div>
  );
}

function OverviewEmpty({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof CheckCircle2;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-6 text-center">
      <Icon className="h-8 w-8 text-slate-400" strokeWidth={1.8} />
      <p className="mt-3 text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function TaskRow({ item }: { item: WorkbenchItem }) {
  return (
    <Link
      href={`/ai-workspace/conversation/${encodeURIComponent(item.sessionKey)}`}
      className="flex items-center gap-3 py-3 transition hover:bg-slate-50/80"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800">
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {item.preview}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}

function ProjectRow({ project }: { project: WorkbenchProject }) {
  return (
    <Link
      href="/ai-workspace/tasks"
      className="flex items-center gap-3 py-3 transition hover:bg-slate-50/80"
    >
      <FolderOpen className="h-4 w-4 shrink-0 text-blue-600" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800">
          {project.label}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {project.items.length} 个 TaskThread · {project.artifactCount} 个
          Artifact
        </span>
      </span>
      <span className="text-xs font-bold text-blue-700">
        {project.progress}%
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}
