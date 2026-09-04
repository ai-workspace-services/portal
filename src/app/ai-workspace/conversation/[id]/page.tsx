"use client";

import {
  ChevronsLeft,
  Cloud,
  Menu,
  PlayCircle,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ChatInputArea from "@/components/ai-workspace/ChatInputArea";
import RightContextPanel from "@/components/ai-workspace/RightContextPanel";
import {
  getTaskSessionEvents,
  loadTaskSession,
  replayTaskSessionEvents,
  type SubmitTaskMessageResult,
  type TaskSessionEvent,
  type TaskSessionSnapshot,
} from "@/lib/ai-workspace/sessionApi";
import {
  mergeOrderedEvents,
  projectConversationMessages,
  sessionIsActive,
  sessionTitle,
} from "@/lib/ai-workspace/sessionProjection";
import { cn } from "@/lib/utils";

export default function ConversationPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const sessionId = id && id !== "new" ? id : undefined;
  const [snapshot, setSnapshot] = useState<TaskSessionSnapshot | null>(null);
  const [events, setEvents] = useState<TaskSessionEvent[]>([]);
  const eventsRef = useRef<TaskSessionEvent[]>([]);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  const applyEvents = useCallback((incoming: TaskSessionEvent[]) => {
    const merged = mergeOrderedEvents(eventsRef.current, incoming);
    eventsRef.current = merged;
    setEvents(merged);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!sessionId) return;
    setError("");
    try {
      const [nextSnapshot, replay] = await Promise.all([
        loadTaskSession(sessionId),
        replayTaskSessionEvents(sessionId),
      ]);
      setSnapshot(nextSnapshot);
      applyEvents(replay);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "会话历史加载失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyEvents, sessionId]);

  useEffect(() => {
    eventsRef.current = [];
    setEvents([]);
    setSnapshot(null);
    setLoading(Boolean(sessionId));
    if (sessionId) void loadHistory();
  }, [loadHistory, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const cursor = eventsRef.current.at(-1)?.seq ?? 0;
        const [nextSnapshot, page] = await Promise.all([
          loadTaskSession(sessionId),
          getTaskSessionEvents(sessionId, cursor),
        ]);
        if (!cancelled) {
          setSnapshot(nextSnapshot);
          applyEvents(page.events);
        }
      } catch {
        // A transient poll failure must not replace already replayed history.
      }
    };
    const timer = window.setInterval(() => {
      if (!document.hidden) void poll();
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applyEvents, sessionId]);

  const messages = useMemo(() => projectConversationMessages(events), [events]);
  const active = sessionIsActive(snapshot);
  const handleSubmitted = useCallback(
    (result: SubmitTaskMessageResult) => {
      applyEvents([result.event]);
      setSnapshot((current) =>
        current
          ? {
              ...current,
              lastEventSeq: result.event.seq,
              snapshotVersion: result.snapshotVersion,
              lifecycleState: "running",
              taskRun: result.taskRun,
            }
          : current,
      );
      void Promise.all([
        loadTaskSession(result.sessionId),
        getTaskSessionEvents(result.sessionId, result.event.seq),
      ])
        .then(([nextSnapshot, page]) => {
          setSnapshot(nextSnapshot);
          applyEvents(page.events);
        })
        .catch(() => {
          // The regular poll recovers the atomically-created run.queued event.
        });
    },
    [applyEvents],
  );

  return (
    <div className="relative flex min-w-0 flex-1 overflow-hidden bg-white">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[60px] shrink-0 items-center border-b border-[#e8ebf0] bg-white px-3 pl-14 sm:px-5 sm:pl-16 md:pl-5">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold sm:text-base">
              {sessionId ? sessionTitle(snapshot) : "新对话"}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-eyebrow text-[#7b8494]">
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold",
                  active ? "text-[#248b51]" : "text-[#697386]",
                )}
              >
                {active ? (
                  <RefreshCw className="size-3 animate-spin" />
                ) : (
                  <Wifi className="size-3" />
                )}
                {active ? "任务运行中" : sessionId ? "历史已同步" : "准备开始"}
              </span>
              {snapshot?.taskRun?.state ? (
                <span>· {snapshot.taskRun.state}</span>
              ) : null}
              {events.length ? <span>· seq {events.at(-1)?.seq}</span> : null}
            </div>
          </div>
          <div className="hidden items-center gap-1 rounded-full border border-[#e1e6ed] bg-[#f8fafc] p-1 text-xs sm:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#075ecc] px-3 py-1.5 font-semibold text-white">
              <PlayCircle className="size-3.5" />
              对话工作流
            </span>
            <span className="inline-flex items-center gap-1 px-2 text-[#667085]">
              <Menu className="size-3.5" />
              渲染
            </span>
          </div>
          <button
            type="button"
            onClick={() => setRightPanelOpen((value) => !value)}
            className="ml-2 inline-flex items-center gap-1 rounded-lg border border-[#dfe4eb] px-2.5 py-2 text-xs font-semibold text-[#566174] hover:bg-[#f6f8fb]"
            aria-label="切换任务上下文"
          >
            <ChevronsLeft className="size-4" />
            <span className="hidden sm:inline">上下文</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-3 py-5 sm:px-6 sm:py-8">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
            {!sessionId ? <NewConversation /> : null}
            {loading ? <LoadingHistory /> : null}
            {error ? (
              <LoadError
                message={error}
                onRetry={() => {
                  setRefreshing(true);
                  void loadHistory();
                }}
                refreshing={refreshing}
              />
            ) : null}
            {!loading && !error && sessionId && !messages.length ? (
              <div className="m-auto rounded-2xl border border-dashed border-[#d7dde6] bg-white px-8 py-10 text-center">
                <Cloud className="mx-auto size-8 text-[#a0a8b5]" />
                <p className="mt-3 font-semibold">会话已恢复</p>
                <p className="mt-1 text-xs text-[#7b8494]">
                  暂无可显示的消息事件，新的终端消息会自动同步到这里。
                </p>
              </div>
            ) : null}
            {messages.length ? (
              <div className="space-y-5" aria-label="会话消息">
                {messages.map((message) => (
                  <article
                    key={`${message.seq}-${message.id}`}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[82%]",
                        message.role === "user"
                          ? "rounded-br-md bg-[#075ecc] text-white"
                          : "rounded-bl-md border border-[#e4e8ef] bg-white text-[#252a34]",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.text}
                      </p>
                      <span
                        className={cn(
                          "mt-2 block text-eyebrow",
                          message.role === "user"
                            ? "text-blue-100"
                            : "text-[#8a93a2]",
                        )}
                      >
                        #{message.seq} · {formatTime(message.createdAt)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <footer className="shrink-0 border-t border-[#e8ebf0] bg-white px-3 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto max-w-3xl">
            <ChatInputArea
              sessionId={sessionId}
              onSubmitted={handleSubmitted}
            />
          </div>
          <p className="mt-2 text-center text-eyebrow text-[#8a93a2]">
            会话和任务状态由 Bridge 持久化，并在所有终端按事件序号同步
          </p>
        </footer>
      </section>

      {rightPanelOpen ? (
        <div className="absolute inset-y-0 right-0 z-30 shadow-2xl xl:static xl:shadow-none">
          <RightContextPanel
            sessionTitle={sessionTitle(snapshot)}
            workingPath={`session://${sessionId ?? "new"}`}
            msgCount={messages.length}
            files={[]}
            onClose={() => setRightPanelOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

function NewConversation() {
  return (
    <div className="m-auto max-w-lg text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eaf2fd] text-[#075ecc]">
        <MessageLogo />
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-[0.12em] sm:text-3xl">
        XWORKMATE
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#697386]">
        输入需求开始任务。Portal 仅展示和调用，历史上下文将由 Bridge
        保存并同步到桌面端、移动端和 Web。
      </p>
    </div>
  );
}

function LoadingHistory() {
  return (
    <div className="m-auto flex items-center gap-3 rounded-xl border border-[#e4e8ef] bg-white px-5 py-4 text-sm text-[#697386]">
      <RefreshCw className="size-4 animate-spin text-[#075ecc]" />
      正在恢复快照与有序事件…
    </div>
  );
}

function LoadError({
  message,
  onRetry,
  refreshing,
}: {
  message: string;
  onRetry: () => void;
  refreshing: boolean;
}) {
  return (
    <div
      role="alert"
      className="m-auto max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center"
    >
      <p className="font-semibold text-red-700">无法恢复此会话</p>
      <p className="mt-2 text-xs leading-5 text-red-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={refreshing}
        className="mt-4 rounded-lg bg-[#17181c] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
      >
        {refreshing ? "正在重试…" : "重新加载"}
      </button>
    </div>
  );
}

function MessageLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 5h16v11H8l-4 3V5Z" />
    </svg>
  );
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date)
    : "已同步";
}
