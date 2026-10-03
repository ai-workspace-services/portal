"use client";

import {
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FolderGit2,
  GitBranch,
  Layers3,
  Lock,
  Pin,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CatalogUnavailableError,
  fetchSharedTaskCatalog,
  formatLocation,
  resumeCommand,
  type ActiveClaim,
  type PinnedTask,
  type SharedProject,
  type TaskCatalog,
} from "@/lib/ai-workspace/catalogApi";
import { cn } from "@/lib/utils";

type HubTab = "pinned" | "projects" | "claims" | "threads";

export function TaskCoordinationHub() {
  const searchParams = useSearchParams();
  const initialTask = searchParams.get("task");
  const initialProject = searchParams.get("project");

  const [catalog, setCatalog] = useState<TaskCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<HubTab>(
    initialProject ? "projects" : "pinned",
  );
  const [searchQuery, setSearchQuery] = useState(initialTask || initialProject || "");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchSharedTaskCatalog();
      setCatalog(data);
    } catch (err) {
      setCatalog(null);
      setLoadError(err instanceof CatalogUnavailableError ? err.message : "任务目录暂时不可用");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pinnedTasks = useMemo(() => catalog?.pinnedTasks ?? [], [catalog]);
  const sharedProjects = useMemo(() => catalog?.sharedProjects ?? [], [catalog]);
  const activeClaims = useMemo(() => catalog?.activeClaims ?? [], [catalog]);
  const recentThreads = useMemo(() => catalog?.recentThreads ?? [], [catalog]);

  const filteredPinned = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pinnedTasks;
    return pinnedTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.projectName && t.projectName.toLowerCase().includes(q)) ||
        formatLocation(t.scope, t.location).toLowerCase().includes(q),
    );
  }, [pinnedTasks, searchQuery]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sharedProjects;
    return sharedProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        formatLocation(p.scope, p.location).toLowerCase().includes(q),
    );
  }, [sharedProjects, searchQuery]);

  const copyResumeCommand = (task: PinnedTask) => {
    const cmd = resumeCommand(task);
    navigator.clipboard.writeText(cmd).catch(() => {});
    setCopiedId(task.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#fbfcfe] text-[#17181c]">
      {/* Header */}
      <header className="flex min-h-[72px] shrink-0 items-center justify-between border-b border-[#e4e8ef] px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#075ecc] to-[#4338ca] text-white shadow-sm">
            <Share2 className="size-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-[#17181c]">跨 Agent 任务中枢 & 共享记忆</h1>
              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live Mesh
              </span>
            </div>
            <p className="text-xs text-[#7b8494]">
              Codex Desktop · Claude Code · Antigravity · QMD 协调引擎 · PostgreSQL 17
            </p>
          </div>
        </div>

        {/* Runtime endpoints & Refresh */}
        <div className="flex items-center space-x-2">
          <div className="hidden items-center space-x-2 rounded-xl border border-[#e4e8ef] bg-[#f8fafc] px-3 py-1.5 text-xs text-[#697386] sm:flex">
            <span>网关 <strong className="font-mono text-emerald-600">:8787</strong></span>
            <span className="text-[#cbd5e1]">|</span>
            <span>QMD <strong className="font-mono text-indigo-600">:8181</strong></span>
            <span className="text-[#cbd5e1]">|</span>
            <span>PG <strong className="font-mono text-sky-600">:15432</strong></span>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="grid size-9 place-items-center rounded-xl border border-[#dfe4eb] bg-white text-[#697386] shadow-sm transition hover:bg-[#edf1f6] hover:text-[#17181c]"
            title="刷新数据"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      {loadError ? (
        <div role="alert" className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs font-medium text-amber-800">
          {loadError}
        </div>
      ) : null}

      {/* Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e8ef] bg-[#f8fafc]/50 px-6 py-3">
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("pinned")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
              activeTab === "pinned"
                ? "bg-[#075ecc] text-white shadow-sm"
                : "text-[#566174] hover:bg-[#edf1f6]",
            )}
          >
            <Pin className="size-3.5" />
            置顶任务
            <span className={cn(
              "ml-1 rounded-full px-1.5 py-0.2 text-[10px]",
              activeTab === "pinned" ? "bg-white/20 text-white" : "bg-[#edf1f6] text-[#7b8494]"
            )}>
              {pinnedTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("projects")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
              activeTab === "projects"
                ? "bg-[#075ecc] text-white shadow-sm"
                : "text-[#566174] hover:bg-[#edf1f6]",
            )}
          >
            <FolderGit2 className="size-3.5" />
            共享工程
            <span className={cn(
              "ml-1 rounded-full px-1.5 py-0.2 text-[10px]",
              activeTab === "projects" ? "bg-white/20 text-white" : "bg-[#edf1f6] text-[#7b8494]"
            )}>
              {sharedProjects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("claims")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
              activeTab === "claims"
                ? "bg-[#075ecc] text-white shadow-sm"
                : "text-[#566174] hover:bg-[#edf1f6]",
            )}
          >
            <Lock className="size-3.5" />
            独占资源锁
            <span className={cn(
              "ml-1 rounded-full px-1.5 py-0.2 text-[10px]",
              activeTab === "claims" ? "bg-white/20 text-white" : "bg-[#edf1f6] text-[#7b8494]"
            )}>
              {activeClaims.length}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#7b8494]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索任务名称、工程路径..."
            className="h-8 w-full rounded-lg border border-[#dfe4eb] bg-white pl-9 pr-3 text-xs text-[#17181c] outline-none transition focus:border-[#075ecc] focus:ring-1 focus:ring-[#075ecc]"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "pinned" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#7b8494]">
              <span>来自 ChatGPT Codex Desktop 同步的置顶任务列表（已落入 PostgreSQL）</span>
              <span>共 {filteredPinned.length} 项</span>
            </div>

            {filteredPinned.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dfe4eb] p-12 text-center text-xs text-[#7b8494]">
                未匹配到符合条件的任务
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {filteredPinned.map((task, idx) => (
                  <div
                    key={task.id}
                    className="group flex items-start justify-between gap-4 rounded-xl border border-[#e4e8ef] bg-white p-3.5 shadow-xs transition hover:border-[#1260cc]/40 hover:shadow-sm"
                  >
                    <div className="flex min-w-0 items-start space-x-3">
                      <span className="grid size-6 shrink-0 place-items-center rounded-lg border border-[#e4e8ef] bg-[#f8fafc] font-mono text-[11px] font-bold text-[#697386]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-sm text-[#17181c]">
                            {task.title}
                          </span>
                          {task.projectName ? (
                            <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-[#075ecc]">
                              {task.projectName}
                            </span>
                          ) : (
                            <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              会话任务
                            </span>
                          )}
                          {task.gitBranch && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#e4e8ef] bg-[#f8fafc] px-2 py-0.5 font-mono text-[11px] text-[#697386]">
                              <GitBranch className="size-3" />
                              {task.gitBranch}
                            </span>
                          )}
                        </div>
                        <p
                          className="mt-1 truncate font-mono text-xs text-[#7b8494]"
                          title={formatLocation(task.scope, task.location) || "未关联代码仓库"}
                        >
                          {formatLocation(task.scope, task.location) || "未关联代码仓库"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => copyResumeCommand(task)}
                        className={cn(
                          "flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                          copiedId === task.id
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-[#dfe4eb] bg-white text-[#566174] hover:bg-[#f0f3f7] hover:text-[#17181c]",
                        )}
                        title="复制 task_resume 命令"
                      >
                        {copiedId === task.id ? (
                          <>
                            <Check className="size-3.5" /> 已复制
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" /> 复制指令
                          </>
                        )}
                      </button>
                      <span className="rounded bg-[#f0f3f7] px-2 py-0.5 font-mono text-[10px] text-[#7b8494]">
                        Codex
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "projects" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#7b8494]">
              <span>统一注册的跨 Agent 本地代码仓库目录</span>
              <span>共 {filteredProjects.length} 个工程</span>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dfe4eb] p-12 text-center text-xs text-[#7b8494]">
                未匹配到符合条件的工程
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.key}
                    className="flex flex-col justify-between rounded-xl border border-[#e4e8ef] bg-white p-4 shadow-xs transition hover:border-[#075ecc]/50"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FolderGit2 className="size-4 text-[#075ecc]" />
                          <span className="font-bold text-sm text-[#17181c]">
                            {proj.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {proj.sources.map((s) => (
                            <span
                              key={s}
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                s === "claude"
                                  ? "bg-amber-100 text-amber-800"
                                  : s === "codex"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-indigo-100 text-indigo-800",
                              )}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="mt-2.5 break-all rounded-lg border border-[#e4e8ef] bg-[#f8fafc] p-2 font-mono text-xs text-[#697386]">
                        {formatLocation(proj.scope, proj.location)}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const cmd = `task_resume(cwd="${formatLocation(proj.scope, proj.location)}")`;
                          navigator.clipboard.writeText(cmd).catch(() => {});
                          setCopiedId(proj.key);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="flex items-center gap-1 text-xs text-[#075ecc] hover:underline"
                      >
                        {copiedId === proj.key ? (
                          <>
                            <Check className="size-3" /> 已复制接续指令
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" /> 复制工程接续指令
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "claims" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#7b8494]">
              <span>当前正在执行中的跨 Agent 独占资源锁（Leases）</span>
              <span>活跃锁：{activeClaims.length}</span>
            </div>

            {activeClaims.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dfe4eb] p-12 text-center text-xs text-[#7b8494]">
                <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-500/80" />
                <p className="font-semibold text-sm text-[#17181c]">当前无排他资源锁冲突</p>
                <p className="mt-1 text-xs text-[#7b8494]">所有代码仓库与文件均可自由由任意 Agent 申领并发协作</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeClaims.map((claim, idx) => (
                  <div
                    key={`${claim.resource}-${idx}`}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <Lock className="size-4 text-amber-600" />
                      <span className="font-mono font-bold text-amber-900">{claim.resource}</span>
                      {claim.intent && <span className="text-amber-800">“{claim.intent}”</span>}
                    </div>
                    <div className="flex items-center space-x-2 font-mono text-[11px] text-amber-700">
                      <span>持有者: {claim.agentKind} ({claim.agentId})</span>
                      <span>·</span>
                      <span>到期: {claim.expiresAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
