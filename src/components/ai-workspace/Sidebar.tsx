"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Bot,
  ChevronDown,
  Cloud,
  FolderGit2,
  LayoutGrid,
  ListChecks,
  LogIn,
  MessageSquare,
  Palette,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Settings,
  SquarePen,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

import { PaneToggleIcon } from "@/components/ai-workspace/shell/PaneToggleIcon";
import {
  useWorkspaceShell,
  type TaskItem,
} from "@/components/ai-workspace/shell/WorkspaceShellContext";
import {
  fetchSharedTaskCatalog,
  formatLocation,
  type TaskCatalog,
} from "@/lib/ai-workspace/catalogApi";
import {
  listTaskNamespaces,
  listTaskSessions,
  type TaskSessionSnapshot,
} from "@/lib/ai-workspace/sessionApi";
import { toConsoleHref } from "@/lib/consoleNavigation";
import { useUserStore } from "@/lib/userStore";
import { cn } from "@/lib/utils";

export const WORKBENCH_HREF = "/ai-workspace/tasks";
export const BOT_TEAM_HREF = "/ai-workspace/bot-team";

interface SidebarProps {
  onHide?: () => void;
  mobile?: boolean;
}

function updatedAt(session: TaskSessionSnapshot): number {
  const value = Date.parse(session.updatedAt ?? session.createdAt ?? "");
  return Number.isFinite(value) ? value : 0;
}

export function sessionStatusLabel(session: TaskSessionSnapshot): string {
  const state = String(
    session.taskRun?.state ?? session.lifecycleState ?? "",
  ).toLowerCase();
  if (["queued", "running", "active", "processing"].includes(state))
    return "运行中";
  if (["completed", "succeeded", "done"].includes(state)) return "已完成";
  if (["failed", "cancelled", "canceled"].includes(state)) return "失败";
  return "等待中";
}

export function formatRelativeTime(value: number): string {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - value) / 60000));
  if (elapsedMinutes < 1) return "刚刚";
  if (elapsedMinutes < 60) return `${elapsedMinutes} 分钟前`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} 小时前`;
  return `${Math.floor(elapsedHours / 24)} 天前`;
}

function matches(query: string, ...values: (string | undefined)[]): boolean {
  return !query || values.some((value) => value?.toLowerCase().includes(query));
}

/**
 * The one sidebar of the AI Workspace, laid out like the XWorkmate App:
 * brand and collapse on one line, a dense filter, the 工作台 / 新对话 /
 * Bot 团队 rows, the task groups, and a single footer row with a gear menu.
 */
export default function Sidebar({ onHide, mobile = false }: SidebarProps) {
  const shell = useWorkspaceShell();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessions, setSessions] = useState<TaskSessionSnapshot[]>([]);
  const [catalog, setCatalog] = useState<TaskCatalog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [catalogResult, sessionsResult] = await Promise.allSettled([
      fetchSharedTaskCatalog(),
      (async () => {
        const namespaces = await listTaskNamespaces();
        const lists = await Promise.all(
          namespaces.map(({ namespaceId }) => listTaskSessions(namespaceId)),
        );
        return lists
          .flat()
          .sort((left, right) => updatedAt(right) - updatedAt(left));
      })(),
    ]);
    if (catalogResult.status === "fulfilled") setCatalog(catalogResult.value);
    if (sessionsResult.status === "fulfilled") setSessions(sessionsResult.value);
    setCloudError(
      catalogResult.status !== "fulfilled" &&
        sessionsResult.status !== "fulfilled",
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  const query = searchQuery.trim().toLowerCase();
  const localTasks = useMemo(
    () => shell.tasks.filter((task) => matches(query, task.title, task.preview)),
    [query, shell.tasks],
  );
  const cloudSessions = useMemo(
    () =>
      sessions.filter((session) =>
        matches(query, session.title, session.sessionId),
      ),
    [query, sessions],
  );
  const pinnedTasks = useMemo(
    () =>
      (catalog?.pinnedTasks ?? []).filter((task) =>
        matches(
          query,
          task.title,
          task.projectName,
          formatLocation(task.scope, task.location),
        ),
      ),
    [catalog, query],
  );
  const sharedProjects = useMemo(
    () =>
      (catalog?.sharedProjects ?? []).filter((project) =>
        matches(query, project.name, formatLocation(project.scope, project.location)),
      ),
    [catalog, query],
  );

  const closeOnMobile = mobile ? onHide : undefined;
  const onHome = pathname === shell.homeHref;

  const startNewTask = () => {
    shell.createTask();
    if (!onHome) router.push(shell.homeHref);
    closeOnMobile?.();
  };

  const openLocalTask = (task: TaskItem) => {
    shell.selectTask(task.id);
    if (!onHome) router.push(shell.homeHref);
    closeOnMobile?.();
  };

  return (
    <aside
      aria-label="任务导航"
      className={cn(
        "flex h-full w-[284px] shrink-0 flex-col border-r border-[#e4e8ef] bg-[#fbfcfe]",
        mobile && "w-[min(88vw,320px)] shadow-2xl",
      )}
    >
      <div className="flex h-12 items-center gap-2 px-3">
        <span className="grid size-7 place-items-center rounded-lg bg-[#075ecc] text-xs font-semibold text-white">
          X
        </span>
        <span className="text-sm font-semibold text-[#17181c]">XWorkmate</span>
        <button
          type="button"
          onClick={onHide}
          data-testid="sidebar-collapse"
          className="ml-auto grid size-8 place-items-center rounded-lg text-[#697386] transition hover:bg-[#edf1f6] hover:text-[#17181c]"
          aria-label={mobile ? "关闭任务导航" : "收起边栏"}
        >
          {mobile ? <X className="size-4" /> : <PaneToggleIcon side="left" />}
        </button>
      </div>

      <div className="px-3 pb-2">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8a93a2]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索任务"
            className="h-8 w-full rounded-lg border border-[#e4e8ef] bg-white pl-8 pr-2 text-xs text-[#17181c] outline-none transition placeholder:text-[#8a93a2] focus:border-[#1260cc] focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <nav aria-label="工作区" className="space-y-0.5 px-2">
        <NavRow
          href={WORKBENCH_HREF}
          icon={LayoutGrid}
          label="工作台"
          selected={pathname.startsWith(WORKBENCH_HREF)}
          onClick={closeOnMobile}
        />
        <NavRow icon={SquarePen} label="新对话" onClick={startNewTask} testId="sidebar-new-task" />
        <NavRow
          href={BOT_TEAM_HREF}
          icon={Bot}
          label="Bot 团队"
          selected={pathname.startsWith(BOT_TEAM_HREF)}
          onClick={closeOnMobile}
        />
      </nav>

      <div className="mt-4 flex items-center gap-1 px-4 pb-1">
        <span className="text-eyebrow font-semibold uppercase tracking-wider text-[#8a93a2]">
          任务
        </span>
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto grid size-6 place-items-center rounded-md text-[#8a93a2] transition hover:bg-[#edf1f6] hover:text-[#17181c]"
          aria-label="刷新任务与会话"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </button>
        <button
          type="button"
          onClick={startNewTask}
          className="grid size-6 place-items-center rounded-md text-[#8a93a2] transition hover:bg-[#edf1f6] hover:text-[#17181c]"
          aria-label="新建任务"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        <TaskGroup icon={Cloud} label="Gateway" count={localTasks.length}>
          {localTasks.map((task) => (
            <TaskRow
              key={task.id}
              icon={ListChecks}
              title={task.title}
              subtitle={task.preview}
              meta={formatRelativeTime(task.updatedAt)}
              selected={onHome && shell.activeTaskId === task.id}
              running={task.state === "running"}
              onClick={() => openLocalTask(task)}
            />
          ))}
        </TaskGroup>

        {cloudSessions.length ? (
          <TaskGroup icon={MessageSquare} label="云端会话" count={cloudSessions.length}>
            {cloudSessions.map((session) => {
              const href = `/ai-workspace/conversation/${encodeURIComponent(session.sessionId)}`;
              return (
                <TaskRow
                  key={`${session.namespaceId}-${session.sessionId}`}
                  href={href}
                  icon={MessageSquare}
                  title={session.title?.trim() || "未命名会话"}
                  subtitle={sessionStatusLabel(session)}
                  meta={updatedAt(session) ? formatRelativeTime(updatedAt(session)) : ""}
                  selected={pathname === href}
                  onClick={closeOnMobile}
                />
              );
            })}
          </TaskGroup>
        ) : null}

        {pinnedTasks.length ? (
          <TaskGroup icon={Pin} label="置顶任务" count={pinnedTasks.length}>
            {pinnedTasks.map((task) => (
              <TaskRow
                key={task.id}
                href={`${WORKBENCH_HREF}?task=${encodeURIComponent(task.id)}`}
                icon={Pin}
                title={task.title}
                subtitle={task.projectName || "会话任务"}
                selected={
                  pathname === WORKBENCH_HREF && searchParams.get("task") === task.id
                }
                onClick={closeOnMobile}
              />
            ))}
          </TaskGroup>
        ) : null}

        {sharedProjects.length ? (
          <TaskGroup icon={FolderGit2} label="共享工程" count={sharedProjects.length}>
            {sharedProjects.map((project) => (
              <TaskRow
                key={project.key}
                href={`${WORKBENCH_HREF}?project=${encodeURIComponent(project.name)}`}
                icon={FolderGit2}
                title={project.name}
                subtitle={project.sources.join(" · ")}
                selected={
                  pathname === WORKBENCH_HREF &&
                  searchParams.get("project") === project.name
                }
                onClick={closeOnMobile}
              />
            ))}
          </TaskGroup>
        ) : null}

        {cloudError ? (
          <button
            type="button"
            onClick={() => void load()}
            className="w-full px-3 py-3 text-left text-xs leading-5 text-[#8a93a2] hover:text-[#566174]"
          >
            云端会话暂时不可用，点击重试
          </button>
        ) : null}
      </div>

      <SidebarFooter />
    </aside>
  );
}

function NavRow({
  href,
  icon: Icon,
  label,
  selected = false,
  onClick,
  testId,
}: {
  href?: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  selected?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  const className = cn(
    "flex h-[34px] w-full items-center gap-2.5 rounded-lg px-2.5 text-sm transition",
    selected
      ? "bg-[#eaf2fd] font-medium text-[#075ecc]"
      : "text-[#3d4553] hover:bg-[#f0f3f7]",
  );
  const content = (
    <>
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </>
  );
  return href ? (
    <Link
      href={href}
      onClick={onClick}
      className={className}
      aria-current={selected ? "page" : undefined}
      data-testid={testId}
    >
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className} data-testid={testId}>
      {content}
    </button>
  );
}

function TaskGroup({
  icon: Icon,
  label,
  count,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-xs text-[#697386] transition hover:bg-[#f0f3f7]"
      >
        <ChevronDown
          className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
        />
        <Icon className="size-3.5" />
        <span className="font-medium">{label}</span>
        <span className="ml-auto tabular-nums text-[#8a93a2]">{count}</span>
      </button>
      {open ? <div className="mt-0.5 space-y-0.5">{children}</div> : null}
    </section>
  );
}

function TaskRow({
  href,
  icon: Icon,
  title,
  subtitle,
  meta,
  selected,
  running = false,
  onClick,
}: {
  href?: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  meta?: string;
  selected: boolean;
  running?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition",
    selected ? "bg-[#edf1f6]" : "hover:bg-[#f3f5f8]",
  );
  const content = (
    <>
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-white text-[#697386] shadow-[0_0_0_1px_#e4e8ef]">
        {running ? (
          <RefreshCw className="size-3 animate-spin text-[#075ecc]" />
        ) : (
          <Icon className="size-3" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-sm text-[#17181c]">
            {title}
          </span>
          {meta ? (
            <span className="shrink-0 text-eyebrow text-[#8a93a2]">{meta}</span>
          ) : null}
        </span>
        {subtitle ? (
          <span className="block truncate text-xs text-[#8a93a2]">{subtitle}</span>
        ) : null}
      </span>
    </>
  );
  return href ? (
    <Link
      href={href}
      onClick={onClick}
      className={className}
      aria-current={selected ? "page" : undefined}
      title={title}
    >
      {content}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-current={selected ? "page" : undefined}
      title={title}
    >
      {content}
    </button>
  );
}

/**
 * Settings, appearance and sign-in live in the console and auth boundaries,
 * outside the workspace build, so they are full-page navigations.
 */
function openPage(href: string) {
  window.location.assign(toConsoleHref(href));
}

function SidebarFooter() {
  const user = useUserStore((state) => state.user);
  const accountName = user?.name || user?.username || "访客";
  const itemClass =
    "flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm text-[#3d4553] outline-none data-[highlighted]:bg-[#f0f3f7]";
  return (
    <div className="border-t border-[#e4e8ef] px-2 py-1">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            data-testid="sidebar-footer-menu"
            className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-[#3d4553] transition hover:bg-[#f0f3f7]"
            aria-label="设置与账户"
          >
            <Settings className="size-4 shrink-0 text-[#697386]" />
            <span className="min-w-0 flex-1 truncate text-left">{accountName}</span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="top"
            align="start"
            sideOffset={6}
            className="z-50 w-[240px] rounded-xl border border-[#e4e8ef] bg-white p-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
          >
            <DropdownMenu.Item className={itemClass} onSelect={() => openPage("/panel/account")}>
              <Settings className="size-4 text-[#697386]" />
              设置
            </DropdownMenu.Item>
            <DropdownMenu.Item className={itemClass} onSelect={() => openPage("/panel/appearance")}>
              <Palette className="size-4 text-[#697386]" />
              外观
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-[#eef1f5]" />
            {user ? (
              <DropdownMenu.Item className={itemClass} onSelect={() => openPage("/panel/account")}>
                <UserRound className="size-4 text-[#697386]" />
                <span className="truncate">{accountName}</span>
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item
                className={itemClass}
                onSelect={() => openPage("/login?returnTo=%2Fai-workspace")}
              >
                <LogIn className="size-4 text-[#697386]" />
                登录 / 注册
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
