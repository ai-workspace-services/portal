"use client";

import {
  ChevronsLeft,
  FolderGit2,
  Languages,
  LayoutDashboard,
  MessageSquare,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  listTaskNamespaces,
  listTaskSessions,
  type TaskSessionSnapshot,
} from "@/lib/ai-workspace/sessionApi";
import {
  fetchSharedTaskCatalog,
  type TaskCatalog,
} from "@/lib/ai-workspace/catalogApi";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onHide?: () => void;
  mobile?: boolean;
}

function updatedAt(session: TaskSessionSnapshot): number {
  const value = Date.parse(session.updatedAt ?? session.createdAt ?? "");
  return Number.isFinite(value) ? value : 0;
}

function statusLabel(session: TaskSessionSnapshot): string {
  const state = String(
    session.taskRun?.state ?? session.lifecycleState ?? "",
  ).toLowerCase();
  if (["queued", "running", "active", "processing"].includes(state))
    return "运行中";
  if (["completed", "succeeded", "done"].includes(state)) return "已完成";
  if (["failed", "cancelled", "canceled"].includes(state)) return "失败";
  return "等待中";
}

export default function Sidebar({ onHide, mobile = false }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<TaskSessionSnapshot[]>([]);
  const [catalog, setCatalog] = useState<TaskCatalog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [catalogResult, sessionsResult] = await Promise.allSettled([
      fetchSharedTaskCatalog(),
      (async () => {
        const namespaces = await listTaskNamespaces();
        const lists = await Promise.all(
          namespaces.map(({ namespaceId }) => listTaskSessions(namespaceId)),
        );
        return lists.flat().sort((left, right) => updatedAt(right) - updatedAt(left));
      })(),
    ]);

    if (catalogResult.status === "fulfilled") {
      setCatalog(catalogResult.value);
    }

    if (sessionsResult.status === "fulfilled") {
      setSessions(sessionsResult.value);
      setError("");
    } else {
      if (catalogResult.status !== "fulfilled") {
        setError("云端历史会话暂时不可用");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  const pinnedTasks = useMemo(() => catalog?.pinnedTasks ?? [], [catalog]);
  const sharedProjects = useMemo(() => catalog?.sharedProjects ?? [], [catalog]);

  const filteredPinned = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pinnedTasks;
    return pinnedTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.projectName && t.projectName.toLowerCase().includes(q)) ||
        (t.cwd && t.cwd.toLowerCase().includes(q)),
    );
  }, [searchQuery, pinnedTasks]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sharedProjects;
    return sharedProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.rootPath.toLowerCase().includes(q),
    );
  }, [searchQuery, sharedProjects]);

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query
      ? sessions.filter((session) =>
          `${session.title ?? ""} ${session.sessionId}`
            .toLowerCase()
            .includes(query),
        )
      : sessions;
  }, [searchQuery, sessions]);

  const totalCount = pinnedTasks.length + sessions.length;

  return (
    <aside
      aria-label="任务导航"
      className={cn(
        "flex h-full w-[292px] shrink-0 flex-col border-r border-[#e4e8ef] bg-[#fbfcfe]",
        mobile && "w-[min(88vw,340px)] shadow-2xl",
      )}
    >
      {/* Top Search */}
      <div className="flex items-center gap-2 p-4 pb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7b8494]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索任务 / 工程 / 会话"
            className="h-11 w-full rounded-xl border border-[#dfe4eb] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1260cc] focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <button
          type="button"
          onClick={onHide}
          className="grid size-10 place-items-center rounded-xl text-[#697386] hover:bg-[#edf1f6]"
          aria-label={mobile ? "关闭任务导航" : "收起任务导航"}
        >
          {mobile ? (
            <X className="size-5" />
          ) : (
            <ChevronsLeft className="size-5" />
          )}
        </button>
      </div>

      {/* New Conversation CTA */}
      <div className="px-4">
        <Link
          href="/ai-workspace/conversation/new"
          onClick={mobile ? onHide : undefined}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#075ecc] text-sm font-bold text-white shadow-sm transition hover:bg-[#0452b6]"
        >
          <Plus className="size-4" /> 新对话
        </Link>
      </div>

      {/* Task List Header & Fused Content */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center px-5 pb-2">
          <span className="text-sm font-bold text-[#17181c]">任务列表</span>
          <span className="ml-2 rounded-full bg-[#f0f3f7] px-1.5 py-0.2 text-xs font-mono font-medium text-[#7b8494]">
            {totalCount}
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="ml-auto rounded-lg p-1.5 text-[#7b8494] transition hover:bg-[#edf1f6]"
            aria-label="刷新任务与会话"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
          {/* Top-level Navigation Links */}
          <Link
            href="/ai-workspace"
            onClick={mobile ? onHide : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              pathname === "/ai-workspace"
                ? "bg-[#eaf2fd] text-[#075ecc]"
                : "text-[#566174] hover:bg-[#f0f3f7]",
            )}
          >
            <LayoutDashboard className="size-5 shrink-0" />
            <span>工作台</span>
          </Link>

          <Link
            href="/ai-workspace/tasks"
            onClick={mobile ? onHide : undefined}
            className={cn(
              "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              pathname === "/ai-workspace/tasks" && !searchParams.get("task") && !searchParams.get("project")
                ? "bg-[#eaf2fd] text-[#075ecc]"
                : "text-[#566174] hover:bg-[#f0f3f7]",
            )}
          >
            <div className="flex items-center gap-3">
              <Share2 className="size-5 shrink-0 text-[#075ecc]" />
              <span>任务中枢 & 共享记忆</span>
            </div>
            {pinnedTasks.length > 0 ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#075ecc]">
                {pinnedTasks.length}
              </span>
            ) : null}
          </Link>

          {/* 📌 置顶任务列表 (来自 Codex Desktop 同步) */}
          {filteredPinned.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#7b8494]">
                <span className="flex items-center gap-1.5">
                  <Pin className="size-3 text-amber-500" />
                  置顶任务
                </span>
                <span className="font-mono text-[10px] text-[#8a93a2]">{filteredPinned.length}</span>
              </div>
              <div className="space-y-1">
                {filteredPinned.map((task, idx) => {
                  const isSelected =
                    pathname === "/ai-workspace/tasks" &&
                    searchParams.get("task") === task.id;
                  return (
                    <Link
                      key={task.id}
                      href={`/ai-workspace/tasks?task=${encodeURIComponent(task.id)}`}
                      onClick={mobile ? onHide : undefined}
                      className={cn(
                        "group flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-xs transition",
                        isSelected
                          ? "border border-[#dce6f4] bg-white text-[#17181c] shadow-xs"
                          : "text-[#566174] hover:bg-[#f0f3f7]",
                      )}
                      title={task.title}
                    >
                      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded bg-[#edf1f6] text-[10px] font-mono font-bold text-[#697386]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate font-semibold leading-tight text-[#17181c] group-hover:text-[#075ecc]">
                          {task.title}
                        </strong>
                        <div className="mt-1 flex items-center gap-1.5">
                          {task.projectName ? (
                            <span className="truncate rounded border border-blue-500/20 bg-blue-50/50 px-1.5 py-0.2 text-[10px] font-medium text-[#075ecc]">
                              {task.projectName}
                            </span>
                          ) : (
                            <span className="truncate rounded border border-amber-500/20 bg-amber-50/50 px-1.5 py-0.2 text-[10px] font-medium text-amber-700">
                              会话任务
                            </span>
                          )}
                          <span className="text-[10px] text-[#8a93a2]">Codex</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 📁 跨 Agent 共享工程 */}
          {filteredProjects.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#7b8494]">
                <span className="flex items-center gap-1.5">
                  <FolderGit2 className="size-3 text-indigo-500" />
                  共享工程
                </span>
                <span className="font-mono text-[10px] text-[#8a93a2]">{filteredProjects.length}</span>
              </div>
              <div className="space-y-1">
                {filteredProjects.map((proj) => {
                  const isSelected =
                    pathname === "/ai-workspace/tasks" &&
                    searchParams.get("project") === proj.name;
                  return (
                    <Link
                      key={proj.id}
                      href={`/ai-workspace/tasks?project=${encodeURIComponent(proj.name)}`}
                      onClick={mobile ? onHide : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition",
                        isSelected
                          ? "border border-[#dce6f4] bg-white text-[#17181c] shadow-xs"
                          : "text-[#566174] hover:bg-[#f0f3f7]",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FolderGit2 className="size-3.5 shrink-0 text-[#075ecc]" />
                        <span className="truncate font-semibold text-[#17181c]">{proj.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center space-x-1">
                        {proj.sources.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-[#edf1f6] px-1 py-0.2 text-[9px] font-mono uppercase text-[#7b8494]"
                          >
                            {s[0]}
                          </span>
                        ))}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 💬 历史会话 */}
          {filteredSessions.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#7b8494]">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="size-3 text-emerald-600" />
                  历史会话
                </span>
                <span className="font-mono text-[10px] text-[#8a93a2]">{filteredSessions.length}</span>
              </div>
              <div className="space-y-1">
                {filteredSessions.map((session) => {
                  const href = `/ai-workspace/conversation/${encodeURIComponent(session.sessionId)}`;
                  return (
                    <Link
                      key={`${session.namespaceId}-${session.sessionId}`}
                      href={href}
                      onClick={mobile ? onHide : undefined}
                      className={cn(
                        "flex items-start gap-3 rounded-xl px-3 py-2 text-sm transition",
                        pathname === href
                          ? "border border-[#dce6f4] bg-white text-[#17181c] shadow-xs"
                          : "text-[#566174] hover:bg-[#f0f3f7]",
                      )}
                    >
                      <MessageSquare className="mt-0.5 size-4 shrink-0 text-[#248b51]" />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate font-semibold text-xs text-[#17181c]">
                          {session.title?.trim() || "未命名会话"}
                        </strong>
                        <span className="mt-0.5 block truncate text-[11px] text-[#8a93a2]">
                          {statusLabel(session)} · {session.lastEventSeq ?? 0} events
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {loading && !sessions.length && !pinnedTasks.length ? (
            <p className="px-3 py-7 text-center text-xs text-[#8a93a2]">
              正在同步任务中枢与记忆…
            </p>
          ) : null}

          {error && !sessions.length && !pinnedTasks.length ? (
            <button
              type="button"
              onClick={() => void load()}
              className="w-full px-3 py-6 text-center text-xs leading-5 text-[#a54841]"
            >
              {error}
              <br />
              点击重试
            </button>
          ) : null}
        </nav>
      </div>

      {/* Footer Navigation */}
      <div className="space-y-1 border-t border-[#e4e8ef] p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-[#566174] hover:bg-[#edf1f6]"
        >
          <Settings className="size-4" />
          设置
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-[#566174] hover:bg-[#edf1f6]"
        >
          <Languages className="size-4" />
          语言 · 中
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-[#566174] hover:bg-[#edf1f6]"
        >
          <Sun className="size-4" />
          主题 · 跟随
        </button>
      </div>
    </aside>
  );
}
