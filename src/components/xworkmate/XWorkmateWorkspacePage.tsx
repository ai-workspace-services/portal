"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  Cloud,
  Copy,
  File,
  Folder,
  Image as ImageIcon,
  Loader2,
  Menu,
  MessageCircle,
  Paperclip,
  Pencil,
  PlayCircle,
  Plug,
  Plus,
  Puzzle,
  RefreshCw,
  Send,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  type ButtonHTMLAttributes,
  type ChangeEvent,
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BUILTIN_PLUGIN_GROUPS } from "@/components/ai-workspace/builtinPlugins";
import { AiWorkspaceShell } from "@/components/ai-workspace/shell/AiWorkspaceShell";
import { PaneToggleIcon } from "@/components/ai-workspace/shell/PaneToggleIcon";
import { SidebarRevealButton } from "@/components/ai-workspace/shell/SidebarRevealButton";
import {
  makeId,
  newTask,
  useOptionalWorkspaceShell,
  useWorkspaceShell,
  WorkspaceShellProvider,
  type ConversationMessage,
  type TaskItem,
  type WorkspaceArtifact,
} from "@/components/ai-workspace/shell/WorkspaceShellContext";
import {
  submitRoleTask,
  waitForRoleTask,
} from "@/lib/ai-workspace/roleTaskRunner";
import {
  ASSISTANT_ROLES,
  BOT_TASK_PHASE_LABEL,
  roleAnswerHeader,
  roleOption,
  runsOnBotTeam,
  type AssistantRole,
} from "@/lib/ai-workspace/roles";
import { cn } from "@/lib/utils";

type BridgeRpcResult = {
  success?: boolean;
  status?: string;
  output?: string;
  summary?: string;
  message?: string;
  remoteWorkingDirectory?: string;
  artifacts?: WorkspaceArtifact[];
  [key: string]: unknown;
};

type BridgeRpcResponse = {
  jsonrpc?: string;
  id?: string;
  result?: BridgeRpcResult;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

type PingResponse = {
  status?: string;
  version?: string;
  tag?: string;
  commit?: string;
};

type ComposerFile = {
  id: string;
  name: string;
  type: string;
  size: number;
};

type XWorkmateWorkspacePageProps = {
  initialPrompt?: string;
  initialSessionKey?: string;
  trialMode?: boolean;
};

type TrialStatus = {
  mode: "trial" | "account";
  canPersist: boolean;
  canDownload: boolean;
  trial?: {
    limit: number;
    used: number;
    remaining: number;
  };
  registerHref?: string;
  message?: string;
};

const DEFAULT_REGISTER_HREF = "/register?returnTo=%2Fai-workspace";

function seedTasks(): TaskItem[] {
  const ago = (minutes: number) => Date.now() - minutes * 60 * 1000;
  const seed = (
    id: string,
    title: string,
    preview: string,
    minutes: number,
    state: TaskItem["state"] = "idle",
    files: WorkspaceArtifact[] = [],
  ): TaskItem => ({
    id,
    title,
    preview,
    updatedAt: ago(minutes),
    state,
    files,
    messages: [],
  });
  return [
    seed("task-current", "新对话", "", 55),
    seed("task-images", "连续制作7张图片", "等待通过 bridge 重新提交任务。", 55),
    seed("task-pdf", "PDF制作", "完成了，PDF 已输出在任务工作区内。", 65, "done", [
      { name: "result.pdf" },
    ]),
    seed("task-video", "视频制作", "等待通过 bridge 重新提交任务。", 55),
  ];
}

function resultText(result: BridgeRpcResult | undefined): string {
  if (!result) {
    return "";
  }

  return (
    result.output?.trim() ||
    result.summary?.trim() ||
    result.message?.trim() ||
    JSON.stringify(result, null, 2)
  );
}

async function callBridge(
  payload: Record<string, unknown>,
  endpoint = "/api/xworkmate/bridge",
): Promise<BridgeRpcResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as BridgeRpcResponse;
  if (!response.ok) {
    throw new Error(
      data.error?.message || `Bridge request failed: ${response.status}`,
    );
  }

  return data;
}

async function pingBridge(
  endpoint = "/api/xworkmate/bridge",
): Promise<PingResponse> {
  const response = await fetch(`${endpoint}?action=ping`, {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Bridge ping failed: ${response.status}`);
  }

  return (await response.json()) as PingResponse;
}

/**
 * The XWorkmate conversation workspace, laid out like the App home. Inside
 * /ai-workspace the layout already renders the shell and its one sidebar, so
 * this renders only the conversation and artifact panes. Standing alone
 * (/xworkmate) it brings the same shell itself, never a second sidebar.
 */
export function XWorkmateWorkspacePage(
  props: XWorkmateWorkspacePageProps,
): ReactNode {
  const shell = useOptionalWorkspaceShell();
  if (shell) {
    return <ConversationWorkspace {...props} />;
  }
  return (
    <WorkspaceShellProvider
      homeHref="/xworkmate"
      initialTasks={() => (props.trialMode ? [newTask()] : seedTasks())}
    >
      <AiWorkspaceShell>
        <ConversationWorkspace {...props} />
      </AiWorkspaceShell>
    </WorkspaceShellProvider>
  );
}

function ConversationWorkspace({
  initialPrompt = "",
  initialSessionKey = "",
  trialMode = false,
}: XWorkmateWorkspacePageProps): ReactNode {
  const shell = useWorkspaceShell();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [files, setFiles] = useState<ComposerFile[]>([]);
  const [plugins, setPlugins] = useState<string[]>([]);
  const [role, setRole] = useState<AssistantRole>("chat");
  const [bridgeStatus, setBridgeStatus] = useState<
    "checking" | "connected" | "error"
  >("checking");
  const [bridgeVersion, setBridgeVersion] = useState("");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastError, setLastError] = useState("");
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const bridgeEndpoint = trialMode
    ? "/api/ai-workspace/free"
    : "/api/xworkmate/bridge";
  const isGuest = trialMode && trialStatus?.mode === "trial";
  // Bot team tasks run under the signed-in account; until the free endpoint
  // confirms one, the Bot roles stay locked.
  const botRolesLocked = trialMode && trialStatus?.mode !== "account";
  const registerHref = trialStatus?.registerHref ?? DEFAULT_REGISTER_HREF;

  const refreshTrialStatus = useCallback(async () => {
    if (!trialMode) {
      return;
    }
    try {
      const response = await fetch("/api/ai-workspace/free", {
        credentials: "include",
        cache: "no-store",
      });
      if (response.ok) {
        setTrialStatus((await response.json()) as TrialStatus);
      }
    } catch {
      // The Bridge status remains the primary connectivity signal.
    }
  }, [trialMode]);

  const activeTask = useMemo(
    () =>
      shell.tasks.find((task) => task.id === shell.activeTaskId) ??
      shell.tasks[0],
    [shell.activeTaskId, shell.tasks],
  );
  const currentFiles = activeTask?.files ?? [];
  const messages = activeTask?.messages ?? [];

  const checkBridge = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      setBridgeStatus("checking");
      try {
        const data = await pingBridge(bridgeEndpoint);
        if (isCancelled()) {
          return;
        }
        setBridgeStatus(data.status === "ok" ? "connected" : "error");
        setBridgeVersion(data.version ?? data.tag ?? data.commit ?? "");
        setLastError("");
      } catch (error) {
        if (!isCancelled()) {
          setBridgeStatus("error");
          setLastError(
            error instanceof Error ? error.message : "Bridge ping failed.",
          );
        }
      }
    },
    [bridgeEndpoint],
  );

  useEffect(() => {
    let cancelled = false;
    void checkBridge(() => cancelled);
    void refreshTrialStatus();
    return () => {
      cancelled = true;
    };
  }, [checkBridge, refreshTrialStatus]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (botRolesLocked && runsOnBotTeam(role)) setRole("chat");
  }, [botRolesLocked, role]);

  const appendMessage = (taskId: string, message: ConversationMessage) => {
    shell.updateTask(taskId, (task) => ({
      ...task,
      messages: [...task.messages, message],
    }));
  };

  const replaceMessage = (
    taskId: string,
    messageId: string,
    update: Partial<ConversationMessage>,
  ) => {
    shell.updateTask(taskId, (task) => ({
      ...task,
      messages: task.messages.map((message) =>
        message.id === messageId ? { ...message, ...update } : message,
      ),
    }));
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []).map((file) => ({
      id: makeId("file"),
      name: file.name,
      type: file.type,
      size: file.size,
    }));
    setFiles((current) => [...current, ...nextFiles]);
    event.target.value = "";
  };

  const composeTaskText = (trimmed: string): string => {
    const lines = [trimmed];
    if (plugins.length) lines.push(`使用内置插件：${plugins.join("、")}`);
    if (files.length) lines.push(`附件：${files.map((file) => file.name).join("、")}`);
    return lines.filter(Boolean).join("\n\n");
  };

  const startTurn = (task: TaskItem, trimmed: string) => {
    appendMessage(task.id, {
      id: makeId("msg"),
      role: "user",
      text: composeTaskText(trimmed),
    });
    shell.updateTask(task.id, (current) => ({
      ...current,
      title:
        current.title === "新对话"
          ? trimmed.slice(0, 24) || "附件任务"
          : current.title,
      state: "running",
    }));
    setPrompt("");
    setFiles([]);
    setPlugins([]);
    setLastError("");
  };

  const runChatTurn = async (task: TaskItem, taskText: string) => {
    const sessionId = initialSessionKey || task.id;
    const method = task.messages.length ? "session.message" : "session.start";
    const response = await callBridge(
      {
        jsonrpc: "2.0",
        id: makeId("rpc"),
        method,
        params: {
          sessionId,
          threadId: sessionId,
          taskPrompt: taskText,
          workingDirectory: workingDirectory || undefined,
          routing: {
            routingMode: "explicit",
            explicitExecutionTarget: "gateway",
            preferredGatewayProviderId: "openclaw",
          },
        },
      },
      bridgeEndpoint,
    );

    if (response.error) {
      throw new Error(response.error.message || "Bridge returned an error.");
    }

    const text = resultText(response.result);
    const artifacts = Array.isArray(response.result?.artifacts)
      ? response.result.artifacts
      : [];
    const remoteWorkingDirectory =
      typeof response.result?.remoteWorkingDirectory === "string"
        ? response.result.remoteWorkingDirectory
        : "";

    setWorkingDirectory(remoteWorkingDirectory || workingDirectory);
    const failed = response.result?.success === false;
    appendMessage(task.id, {
      id: makeId("msg"),
      role: "assistant",
      text: text || "任务已提交，bridge 返回了空结果。",
      error: failed,
    });
    shell.updateTask(task.id, (current) => ({
      ...current,
      preview: text || "任务已提交，bridge 返回了空结果。",
      state: failed ? "error" : "done",
      files: artifacts.length ? artifacts : current.files,
    }));
    void refreshTrialStatus();
  };

  /** 立即执行 with a Bot role: DS Bot runs it and the answer comes back here. */
  const runRoleTurn = async (task: TaskItem, taskText: string) => {
    const label = roleOption(role).label;
    const pendingId = makeId("msg");
    appendMessage(task.id, {
      id: pendingId,
      role: "assistant",
      header: label,
      text: BOT_TASK_PHASE_LABEL.queued,
      pending: true,
    });
    const controller = new AbortController();
    abortRef.current = controller;
    const receipt = await submitRoleTask(taskText, role);
    const view = await waitForRoleTask(receipt, {
      signal: controller.signal,
      onProgress: (progress) =>
        replaceMessage(task.id, pendingId, {
          header: roleAnswerHeader(progress, label),
          text: BOT_TASK_PHASE_LABEL[progress.phase],
        }),
    });
    const conversationHref = `/ai-workspace/conversation/${encodeURIComponent(receipt.sessionId)}`;
    if (view.phase === "completed") {
      replaceMessage(task.id, pendingId, {
        header: roleAnswerHeader(view, label),
        text: view.answer || "Bot 团队已完成，但没有返回文本结果。",
        pending: false,
      });
    } else if (view.phase === "failed" || view.phase === "rejected" || view.phase === "cancelled") {
      replaceMessage(task.id, pendingId, {
        header: roleAnswerHeader(view, label),
        text: view.error || BOT_TASK_PHASE_LABEL[view.phase],
        pending: false,
        error: true,
      });
    } else {
      replaceMessage(task.id, pendingId, {
        text: "任务仍在 Bot 团队运行，完成后可在会话中查看结果。",
        pending: false,
        link: { href: conversationHref, label: "查看进度" },
      });
    }
    shell.updateTask(task.id, (current) => ({
      ...current,
      preview: view.answer || view.error || BOT_TASK_PHASE_LABEL[view.phase],
      state: view.phase === "completed" ? "done" : view.phase === "failed" || view.phase === "rejected" ? "error" : "idle",
    }));
  };

  /** 交给 Bot 团队: hand the task off to run in the background. */
  const handOffTurn = async (task: TaskItem, taskText: string) => {
    const label = roleOption(role).label;
    const receipt = await submitRoleTask(taskText, role);
    appendMessage(task.id, {
      id: makeId("msg"),
      role: "note",
      text: `已交给 Bot 团队（${label}），任务会在后台执行。`,
      link: {
        href: `/ai-workspace/conversation/${encodeURIComponent(receipt.sessionId)}`,
        label: "查看进度",
      },
    });
    shell.updateTask(task.id, (current) => ({
      ...current,
      preview: `已交给 Bot 团队（${label}）`,
      state: "idle",
    }));
  };

  const submit = async (handOff: boolean) => {
    const trimmed = prompt.trim();
    if ((!trimmed && files.length === 0) || isSubmitting || !activeTask) {
      return;
    }
    const task = activeTask;
    const taskText = composeTaskText(trimmed);
    setIsSubmitting(true);
    startTurn(task, trimmed);
    try {
      if (handOff) {
        await handOffTurn(task, taskText);
      } else if (runsOnBotTeam(role)) {
        await runRoleTurn(task, taskText);
      } else {
        await runChatTurn(task, taskText);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bridge request failed.";
      setLastError(message);
      if (trialMode && message.includes("额度已用尽")) {
        setTrialStatus((current) =>
          current?.trial
            ? { ...current, trial: { ...current.trial, remaining: 0 } }
            : current,
        );
      }
      shell.updateTask(task.id, (current) => ({
        ...current,
        preview: message,
        state: "error",
        messages: current.messages.map((item) =>
          item.pending ? { ...item, pending: false, error: true, text: message } : item,
        ),
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit(false);
    }
  };

  const canSend = Boolean(prompt.trim() || files.length) && !isSubmitting;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-white text-[#1f2430]">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#eef1f5] px-3">
          <SidebarRevealButton />
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#17181c]">
            <PlayCircle className="size-4 text-[#075ecc]" />
            对话工作流
          </span>
          {isGuest ? (
            <span className="hidden rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 sm:inline">
              访客试用 · 剩余 {trialStatus?.trial?.remaining ?? "—"}/
              {trialStatus?.trial?.limit ?? "—"}
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden h-8 items-center gap-1.5 rounded-lg border border-[#e4e8ef] px-2.5 text-xs text-[#566174] sm:inline-flex">
              <Menu className="size-3.5" />
              渲染
              <ChevronDown className="size-3.5" />
            </span>
            <ConnectionChip
              status={bridgeStatus}
              version={bridgeVersion}
              onRetry={() => void checkBridge()}
            />
            <button
              type="button"
              data-testid="artifact-pane-toggle"
              onClick={() => setRightPanelOpen((open) => !open)}
              aria-label={rightPanelOpen ? "收起制品面板" : "展开制品面板"}
              aria-pressed={rightPanelOpen}
              className="hidden size-8 place-items-center rounded-lg text-[#697386] transition hover:bg-[#edf1f6] hover:text-[#17181c] lg:grid"
            >
              <PaneToggleIcon side="right" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-4 py-6">
          <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
            {messages.length === 0 ? (
              bridgeStatus === "error" ? (
                <ConnectBridgeCard
                  error={lastError}
                  onRetry={() => void checkBridge()}
                />
              ) : (
                <StartCard onStart={() => composerRef.current?.focus()} />
              )
            ) : (
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))
            )}
          </div>
        </div>

        <div className="shrink-0 bg-[#f8fafc] px-4 pb-4 pt-2">
          <div className="mx-auto max-w-[860px]">
            {lastError && messages.length > 0 ? (
              <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {lastError}
              </div>
            ) : null}
            {isGuest ? (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-blue-700">
                <span className="leading-5">
                  访客任务临时执行，不保存会话和下载制品。注册后可开启 7 天 Free 使用，并可交给 Bot 团队执行。
                </span>
                <a className="shrink-0 underline underline-offset-2" href={registerHref}>
                  去注册
                </a>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[#e1e6ed] bg-white p-3 shadow-[0_4px_18px_rgba(15,23,42,0.04)] transition focus-within:border-[#9cc0ef]">
              <div className="flex flex-wrap items-center gap-1.5">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <ComposerIconButton label="添加">
                      <Plus className="size-4" />
                    </ComposerIconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content align="start" sideOffset={6} className={menuClass}>
                      <DropdownMenu.Item
                        className={menuItemClass}
                        onSelect={() => document.getElementById("xworkmate-file-input")?.click()}
                      >
                        <Paperclip className="size-4 text-[#697386]" />
                        添加照片和文件
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
                <input
                  id="xworkmate-file-input"
                  data-testid="composer-file-input"
                  className="hidden"
                  multiple
                  type="file"
                  onChange={handleFileInput}
                />

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <ComposerIconButton label="内置插件" active={plugins.length > 0}>
                      <Puzzle className="size-4" />
                    </ComposerIconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content align="start" sideOffset={6} className={cn(menuClass, "w-[360px]")}>
                      {BUILTIN_PLUGIN_GROUPS.map((group) => (
                        <DropdownMenu.Group key={group.category}>
                          <DropdownMenu.Label className="px-2.5 pb-1 pt-2 text-xs text-[#8a93a2]">
                            {group.category}
                          </DropdownMenu.Label>
                          {group.items.map((plugin) => {
                            const selected = plugins.includes(plugin.name);
                            return (
                              <DropdownMenu.CheckboxItem
                                key={plugin.name}
                                checked={selected}
                                onCheckedChange={(checked) =>
                                  setPlugins((current) =>
                                    checked
                                      ? [...current, plugin.name]
                                      : current.filter((name) => name !== plugin.name),
                                  )
                                }
                                onSelect={(event) => event.preventDefault()}
                                className={menuItemClass}
                              >
                                <span className={cn("grid size-6 shrink-0 place-items-center rounded-md text-white", plugin.color)}>
                                  <plugin.icon className="size-3.5" />
                                </span>
                                <span className="shrink-0 font-medium">{plugin.name}</span>
                                <span className="min-w-0 flex-1 truncate text-xs text-[#8a93a2]">
                                  {plugin.desc}
                                </span>
                                {selected ? <Check className="size-4 text-[#075ecc]" /> : null}
                              </DropdownMenu.CheckboxItem>
                            );
                          })}
                        </DropdownMenu.Group>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>

                <RoleMenu role={role} onChange={setRole} locked={botRolesLocked} />

                <span
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[#697386]"
                  title="模型：由 Bridge 默认路由"
                >
                  <Zap className="size-4" />
                </span>
              </div>

              {files.length > 0 || plugins.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {plugins.map((name) => (
                    <Chip
                      key={name}
                      icon={<Puzzle className="size-3.5" />}
                      label={name}
                      onRemove={() =>
                        setPlugins((current) => current.filter((item) => item !== name))
                      }
                    />
                  ))}
                  {files.map((file) => (
                    <Chip
                      key={file.id}
                      icon={
                        file.type.startsWith("image/") ? (
                          <ImageIcon className="size-3.5" />
                        ) : (
                          <File className="size-3.5" />
                        )
                      }
                      label={file.name}
                      onRemove={() =>
                        setFiles((current) => current.filter((item) => item.id !== file.id))
                      }
                    />
                  ))}
                </div>
              ) : null}

              <textarea
                id="xworkmate-composer"
                ref={composerRef}
                className="mt-2 h-[88px] w-full resize-none bg-transparent px-1 text-sm leading-6 outline-none placeholder:text-[#9aa3b2]"
                placeholder="输入需求、补充上下文，XWorkmate 会沿用当前任务上下文持续处理。"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={onComposerKeyDown}
              />

              <div className="flex items-center justify-end gap-2">
                {runsOnBotTeam(role) ? (
                  <button
                    type="button"
                    data-testid="hand-off-button"
                    disabled={!canSend}
                    onClick={() => void submit(true)}
                    title="放到后台由 Bot 团队执行，结果在会话中查看"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#d7dde6] bg-white px-3 text-sm text-[#3d4553] transition hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="size-3.5" />
                    交给 Bot 团队
                  </button>
                ) : null}
                <button
                  type="button"
                  data-testid="send-button"
                  disabled={!canSend}
                  onClick={() => void submit(false)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#075ecc] px-3.5 text-sm font-medium text-white transition hover:bg-[#0452b6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                  立即执行
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {rightPanelOpen ? (
        <aside className="hidden w-[320px] shrink-0 flex-col border-l border-[#eef1f5] bg-white p-3 lg:flex">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-medium text-[#17181c]">
                {activeTask?.title || "未命名对话"}
              </h2>
              <p className="text-xs text-[#8a93a2]">当前任务工作路径</p>
            </div>
            <button
              type="button"
              onClick={() => void checkBridge()}
              aria-label="刷新 Bridge 状态"
              className="grid size-8 place-items-center rounded-lg text-[#697386] transition hover:bg-[#edf1f6]"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#e4e8ef] px-2.5 py-2 text-xs text-[#566174]">
            <Cloud className="size-3.5 shrink-0" />
            <span className="truncate">{workingDirectory || "未设置"}</span>
            <Copy className="ml-auto size-3.5 shrink-0" />
          </div>
          <div className="mt-3 flex rounded-lg bg-[#f3f5f8] p-1 text-xs">
            <span className="rounded-md bg-white px-3 py-1 text-[#17181c] shadow-sm">全部文件</span>
            <span className="px-3 py-1 text-[#697386]">预览</span>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center text-center">
            {currentFiles.length > 0 ? (
              <div className="w-full space-y-1.5 self-start pt-4">
                {currentFiles.map((file, index) => (
                  <div
                    key={`${file.name ?? file.path ?? "file"}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-[#e4e8ef] px-3 py-2 text-left"
                  >
                    <File className="size-4 text-[#697386]" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {file.name ?? file.path ?? file.url ?? "未命名文件"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <Folder className="mx-auto size-8 text-[#c5ccd6]" />
                <div className="mt-3 text-sm text-[#3d4553]">暂无文件</div>
                <p className="mt-1 text-xs text-[#8a93a2]">当前会话还没有可展示的制品。</p>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-[#f6f8fb] px-2.5 py-1.5 text-eyebrow text-[#697386]">
            Bridge: {bridgeStatus}
            {bridgeVersion ? ` · ${bridgeVersion.slice(0, 12)}` : ""}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

const menuClass =
  "z-50 min-w-[220px] rounded-xl border border-[#e4e8ef] bg-white p-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)]";
const menuItemClass =
  "flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-[#3d4553] outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-[#f0f3f7]";

function ConnectionChip({
  status,
  version,
  onRetry,
}: {
  status: "checking" | "connected" | "error";
  version: string;
  onRetry: () => void;
}) {
  const label =
    status === "connected" ? "Bridge 已连接" : status === "checking" ? "连接中…" : "Bridge 未连接";
  return (
    <button
      type="button"
      onClick={onRetry}
      data-testid="connection-chip"
      title={version ? `Bridge ${version}` : "重新检查 Bridge 连接"}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e4e8ef] px-2.5 text-xs text-[#566174] transition hover:bg-[#f6f8fb]"
    >
      <span
        className={cn(
          "size-2 rounded-full",
          status === "connected" && "bg-emerald-500",
          status === "checking" && "bg-amber-400",
          status === "error" && "bg-red-500",
        )}
      />
      {label}
    </button>
  );
}

function ConnectBridgeCard({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="mx-auto mt-6 w-full max-w-[560px] rounded-2xl border border-[#e4e8ef] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
          <Plug className="size-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-[#17181c]">先连接 Bridge</h1>
          <p className="mt-1 text-sm leading-6 text-[#697386]">
            XWorkmate 通过 Bridge 调用模型与工具。连接恢复后即可开始对话或运行任务。
          </p>
          {error ? (
            <p className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-600">{error}</p>
          ) : null}
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#075ecc] px-3.5 text-sm font-medium text-white transition hover:bg-[#0452b6]"
          >
            <RefreshCw className="size-4" />
            重新连接
          </button>
        </div>
      </div>
    </div>
  );
}

function StartCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto mt-6 w-full max-w-[560px] rounded-2xl border border-[#e4e8ef] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#075ecc]">
          <Pencil className="size-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-[#17181c]">开始对话或运行任务</h1>
          <p className="mt-1 text-sm leading-6 text-[#697386]">
            输入需求，连接模型与工具，让 XWorkmate 帮你把想法推进到结果。Chat 直接回答；其他角色交给 Bot 团队执行。
          </p>
          <button
            type="button"
            onClick={onStart}
            className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#075ecc] px-3.5 text-sm font-medium text-white transition hover:bg-[#0452b6]"
          >
            <Pencil className="size-4" />
            开始输入
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  if (message.role === "note") {
    return (
      <div className="mx-auto flex items-center gap-2 rounded-full border border-[#e4e8ef] bg-white px-3 py-1.5 text-xs text-[#566174]">
        <Bot className="size-3.5 text-[#075ecc]" />
        <span>{message.text}</span>
        {message.link ? (
          <Link href={message.link.href} className="text-[#075ecc] underline underline-offset-2">
            {message.link.label}
          </Link>
        ) : null}
      </div>
    );
  }
  const isUser = message.role === "user";
  return (
    <article className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-6",
          isUser
            ? "rounded-br-md bg-[#075ecc] text-white"
            : "rounded-bl-md border border-[#e4e8ef] bg-white text-[#252a34]",
          message.error && "border-red-200 bg-red-50 text-red-700",
        )}
      >
        {message.header ? (
          <div className="mb-1 flex items-center gap-1.5 text-xs text-[#697386]">
            <Bot className="size-3.5" />
            {message.header}
          </div>
        ) : null}
        <p className="whitespace-pre-wrap break-words">
          {message.pending ? (
            <Loader2 className="mr-1.5 inline size-3.5 animate-spin align-[-2px]" />
          ) : null}
          {message.text}
        </p>
        {message.link ? (
          <Link
            href={message.link.href}
            className="mt-1 inline-block text-xs text-[#075ecc] underline underline-offset-2"
          >
            {message.link.label}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function RoleMenu({
  role,
  onChange,
  locked,
}: {
  role: AssistantRole;
  onChange: (role: AssistantRole) => void;
  locked: boolean;
}) {
  const current = roleOption(role);
  const Icon = runsOnBotTeam(role) ? Bot : MessageCircle;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          data-testid="role-button"
          aria-label={`角色：${current.label}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e4e8ef] bg-white px-2.5 text-sm text-[#3d4553] transition hover:bg-[#f6f8fb]"
        >
          <Icon className="size-4 text-[#075ecc]" />
          {current.label}
          <ChevronDown className="size-3.5 text-[#8a93a2]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className={cn(menuClass, "w-[280px]")}>
          <DropdownMenu.Label className="px-2.5 pb-1 pt-1.5 text-xs text-[#8a93a2]">
            Chat ⟶ Worker ⟶ Engineer ⟶ Architect ⟷ Researcher ⟶ Specialist
          </DropdownMenu.Label>
          {ASSISTANT_ROLES.map((option) => {
            const optionLocked = locked && runsOnBotTeam(option.value);
            return (
              <DropdownMenu.Item
                key={option.value}
                data-testid={`role-option-${option.value}`}
                disabled={optionLocked}
                onSelect={() => onChange(option.value)}
                className={menuItemClass}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{option.label}</span>
                  <span className="block truncate text-xs text-[#8a93a2]">
                    {optionLocked ? "登录账号后可交给 Bot 团队" : option.description}
                  </span>
                </span>
                {option.value === role ? <Check className="size-4 text-[#075ecc]" /> : null}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const ComposerIconButton = forwardRef<
  HTMLButtonElement,
  { label: string; active?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>
>(function ComposerIconButton({ label, active = false, children, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn(
        "grid size-8 place-items-center rounded-lg border border-[#e4e8ef] bg-white text-[#697386] transition hover:bg-[#f6f8fb] hover:text-[#17181c]",
        active && "border-[#b9d3f5] bg-[#eef5fe] text-[#075ecc]",
        className,
      )}
    >
      {children}
    </button>
  );
});

function Chip({
  icon,
  label,
  onRemove,
}: {
  icon: ReactNode;
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-[280px] items-center gap-1.5 rounded-lg border border-[#e4e8ef] bg-[#f8fafc] px-2 py-1 text-xs text-[#566174]">
      {icon}
      <span className="truncate">{label}</span>
      <button type="button" onClick={onRemove} aria-label={`移除 ${label}`}>
        <X className="size-3.5" />
      </button>
    </span>
  );
}
