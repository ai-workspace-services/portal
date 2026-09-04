"use client";

import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronsRight,
  Cloud,
  Copy,
  File,
  Folder,
  Image as ImageIcon,
  KeyRound,
  Languages,
  ListChecks,
  Loader2,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sun,
  X,
  Zap,
} from "lucide-react";

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

type WorkspaceArtifact = {
  name?: string;
  path?: string;
  url?: string;
  mimeType?: string;
  size?: number;
};

type TaskItem = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  state: "idle" | "running" | "done" | "error";
  files: WorkspaceArtifact[];
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

const SEED_TASKS: TaskItem[] = [
  {
    id: "task-images",
    title: "连续制作7张图片",
    preview: "等待通过 bridge 重新提交任务。",
    updatedAt: Date.now() - 55 * 60 * 1000,
    state: "idle",
    files: [],
  },
  {
    id: "task-new-1",
    title: "新对话",
    preview: "Bridge 响应读取中断，本轮结果未完成。请重新发送请求。",
    updatedAt: Date.now() - 55 * 60 * 1000,
    state: "idle",
    files: [],
  },
  {
    id: "task-pdf",
    title: "PDF制作",
    preview: "完成了，PDF 已输出在任务工作区内。",
    updatedAt: Date.now() - 65 * 60 * 1000,
    state: "done",
    files: [{ name: "result.pdf" }],
  },
  {
    id: "task-video",
    title: "视频制作",
    preview: "等待通过 bridge 重新提交任务。",
    updatedAt: Date.now() - 55 * 60 * 1000,
    state: "idle",
    files: [],
  },
  {
    id: "task-new-2",
    title: "新对话",
    preview: "invalid handshake: first request must be connect",
    updatedAt: Date.now() - 55 * 60 * 1000,
    state: "idle",
    files: [],
  },
  {
    id: "task-current",
    title: "新对话",
    preview: "",
    updatedAt: Date.now() - 55 * 60 * 1000,
    state: "idle",
    files: [],
  },
];

function formatRelativeTime(value: number): string {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - value) / 60000));
  if (elapsedMinutes < 1) {
    return "刚刚";
  }
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} 分钟前`;
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `${elapsedHours} 小时前`;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

export function XWorkmateWorkspacePage({
  initialPrompt = "",
  initialSessionKey = "",
  trialMode = false,
}: XWorkmateWorkspacePageProps): React.ReactNode {
  const [tasks, setTasks] = useState<TaskItem[]>(() =>
    trialMode
      ? [
          {
            id: "task-current",
            title: "新对话",
            preview: "",
            updatedAt: Date.now(),
            state: "idle",
            files: [],
          },
        ]
      : SEED_TASKS,
  );
  const [activeTaskId, setActiveTaskId] = useState("task-current");
  const [prompt, setPrompt] = useState(initialPrompt);
  const [files, setFiles] = useState<ComposerFile[]>([]);
  const [bridgeStatus, setBridgeStatus] = useState<
    "checking" | "connected" | "error"
  >("checking");
  const [bridgeVersion, setBridgeVersion] = useState("");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastError, setLastError] = useState("");
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);

  const bridgeEndpoint = trialMode
    ? "/api/ai-workspace/trial"
    : "/api/xworkmate/bridge";

  const refreshTrialStatus = async () => {
    if (!trialMode) {
      return;
    }
    try {
      const response = await fetch("/api/ai-workspace/trial", {
        credentials: "include",
        cache: "no-store",
      });
      if (response.ok) {
        setTrialStatus((await response.json()) as TrialStatus);
      }
    } catch {
      // The Bridge status remains the primary connectivity signal.
    }
  };

  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) ?? tasks[0],
    [activeTaskId, tasks],
  );
  const currentFiles = activeTask?.files ?? [];
  const sessionId = initialSessionKey || activeTaskId;

  useEffect(() => {
    let cancelled = false;

    async function checkBridge() {
      try {
        const data = await pingBridge(bridgeEndpoint);
        if (cancelled) {
          return;
        }
        setBridgeStatus(data.status === "ok" ? "connected" : "error");
        setBridgeVersion(data.version ?? data.tag ?? data.commit ?? "");
      } catch (error) {
        if (!cancelled) {
          setBridgeStatus("error");
          setLastError(
            error instanceof Error ? error.message : "Bridge ping failed.",
          );
        }
      }
    }

    void checkBridge();
    void refreshTrialStatus();

    return () => {
      cancelled = true;
    };
  }, [bridgeEndpoint]);

  const updateActiveTask = (partial: Partial<TaskItem>) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === activeTaskId
          ? { ...task, ...partial, updatedAt: Date.now() }
          : task,
      ),
    );
  };

  const createTask = () => {
    const task: TaskItem = {
      id: makeId("task"),
      title: "新对话",
      preview: "",
      updatedAt: Date.now(),
      state: "idle",
      files: [],
    };
    setTasks((current) => [task, ...current]);
    setActiveTaskId(task.id);
    setPrompt("");
    setLastError("");
    setWorkingDirectory("");
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

  const submitPrompt = async () => {
    const trimmed = prompt.trim();
    if (!trimmed && files.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setLastError("");
    updateActiveTask({
      title: trimmed.slice(0, 24) || "附件任务",
      preview: "Bridge 正在处理当前任务...",
      state: "running",
    });

    try {
      const method =
        activeTask?.state === "done" || activeTask?.state === "error"
          ? "session.message"
          : "session.start";
      const attachmentContext = files.length
        ? `\n\n附件：${files.map((file) => file.name).join("、")}`
        : "";
      const response = await callBridge({
        jsonrpc: "2.0",
        id: makeId("rpc"),
        method,
        params: {
          sessionId,
          threadId: sessionId,
          taskPrompt: `${trimmed}${attachmentContext}`.trim(),
          workingDirectory: workingDirectory || undefined,
          routing: {
            routingMode: "explicit",
            explicitExecutionTarget: "gateway",
            preferredGatewayProviderId: "openclaw",
          },
        },
      }, bridgeEndpoint);

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
      updateActiveTask({
        preview: text || "任务已提交，bridge 返回了空结果。",
        state: response.result?.success === false ? "error" : "done",
        files: artifacts,
      });
      setPrompt("");
      setFiles([]);
      void refreshTrialStatus();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bridge request failed.";
      setLastError(message);
      if (trialMode && message.includes("额度已用尽")) {
        setTrialStatus((current) =>
          current
            ? { ...current, trial: { ...current.trial!, remaining: 0 } }
            : current,
        );
      }
      updateActiveTask({
        preview: message,
        state: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex h-full min-h-0 w-full overflow-hidden bg-[#f7f8fa] text-[#1f2430]">
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-slate-200/80 bg-white">
        <div className="flex h-full min-h-0 flex-col p-4">
          <div className="mb-3 flex items-center gap-2.5 text-base font-bold text-slate-700">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-2">XWorkmate</span>
            {trialMode && trialStatus?.mode === "trial" ? (
              <span className="ml-auto rounded-full bg-blue-50 px-2 py-1 text-eyebrow font-semibold text-blue-700">
                访客试用 · 剩余 {trialStatus.trial?.remaining ?? "—"}/
                {trialStatus.trial?.limit ?? "—"}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
              placeholder="搜索任务"
              type="search"
            />
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          </div>

          <button
            className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0d63c7] text-sm font-bold text-white shadow-[0_6px_14px_rgba(13,99,199,0.16)] transition hover:bg-[#0a56b0]"
            type="button"
            onClick={createTask}
          >
            <ListChecks className="h-4 w-4" />
            新对话
          </button>

          <div className="mt-5 flex items-center justify-between text-sm font-bold">
            <span>任务列表</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
            <ChevronDown className="h-4 w-4" />
            <Cloud className="h-4 w-4" />
            <span>Gateway</span>
            <span className="ml-auto">{tasks.length}</span>
          </div>

          <div className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {tasks.map((task) => (
              <button
                key={task.id}
                className={cn(
                  "grid w-full grid-cols-[30px_minmax(0,1fr)_54px] gap-2 rounded-xl px-2 py-2.5 text-left transition",
                  activeTaskId === task.id
                    ? "bg-slate-100"
                    : "hover:bg-slate-50",
                )}
                type="button"
                onClick={() => setActiveTaskId(task.id)}
              >
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                  <ListChecks className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {task.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs font-medium leading-snug text-slate-400">
                    {task.preview}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-2 text-eyebrow font-semibold text-slate-400">
                  {formatRelativeTime(task.updatedAt)}
                  <span className="rounded-md bg-white p-1 shadow-sm">
                    <Copy className="h-3 w-3" />
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <SideMenuItem icon={Settings} label="设置" />
            <SideMenuItem icon={Languages} label="语言" badge="中" />
            <SideMenuItem icon={Sun} label="主题" badge="浅色" />
            {trialMode && trialStatus?.mode === "trial" ? (
              <a
                className="mt-3 block rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold leading-6 text-blue-700"
                href={
                  trialStatus.registerHref ??
                  "/register?returnTo=%2Fai-workspace%3Fentry%3Dtrial"
                }
              >
                注册后保存会话与下载制品 →
              </a>
            ) : null}
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col border-r border-slate-200/80 bg-[#f8fafc]">
        <header className="flex h-[64px] shrink-0 items-center justify-end gap-2 border-b border-slate-200/80 bg-white px-4">
          <ToolbarPill compact>
            <Menu className="h-3.5 w-3.5" />
            渲染
            <ChevronDown className="h-3.5 w-3.5" />
          </ToolbarPill>
          <ToolbarPill strong compact>已连接 · xworkmate-bridge.svc.plus</ToolbarPill>
              <button
                className="ml-1 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            type="button"
            onClick={() => setRightPanelOpen((open) => !open)}
          >
            <ChevronsRight className="h-6 w-6" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto mt-10 w-[min(720px,calc(100%-48px))] rounded-2xl border border-slate-200/80 bg-white p-7 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">开始对话或运行任务</h1>
                <p className="mt-2 text-body font-medium leading-6 text-slate-500">
                  输入需求，连接模型与工具，让 XWorkmate 帮你把想法推进到结果。
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-full bg-slate-50 px-3 py-1.5">计划任务</span>
              <span className="rounded-full bg-slate-50 px-3 py-1.5">连接工具</span>
              <span className="rounded-full bg-slate-50 px-3 py-1.5">交付制品</span>
            </div>
            <p className="mt-4 text-xs font-medium text-slate-400">
              结果会回到当前会话，并在可用时同步到任务页。
            </p>
            <button
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0d63c7] px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_14px_rgba(13,99,199,0.2)] transition hover:bg-[#0a56b0]"
              type="button"
              onClick={() =>
                document.getElementById("xworkmate-composer")?.focus()
              }
            >
              <Pencil className="h-4 w-4" />
              开始输入
            </button>
          </div>

          {activeTask?.preview ? (
            <div className="mx-auto mt-5 w-[min(820px,calc(100%-48px))] rounded-2xl border border-slate-200/80 bg-white p-5 text-body font-medium leading-7 text-slate-700 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">
                {activeTask.state === "running" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                当前任务结果
              </div>
              <pre className="whitespace-pre-wrap break-words font-sans">
                {activeTask.preview}
              </pre>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-[#f8fafc] px-4 pb-4 pt-3">
          <div className="mx-auto max-w-[1000px]">
            <div className="mb-2 flex items-center gap-2">
              <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-blue-200 hover:text-blue-600">
                <Plus className="h-4 w-4" />
                <input
                  className="hidden"
                  multiple
                  type="file"
                  onChange={handleFileInput}
                />
              </label>
              <ToolbarPill compact>
                <Cloud className="h-4 w-4" />
                Gateway
                <ChevronDown className="h-4 w-4" />
              </ToolbarPill>
              <ToolbarPill compact>
                <Zap className="h-4 w-4" />
                OpenClaw
                <ChevronDown className="h-4 w-4" />
              </ToolbarPill>
              <button
                className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-blue-200 hover:text-blue-600"
                type="button"
              >
                <Zap className="mx-auto h-4 w-4" />
              </button>
            </div>

            {files.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.map((file) => (
                  <span
                    key={file.id}
                    className="inline-flex max-w-[320px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500"
                  >
                    {file.type.startsWith("image/") ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : (
                      <File className="h-5 w-5" />
                    )}
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((item) => item.id !== file.id),
                        )
                      }
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <textarea
              id="xworkmate-composer"
              className="h-[104px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-body font-medium leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="输入需求、补充上下文，XWorkmate 会沿用当前任务上下文持续处理。"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />

            {lastError ? (
              <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                {lastError}
              </div>
            ) : null}

            {trialMode && trialStatus?.mode === "trial" ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs font-semibold text-blue-700">
                <span className="leading-5">
                  访客任务临时执行，不保存会话和下载制品。注册后可开启 7 天 Free 使用。
                </span>
                <a
                  className="shrink-0 underline underline-offset-2"
                  href={
                    trialStatus.registerHref ??
                    "/register?returnTo=%2Fai-workspace%3Fentry%3Dtrial"
                  }
                >
                  去注册
                </a>
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ToolbarPill compact>
                  <KeyRound className="h-3.5 w-3.5" />
                  <ChevronDown className="h-4 w-4" />
                </ToolbarPill>
                <ToolbarPill compact>
                  <span className="text-lg">ⓘ</span>
                  <ChevronDown className="h-4 w-4" />
                </ToolbarPill>
                <ToolbarPill compact>
                  <span className="text-lg">?</span>
                  <ChevronDown className="h-4 w-4" />
                </ToolbarPill>
              </div>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0d63c7] px-4 text-sm font-bold text-white shadow-[0_6px_14px_rgba(13,99,199,0.18)] transition hover:bg-[#0a56b0] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="button"
                onClick={submitPrompt}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
                提交
              </button>
            </div>
          </div>
        </div>
      </section>

      {rightPanelOpen ? (
        <aside className="flex w-[340px] shrink-0 flex-col bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold">
                {activeTask?.title || "未命名对话"}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                当前任务工作路径
              </p>
            </div>
            <div className="flex gap-3 text-slate-500">
              <button type="button" onClick={() => void pingBridge()}>
                <RefreshCw className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => setRightPanelOpen(false)}>
                <ChevronsRight className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500">
            <Cloud className="h-4 w-4" />
            <span className="truncate">{workingDirectory || "未设置"}</span>
            <Copy className="ml-auto h-5 w-5" />
          </div>
          <div className="mt-3 flex rounded-xl border border-slate-200 bg-slate-50 p-1.5 text-sm font-bold text-slate-500">
            <button
              className="rounded-lg bg-white px-4 py-1.5 text-slate-900 shadow-sm"
              type="button"
            >
              全部文件
            </button>
            <button className="px-4 py-1.5" type="button">
              预览
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center text-center">
            {currentFiles.length > 0 ? (
              <div className="w-full space-y-2 self-start pt-6">
                {currentFiles.map((file, index) => (
                  <div
                    key={`${file.name ?? file.path ?? "file"}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left"
                  >
                    <File className="h-5 w-5 text-slate-500" />
                    <span className="min-w-0 flex-1 truncate text-base font-semibold">
                      {file.name ?? file.path ?? file.url ?? "未命名文件"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <Folder className="mx-auto h-9 w-9 text-slate-300" />
                <div className="mt-4 text-sm font-bold text-slate-700">暂无文件</div>
                <p className="mt-2 text-xs font-medium text-slate-400">
                  当前会话还没有可展示的制品。
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-eyebrow font-semibold text-slate-500">
            Bridge: {bridgeStatus === "connected" ? "connected" : bridgeStatus}
            {bridgeVersion ? ` · ${bridgeVersion.slice(0, 12)}` : ""}
          </div>
        </aside>
      ) : null}
    </main>
  );
}

function SideMenuItem({
  icon: Icon,
  label,
  badge,
}: {
  icon: typeof Settings;
  label: string;
  badge?: string;
}) {
  return (
    <div className="flex h-16 items-center gap-4 text-lg font-bold text-slate-500">
      <Icon className="h-6 w-6" />
      <span>{label}</span>
      {badge ? (
        <span className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-base shadow-sm">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function ToolbarPill({
  children,
  strong = false,
  compact = false,
}: {
  children: ReactNode;
  strong?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-500 shadow-sm",
        compact ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm",
        strong && "bg-blue-50 text-slate-600",
      )}
    >
      {children}
    </span>
  );
}
