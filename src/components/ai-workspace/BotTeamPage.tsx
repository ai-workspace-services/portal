"use client";

import { Bot, Loader2, LogIn, RefreshCw, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import BoundaryLink from "@/components/common/BoundaryLink";
import {
  formatRelativeTime,
  sessionStatusLabel,
} from "@/components/ai-workspace/Sidebar";
import { SidebarRevealButton } from "@/components/ai-workspace/shell/SidebarRevealButton";
import { submitRoleTask } from "@/lib/ai-workspace/roleTaskRunner";
import { ASSISTANT_ROLES, type AssistantRole } from "@/lib/ai-workspace/roles";
import {
  listTaskNamespaces,
  listTaskSessions,
  type TaskSessionSnapshot,
} from "@/lib/ai-workspace/sessionApi";
import { useUserStore } from "@/lib/userStore";
import { cn } from "@/lib/utils";

type BotRoleChoice = Exclude<AssistantRole, "chat"> | "auto";

const ROLE_CHOICES: { value: BotRoleChoice; label: string; description: string }[] = [
  { value: "auto", label: "Auto", description: "由编排策略选择角色" },
  ...ASSISTANT_ROLES.filter((role) => role.value !== "chat").map((role) => ({
    value: role.value as BotRoleChoice,
    label: role.label,
    description: role.description,
  })),
];

function sessionTime(session: TaskSessionSnapshot): number {
  const value = Date.parse(session.updatedAt ?? session.createdAt ?? "");
  return Number.isFinite(value) ? value : 0;
}

/**
 * Bot 团队: hand tasks to the DS Bot team to run offline or in the background,
 * and follow them. The conversation composer is for answers now; this page is
 * for work that should keep running without the page open.
 */
export function BotTeamPage() {
  const [sessions, setSessions] = useState<TaskSessionSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [authFailed, setAuthFailed] = useState(false);
  const user = useUserStore((state) => state.user);
  const userLoading = useUserStore((state) => state.isLoading);
  // Bot team tasks run under the signed-in account, never a guest session.
  const needsLogin = authFailed || (!userLoading && !user);
  const [role, setRole] = useState<BotRoleChoice>("auto");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const namespaces = await listTaskNamespaces();
      const lists = await Promise.all(
        namespaces.map(({ namespaceId }) => listTaskSessions(namespaceId)),
      );
      setSessions(
        lists.flat().sort((left, right) => sessionTime(right) - sessionTime(left)),
      );
      setAuthFailed(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bot 团队任务加载失败";
      setAuthFailed(/Authentication required|401/.test(message));
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void load();
    } else if (!userLoading) {
      setLoading(false);
    }
  }, [load, user, userLoading]);

  const handOff = async () => {
    const prompt = text.trim();
    if (!prompt || submitting || needsLogin || !user) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await submitRoleTask(prompt, role);
      setText("");
      await load();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "任务提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#eef1f5] px-3">
        <SidebarRevealButton />
        <Bot className="size-4 text-[#075ecc]" />
        <h1 className="text-sm font-medium text-[#17181c]">Bot 团队</h1>
        <span className="hidden text-xs text-[#8a93a2] sm:inline">
          离线、后台与定时任务由 DS Bot 团队执行
        </span>
        <button
          type="button"
          onClick={() => void load()}
          disabled={needsLogin}
          aria-label="刷新 Bot 团队任务"
          className="ml-auto grid size-8 place-items-center rounded-lg text-[#697386] transition hover:bg-[#edf1f6]"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-4 py-6">
        <div className="mx-auto w-full max-w-[760px] space-y-5">
          <section className="rounded-2xl border border-[#e1e6ed] bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="角色">
              {ROLE_CHOICES.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  role="radio"
                  aria-checked={role === choice.value}
                  title={choice.description}
                  data-testid={`bot-team-role-${choice.value}`}
                  onClick={() => setRole(choice.value)}
                  className={cn(
                    "h-8 rounded-lg border px-3 text-sm transition",
                    role === choice.value
                      ? "border-[#b9d3f5] bg-[#eef5fe] text-[#075ecc]"
                      : "border-[#e4e8ef] text-[#566174] hover:bg-[#f6f8fb]",
                  )}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="描述要在后台完成的任务，Bot 团队会持续执行并把结果写回会话。"
              className="mt-3 h-[88px] w-full resize-none bg-transparent px-1 text-sm leading-6 outline-none placeholder:text-[#9aa3b2]"
            />
            {submitError ? (
              <p role="alert" className="mb-2 text-xs text-red-600">
                {submitError}
              </p>
            ) : null}
            <div className="flex justify-end">
              <button
                type="button"
                data-testid="bot-team-submit"
                disabled={!text.trim() || submitting || needsLogin || !user}
                onClick={() => void handOff()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#075ecc] px-3.5 text-sm font-medium text-white transition hover:bg-[#0452b6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                交给 Bot 团队
              </button>
            </div>
          </section>

          <section>
            <h2 className="mb-2 px-1 text-xs font-medium text-[#8a93a2]">任务</h2>
            {needsLogin ? (
              <div className="rounded-xl border border-dashed border-[#d7dde6] bg-white px-6 py-8 text-center">
                <p className="text-sm text-[#3d4553]">登录账号后使用 Bot 团队</p>
                <BoundaryLink
                  href="/login?returnTo=%2Fai-workspace%2Fbot-team"
                  className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#d7dde6] px-3 text-sm text-[#3d4553] hover:bg-[#f6f8fb]"
                >
                  <LogIn className="size-4" />
                  登录 / 注册
                </BoundaryLink>
              </div>
            ) : loadError ? (
              <button
                type="button"
                onClick={() => void load()}
                className="w-full rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-left text-xs text-red-600"
              >
                {loadError}，点击重试
              </button>
            ) : sessions.length === 0 && !loading ? (
              <div className="rounded-xl border border-dashed border-[#d7dde6] bg-white px-6 py-8 text-center text-sm text-[#697386]">
                还没有交给 Bot 团队的任务。
              </div>
            ) : (
              <ul className="divide-y divide-[#eef1f5] overflow-hidden rounded-xl border border-[#e4e8ef] bg-white">
                {sessions.map((session) => (
                  <li key={`${session.namespaceId}-${session.sessionId}`}>
                    <Link
                      href={`/ai-workspace/conversation/${encodeURIComponent(session.sessionId)}`}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-[#f8fafc]"
                    >
                      <Bot className="size-4 shrink-0 text-[#697386]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-[#17181c]">
                          {session.title?.trim() || "未命名任务"}
                        </span>
                        <span className="block text-xs text-[#8a93a2]">
                          {sessionStatusLabel(session)}
                          {session.taskRun?.state ? ` · ${session.taskRun.state}` : ""}
                        </span>
                      </span>
                      {sessionTime(session) ? (
                        <span className="shrink-0 text-xs text-[#8a93a2]">
                          {formatRelativeTime(sessionTime(session))}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
