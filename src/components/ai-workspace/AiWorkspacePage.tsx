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

type AiWorkspacePageProps = {
  initialPrompt?: string;
  initialSessionKey?: string;
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
): Promise<BridgeRpcResponse> {
  const response = await fetch("/api/ai-workspace/bridge", {
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

async function pingBridge(): Promise<PingResponse> {
  const response = await fetch("/api/ai-workspace/bridge?action=ping", {
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

export function AiWorkspacePage({
  initialPrompt = "",
  initialSessionKey = "",
}: AiWorkspacePageProps): React.ReactNode {
  const [tasks, setTasks] = useState<TaskItem[]>(SEED_TASKS);
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
        const data = await pingBridge();
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

    return () => {
      cancelled = true;
    };
  }, []);

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
      });

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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bridge request failed.";
      setLastError(message);
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
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-full min-h-0 flex-col p-4">
          <div className="mb-4 flex items-center gap-3 text-xs font-bold text-slate-600">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-3">XWorkmate</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Search className="h-5 w-5 shrink-0 text-slate-500" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
              placeholder="搜索任务"
              type="search"
            />
            <ChevronLeft className="h-6 w-6 text-slate-500" />
          </div>

          <button
            className="mt-4 flex h-9 items-center justify-center gap-3 rounded-md bg-[#0d63c7] text-sm font-bold text-white shadow-sm"
            type="button"
            onClick={createTask}
          >
            <ListChecks className="h-5 w-5" />
            新对话
          </button>

          <div className="mt-5 flex items-center justify-between text-sm font-bold">
            <span>任务列表</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
            <ChevronDown className="h-4 w-4" />
            <Cloud className="h-5 w-5" />
            <span>Gateway</span>
            <span className="ml-auto">{tasks.length}</span>
          </div>

          <div className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {tasks.map((task) => (
              <button
                key={task.id}
                className={cn(
                  "grid w-full grid-cols-[36px_minmax(0,1fr)_92px] gap-2 rounded-md px-3 py-3 text-left transition",
                  activeTaskId === task.id
                    ? "bg-slate-100"
                    : "hover:bg-slate-50",
                )}
                type="button"
                onClick={() => setActiveTaskId(task.id)}
              >
                <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600">
                  <ListChecks className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {task.title}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs font-semibold leading-snug text-slate-400">
                    {task.preview}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-4 text-xs font-semibold text-slate-400">
                  {formatRelativeTime(task.updatedAt)}
                  <span className="rounded-md bg-white p-1 shadow-sm">
                    <Copy className="h-4 w-4" />
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-300 pt-5">
            <SideMenuItem icon={Settings} label="设置" />
            <SideMenuItem icon={Languages} label="语言" badge="中" />
            <SideMenuItem icon={Sun} label="主题" badge="浅色" />
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col border-r border-slate-200 bg-[#f8fafc]">
        <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-slate-200 bg-white px-3">
          <ToolbarPill>
            <Menu className="h-4 w-4" />
            渲染
            <ChevronDown className="h-4 w-4" />
          </ToolbarPill>
          <ToolbarPill strong>已连接 · xworkmate-bridge.svc.plus</ToolbarPill>
          <button
            className="ml-3 rounded-full p-2 text-slate-500 hover:bg-slate-100"
            type="button"
            onClick={() => setRightPanelOpen((open) => !open)}
          >
            <ChevronsRight className="h-6 w-6" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto mt-16 max-w-md rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h1 className="text-xs font-bold">开始对话或运行任务</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              输入需求后即可开始执行，结果会回到当前会话并同步到任务页。
            </p>
            <button
              className="mt-4 inline-flex items-center gap-3 rounded-lg bg-[#0d63c7] px-3 py-2.5 text-sm font-bold text-white"
              type="button"
              onClick={() =>
                document.getElementById("xworkmate-composer")?.focus()
              }
            >
              <Pencil className="h-5 w-5" />
              开始输入
            </button>
          </div>

          {activeTask?.preview ? (
            <div className="mx-auto mt-6 max-w-2xl rounded-md border border-slate-200 bg-white p-4 text-xs font-medium leading-7 text-slate-700 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-400">
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
            <div className="mb-3 flex items-center gap-2">
              <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500">
                <Plus className="h-5 w-5" />
                <input
                  className="hidden"
                  multiple
                  type="file"
                  onChange={handleFileInput}
                />
              </label>
              <ToolbarPill>
                <Cloud className="h-5 w-5" />
                Gateway
                <ChevronDown className="h-4 w-4" />
              </ToolbarPill>
              <ToolbarPill>
                <Zap className="h-5 w-5" />
                OpenClaw
                <ChevronDown className="h-4 w-4" />
              </ToolbarPill>
              <button
                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500"
                type="button"
              >
                <Zap className="mx-auto h-5 w-5" />
              </button>
            </div>

            {files.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.map((file) => (
                  <span
                    key={file.id}
                    className="inline-flex max-w-[320px] items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500"
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
              className="h-24 w-full resize-none rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-400"
              placeholder="输入需求、补充上下文，XWorkmate 会沿用当前任务上下文持续处理。"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />

            {lastError ? (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
                {lastError}
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ToolbarPill>
                  <KeyRound className="h-4 w-4" />
                  <ChevronDown className="h-4 w-4" />
                </ToolbarPill>
                <ToolbarPill>
                  <span className="text-sm">ⓘ</span>
                  <ChevronDown className="h-4 w-4" />
                </ToolbarPill>
                <ToolbarPill>
                  <span className="text-sm">?</span>
                  <ChevronDown className="h-4 w-4" />
                </ToolbarPill>
              </div>
              <button
                className="inline-flex h-8 items-center gap-2 rounded-md bg-[#0d63c7] px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
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
        <aside className="flex w-[320px] shrink-0 flex-col bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xs font-bold">
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
          <div className="mt-3 flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">
            <Cloud className="h-5 w-5" />
            <span className="truncate">{workingDirectory || "未设置"}</span>
            <Copy className="ml-auto h-5 w-5" />
          </div>
          <div className="mt-3 flex rounded-md border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-500">
            <button
              className="rounded-md bg-white px-3 py-2 text-slate-900 shadow-sm"
              type="button"
            >
              全部文件
            </button>
            <button className="px-3 py-2" type="button">
              预览
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center text-center">
            {currentFiles.length > 0 ? (
              <div className="w-full space-y-2 self-start pt-6">
                {currentFiles.map((file, index) => (
                  <div
                    key={`${file.name ?? file.path ?? "file"}-${index}`}
                    className="flex items-center gap-3 rounded-md border border-slate-200 px-4 py-3 text-left"
                  >
                    <File className="h-5 w-5 text-slate-500" />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                      {file.name ?? file.path ?? file.url ?? "未命名文件"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <Folder className="mx-auto h-10 w-10 text-slate-400" />
                <div className="mt-5 text-sm font-bold">暂无文件</div>
                <p className="mt-3 text-xs font-semibold text-slate-500">
                  No recorded working directory for this thread.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
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
    <div className="flex h-10 items-center gap-4 text-sm font-bold text-slate-500">
      <Icon className="h-6 w-6" />
      <span>{label}</span>
      {badge ? (
        <span className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function ToolbarPill({
  children,
  strong = false,
}: {
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-500 shadow-sm",
        strong && "bg-blue-50 text-slate-600",
      )}
    >
      {children}
    </span>
  );
}
