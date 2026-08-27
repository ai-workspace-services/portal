"use client";

import {
  ChevronsLeft,
  Languages,
  LayoutDashboard,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  listTaskNamespaces,
  listTaskSessions,
  type TaskSessionSnapshot,
} from "@/lib/ai-workspace/sessionApi";
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
  const [sessions, setSessions] = useState<TaskSessionSnapshot[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const namespaces = await listTaskNamespaces();
      const lists = await Promise.all(
        namespaces.map(({ namespaceId }) => listTaskSessions(namespaceId)),
      );
      setSessions(
        lists.flat().sort((left, right) => updatedAt(right) - updatedAt(left)),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "历史会话暂时不可用");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

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

  return (
    <aside
      aria-label="任务导航"
      className={cn(
        "flex h-full w-[292px] shrink-0 flex-col border-r border-[#e4e8ef] bg-[#fbfcfe]",
        mobile && "w-[min(88vw,340px)] shadow-2xl",
      )}
    >
      <div className="flex items-center gap-2 p-4 pb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7b8494]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索任务 / 会话"
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
      <div className="px-4">
        <Link
          href="/ai-workspace/conversation/new"
          onClick={mobile ? onHide : undefined}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#075ecc] text-sm font-bold text-white shadow-sm transition hover:bg-[#0452b6]"
        >
          <Plus className="size-4" /> 新对话
        </Link>
      </div>
      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center px-5 pb-2">
          <span className="text-sm font-bold">任务列表</span>
          <span className="ml-2 text-xs text-[#7b8494]">{sessions.length}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="ml-auto rounded-lg p-1.5 text-[#7b8494] hover:bg-[#edf1f6]"
            aria-label="刷新历史会话"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          <Link
            href="/ai-workspace"
            onClick={mobile ? onHide : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold",
              pathname === "/ai-workspace"
                ? "bg-[#eaf2fd] text-[#075ecc]"
                : "text-[#566174] hover:bg-[#f0f3f7]",
            )}
          >
            <LayoutDashboard className="size-5" /> 工作台
          </Link>
          {filteredSessions.map((session) => {
            const href = `/ai-workspace/conversation/${encodeURIComponent(session.sessionId)}`;
            return (
              <Link
                key={`${session.namespaceId}-${session.sessionId}`}
                href={href}
                onClick={mobile ? onHide : undefined}
                className={cn(
                  "flex items-start gap-3 rounded-xl px-3 py-3 text-sm transition",
                  pathname === href
                    ? "border border-[#dce6f4] bg-white text-[#17181c] shadow-sm"
                    : "text-[#566174] hover:bg-[#f0f3f7]",
                )}
              >
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-[#248b51]" />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate font-semibold">
                    {session.title?.trim() || "未命名会话"}
                  </strong>
                  <span className="mt-1 block truncate text-xs text-[#8a93a2]">
                    {statusLabel(session)} · {session.lastEventSeq ?? 0} events
                  </span>
                </span>
              </Link>
            );
          })}
          {loading && !sessions.length ? (
            <p className="px-3 py-7 text-center text-xs text-[#8a93a2]">
              正在同步历史会话…
            </p>
          ) : null}
          {error ? (
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
          {!loading && !error && !filteredSessions.length ? (
            <p className="px-3 py-7 text-center text-xs text-[#8a93a2]">
              暂无服务端会话
            </p>
          ) : null}
        </nav>
      </div>
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
