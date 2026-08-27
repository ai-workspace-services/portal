"use client";

import {
  Archive,
  Bell,
  Clock3,
  FileText,
  Layers3,
  MessageSquareText,
  Plus,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  listTaskNamespaces,
  listTaskSessions,
} from "@/lib/ai-workspace/sessionApi";
import { cn } from "@/lib/utils";

type WorkbenchTab = "overview" | "models" | "todo" | "projects" | "inbox";
type ActivityWindow = "all" | "30d" | "7d";
type SessionState = "running" | "waiting" | "completed" | "cancelled";

type ServerSession = {
  sessionId: string;
  namespaceId: string;
  title: string;
  state: SessionState;
  updatedAt: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  messageCount: number;
  artifactCount: number;
  artifactPaths: string[];
  projectLabel: string;
};

type ModelSummary = {
  model: string;
  input: number;
  output: number;
  share: number;
};

const tabs: Array<{ id: WorkbenchTab; label: string }> = [
  { id: "overview", label: "数据总览" },
  { id: "models", label: "模型分析" },
  { id: "todo", label: "我的待办" },
  { id: "projects", label: "项目 / 专项" },
  { id: "inbox", label: "收件箱" },
];

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function numberValue(...values: unknown[]): number {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeTimestamp(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value < 10_000_000_000 ? value * 1000 : value;
    }
    if (typeof value === "string" && value.trim()) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
      }
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function normalizeState(value: unknown): SessionState {
  const source =
    typeof value === "object"
      ? stringValue(recordValue(value).status, recordValue(value).state)
      : stringValue(value);
  const normalized = source.toLowerCase();
  if (["completed", "done", "success", "succeeded"].includes(normalized)) {
    return "completed";
  }
  if (["cancelled", "canceled", "aborted", "failed"].includes(normalized)) {
    return "cancelled";
  }
  if (["running", "active", "processing", "syncing"].includes(normalized)) {
    return "running";
  }
  return "waiting";
}

function normalizeSession(
  value: unknown,
  namespaceId: string,
): ServerSession | null {
  const item = recordValue(value);
  const lifecycle = recordValue(item.lifecycleState);
  const context = recordValue(item.context);
  const usage = recordValue(item.usage);
  const artifacts = arrayValue(item.artifactPaths ?? item.artifacts)
    .map((artifact) =>
      typeof artifact === "string"
        ? artifact
        : stringValue(recordValue(artifact).path, recordValue(artifact).name),
    )
    .filter(Boolean);
  const sessionId = stringValue(
    item.sessionId,
    item.sessionKey,
    item.id,
    item.key,
  );
  if (!sessionId) return null;
  const inputTokens = numberValue(
    item.inputTokens,
    usage.inputTokens,
    usage.input_tokens,
    context.inputTokens,
  );
  const outputTokens = numberValue(
    item.outputTokens,
    usage.outputTokens,
    usage.output_tokens,
    context.outputTokens,
  );
  const workspace = stringValue(
    item.projectLabel,
    item.project,
    item.workspacePath,
    context.projectLabel,
  );
  const projectLabel = workspace
    ? (workspace.replaceAll("\\", "/").split("/").filter(Boolean).at(-1) ??
      workspace)
    : "未归类专项";
  return {
    sessionId,
    namespaceId: stringValue(item.namespaceId, namespaceId),
    title: stringValue(
      item.title,
      item.derivedTitle,
      item.displayName,
      sessionId,
    ),
    state: normalizeState(
      item.lifecycleState ?? item.state ?? item.status ?? lifecycle.status,
    ),
    updatedAt: normalizeTimestamp(
      item.updatedAtMs,
      item.updatedAt,
      lifecycle.updatedAtMs,
      lifecycle.lastRunAtMs,
      item.createdAt,
    ),
    model: stringValue(
      item.model,
      item.modelName,
      item.latestResolvedRuntimeModel,
      context.model,
      context.selectedModelId,
    ),
    inputTokens,
    outputTokens,
    messageCount: numberValue(
      item.messageCount,
      item.messagesCount,
      arrayValue(item.messages).length,
    ),
    artifactCount: numberValue(item.artifactCount, artifacts.length),
    artifactPaths: artifacts,
    projectLabel,
  };
}

async function loadServerSessions(): Promise<ServerSession[]> {
  const namespaces = await listTaskNamespaces();
  const sessionPayloads = await Promise.all(
    namespaces.map(async ({ namespaceId }) => ({
      namespaceId,
      sessions: await listTaskSessions(namespaceId),
    })),
  );
  return sessionPayloads
    .flatMap(({ namespaceId, sessions }) =>
      sessions.map((session) => normalizeSession(session, namespaceId)),
    )
    .filter((session): session is ServerSession => session !== null)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return formatInteger(value);
}

function formatDate(value: number): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(value))
    .replaceAll("/", "-");
}

function filterByWindow(
  sessions: ServerSession[],
  window: ActivityWindow,
): ServerSession[] {
  if (window === "all") return sessions;
  const days = window === "7d" ? 7 : 30;
  const boundary = Date.now() - days * 86_400_000;
  return sessions.filter((session) => session.updatedAt >= boundary);
}

function modelSummaries(sessions: ServerSession[]): ModelSummary[] {
  const totals = new Map<string, { input: number; output: number }>();
  for (const session of sessions) {
    if (!session.model) continue;
    const current = totals.get(session.model) ?? { input: 0, output: 0 };
    current.input += session.inputTokens;
    current.output += session.outputTokens;
    totals.set(session.model, current);
  }
  const grandTotal = [...totals.values()].reduce(
    (sum, value) => sum + value.input + value.output,
    0,
  );
  return [...totals.entries()]
    .map(([model, value]) => ({
      model,
      input: value.input,
      output: value.output,
      share: grandTotal ? (value.input + value.output) / grandTotal : 0,
    }))
    .sort(
      (left, right) => right.input + right.output - left.input - left.output,
    );
}

export function AiWorkspaceOverview(): ReactNode {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("overview");
  const [activityWindow, setActivityWindow] = useState<ActivityWindow>("all");
  const [sessions, setSessions] = useState<ServerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await loadServerSessions();
        if (!cancelled) {
          setSessions(result);
          setLastSyncedAt(Date.now());
          setError("");
        }
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error ? reason.message : "服务端数据暂时不可用",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const visibleSessions = useMemo(
    () => filterByWindow(sessions, activityWindow),
    [activityWindow, sessions],
  );

  return (
    <main className="flex h-full min-h-0 flex-col bg-[#fbfcfe] text-[#17181c]">
      <header className="flex min-h-[72px] shrink-0 items-stretch border-b border-[#e4e8ef] pl-14 pr-3 md:px-5 lg:px-8">
        <div
          role="tablist"
          aria-label="工作台视图"
          className="flex min-w-0 flex-1 items-stretch overflow-x-auto"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative shrink-0 px-4 text-[15px] font-semibold text-[#586174] outline-none transition-colors lg:px-6 lg:text-base",
                activeTab === tab.id && "font-bold text-[#1260cc]",
              )}
            >
              {tab.label}
              {activeTab === tab.id ? (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#1260cc]" />
              ) : null}
            </button>
          ))}
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-3">
          <div className="hidden text-right text-xs text-[#697386] xl:block">
            <div
              className={cn(
                "font-semibold",
                error ? "text-[#b42318]" : "text-[#1260cc]",
              )}
            >
              {error
                ? lastSyncedAt
                  ? "云端历史记忆同步中断"
                  : "云端历史记忆连接失败"
                : lastSyncedAt
                  ? "云端历史记忆已同步"
                  : "正在连接云端历史记忆"}
            </div>
            <div>
              {lastSyncedAt
                ? `最近同步 ${formatDate(lastSyncedAt)}`
                : error || "正在连接会话服务…"}
            </div>
          </div>
          <div className="flex rounded-xl bg-[#f3f5f8] p-1">
            {(
              [
                ["all", "全部"],
                ["30d", "30日"],
                ["7d", "7日"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActivityWindow(value)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold text-[#667085] transition-colors",
                  activityWindow === value &&
                    "bg-white text-[#1260cc] shadow-sm",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Link
            aria-label="新建会话"
            href="/ai-workspace/conversation/new"
            className="grid size-11 place-items-center rounded-[14px] bg-[#17181c] text-white shadow-sm transition-transform hover:scale-[1.02]"
          >
            <Plus className="size-6" strokeWidth={2.4} />
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-5 lg:p-8">
        {error ? <ErrorBanner message={error} /> : null}
        {activeTab === "overview" ? (
          <DataOverview sessions={visibleSessions} loading={loading} />
        ) : null}
        {activeTab === "models" ? (
          <ModelAnalysis sessions={visibleSessions} loading={loading} />
        ) : null}
        {activeTab === "todo" ? (
          <SessionDetail
            title="我的待办"
            subtitle="按服务端运行状态与最近进展汇总"
            sessions={visibleSessions.filter(
              (session) => session.state !== "completed",
            )}
            loading={loading}
          />
        ) : null}
        {activeTab === "projects" ? (
          <ProjectsDetail sessions={visibleSessions} loading={loading} />
        ) : null}
        {activeTab === "inbox" ? (
          <InboxDetail sessions={visibleSessions} loading={loading} />
        ) : null}
      </div>
    </main>
  );
}

function DataOverview({
  sessions,
  loading,
}: {
  sessions: ServerSession[];
  loading: boolean;
}) {
  const messages = sessions.reduce(
    (sum, session) => sum + session.messageCount,
    0,
  );
  const totalTokens = sessions.reduce(
    (sum, session) => sum + session.inputTokens + session.outputTokens,
    0,
  );
  const activeDays = new Set(
    sessions
      .filter((session) => session.updatedAt)
      .map((session) => new Date(session.updatedAt).toISOString().slice(0, 10)),
  ).size;
  const models = modelSummaries(sessions);
  const metrics = [
    ["TaskThreads", formatInteger(sessions.length)],
    ["消息", formatInteger(messages)],
    ["总 Tokens", formatTokens(totalTokens)],
    ["活跃天数", formatInteger(activeDays)],
    [
      "待处理",
      formatInteger(
        sessions.filter((session) => session.state !== "completed").length,
      ),
    ],
    [
      "推进中专项",
      formatInteger(
        new Set(sessions.map((session) => session.projectLabel)).size,
      ),
    ],
    [
      "已归档产物",
      formatInteger(
        sessions.reduce((sum, session) => sum + session.artifactCount, 0),
      ),
    ],
    ["最常用模型", models[0]?.model || "—"],
  ];
  return (
    <div className="space-y-5" data-testid="data-overview">
      <MetricGrid metrics={metrics} />
      <ActivityHeatmap sessions={sessions} />
      <SessionTable
        title="最近 TaskThreads"
        sessions={sessions.slice(0, 8)}
        loading={loading}
      />
    </div>
  );
}

function ModelAnalysis({
  sessions,
  loading,
}: {
  sessions: ServerSession[];
  loading: boolean;
}) {
  const input = sessions.reduce((sum, session) => sum + session.inputTokens, 0);
  const output = sessions.reduce(
    (sum, session) => sum + session.outputTokens,
    0,
  );
  const metrics = [
    ["TaskThreads", formatInteger(sessions.length), MessageSquareText],
    [
      "待处理",
      formatInteger(
        sessions.filter((session) => session.state !== "completed").length,
      ),
      Clock3,
    ],
    [
      "推进中专项",
      formatInteger(
        new Set(sessions.map((session) => session.projectLabel)).size,
      ),
      Target,
    ],
    [
      "消息",
      formatInteger(
        sessions.reduce((sum, session) => sum + session.messageCount, 0),
      ),
      Bell,
    ],
    ["Tokens", formatTokens(input + output), Layers3],
    [
      "Artifact",
      formatInteger(
        sessions.reduce((sum, session) => sum + session.artifactCount, 0),
      ),
      FileText,
    ],
  ] as const;
  return (
    <div className="space-y-5" data-testid="model-analysis">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map(([label, value, Icon]) => (
          <div
            key={label}
            className="rounded-xl border border-[#e4e8ef] bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-8 place-items-center rounded-lg bg-[#f1f5fb] text-[#1260cc]">
                <Icon className="size-4.5" />
              </span>
              <div>
                <p className="text-sm font-medium text-[#5e687a]">{label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  {value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <TokenTrend sessions={sessions} />
        <ModelShare sessions={sessions} />
      </div>
      <SessionTable
        title="最近活动"
        sessions={sessions.slice(0, 8)}
        loading={loading}
        showInputOutput
      />
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: string[][] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(([label, value]) => (
        <div
          key={label}
          className="min-h-[102px] rounded-xl border border-[#e4e8ef] bg-white p-4"
        >
          <p className="text-sm font-semibold text-[#697386]">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[#17181c]">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

function ActivityHeatmap({ sessions }: { sessions: ServerSession[] }) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 363);
  start.setHours(0, 0, 0, 0);
  const counts = new Map<string, number>();
  for (const session of sessions) {
    if (!session.updatedAt) continue;
    const key = new Date(session.updatedAt).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + Math.max(1, session.messageCount));
  }
  const max = Math.max(1, ...counts.values());
  const days = Array.from({ length: 364 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const count = counts.get(date.toISOString().slice(0, 10)) ?? 0;
    return {
      date,
      count,
      level: count ? Math.max(1, Math.ceil((count / max) * 4)) : 0,
    };
  });
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return `${date.getMonth() + 1}月`;
  });
  return (
    <section className="overflow-hidden rounded-xl border border-[#e4e8ef] bg-white px-4 py-4 lg:px-5">
      <div className="ml-12 grid grid-cols-12 gap-1 text-center text-xs font-medium text-[#697386]">
        {months.map((month, index) => (
          <span key={`${month}-${index}`}>{month}</span>
        ))}
      </div>
      <div className="mt-3 flex min-w-[900px] gap-3 overflow-hidden">
        <div className="flex h-[116px] w-9 shrink-0 flex-col justify-around text-xs text-[#697386]">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>
        <div className="grid flex-1 grid-flow-col grid-rows-7 gap-[4px]">
          {days.map(({ date, level }) => (
            <span
              key={date.toISOString()}
              title={date.toLocaleDateString("zh-CN")}
              className={cn(
                "aspect-square min-h-[11px] rounded-[3px]",
                level === 0 && "bg-[#edf1f6]",
                level === 1 && "bg-[#c8dafa]",
                level === 2 && "bg-[#8eb3ef]",
                level === 3 && "bg-[#4c86dd]",
                level === 4 && "bg-[#185fc6]",
              )}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center text-xs text-[#697386]">
        <span className="font-medium text-[#1260cc]">了解我们如何统计贡献</span>
        <span className="ml-auto">Less</span>
        <div className="mx-2 flex gap-1">
          {["#edf1f6", "#c8dafa", "#8eb3ef", "#4c86dd", "#185fc6"].map(
            (color) => (
              <span
                key={color}
                className="size-3 rounded-[3px]"
                style={{ backgroundColor: color }}
              />
            ),
          )}
        </div>
        <span>More</span>
      </div>
    </section>
  );
}

function TokenTrend({ sessions }: { sessions: ServerSession[] }) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: `${date.getMonth() + 1}月`,
      input: 0,
      output: 0,
    };
  });
  for (const session of sessions) {
    if (!session.updatedAt) continue;
    const date = new Date(session.updatedAt);
    const bucket = months.find(
      (month) => month.key === `${date.getFullYear()}-${date.getMonth()}`,
    );
    if (bucket) {
      bucket.input += session.inputTokens;
      bucket.output += session.outputTokens;
    }
  }
  const max = Math.max(1, ...months.map((month) => month.input + month.output));
  return (
    <AnalyticsCard title="Tokens 使用趋势（按月）">
      <div className="flex h-[290px] items-end gap-3 border-b border-[#e7ebf1] px-2 pt-5">
        {months.map((month) => {
          const inputHeight = Math.max(2, (month.input / max) * 220);
          const outputHeight = Math.max(2, (month.output / max) * 220);
          return (
            <div
              key={month.key}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
            >
              <div
                className="w-full max-w-6 rounded-t bg-[#9fc1f2]"
                style={{ height: outputHeight }}
              />
              <div
                className="w-full max-w-6 bg-[#2f73d7]"
                style={{ height: inputHeight }}
              />
              <span className="mt-2 text-[11px] text-[#697386]">
                {month.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-6 text-xs text-[#5e687a]">
        <Legend color="#2f73d7" label="输入 Tokens" />
        <Legend color="#9fc1f2" label="输出 Tokens" />
      </div>
    </AnalyticsCard>
  );
}

function ModelShare({ sessions }: { sessions: ServerSession[] }) {
  const models = modelSummaries(sessions).slice(0, 6);
  const colors = [
    "#155cc6",
    "#3477dc",
    "#5d91e2",
    "#88abe7",
    "#aac6ef",
    "#d2e1f6",
  ];
  return (
    <AnalyticsCard title="模型使用份额（全部）">
      <div className="grid grid-cols-[1.5fr_1fr_1fr_.7fr] border-b border-[#e7ebf1] pb-3 text-xs font-semibold text-[#697386]">
        <span>模型</span>
        <span>输入</span>
        <span>输出</span>
        <span className="text-right">占比</span>
      </div>
      {models.length ? (
        <div className="divide-y divide-[#edf0f4]">
          {models.map((model, index) => (
            <div
              key={model.model}
              className="grid grid-cols-[1.5fr_1fr_1fr_.7fr] items-center py-4 text-sm"
            >
              <span className="flex min-w-0 items-center gap-3 font-medium">
                <i
                  className="size-3 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: colors[index] }}
                />
                <span className="truncate">{model.model}</span>
              </span>
              <span className="text-[#586174]">
                {formatTokens(model.input)}
              </span>
              <span className="text-[#586174]">
                {formatTokens(model.output)}
              </span>
              <span className="text-right font-medium">
                {(model.share * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyData label="暂无模型用量数据" />
      )}
    </AnalyticsCard>
  );
}

function AnalyticsCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#e4e8ef] bg-white p-5">
      <h2 className="text-[17px] font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <i className="size-3 rounded-[3px]" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function SessionTable({
  title,
  sessions,
  loading,
  showInputOutput = false,
}: {
  title: string;
  sessions: ServerSession[];
  loading: boolean;
  showInputOutput?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#e4e8ef] bg-white">
      <h2 className="px-5 py-4 text-[17px] font-bold">{title}</h2>
      <div className="overflow-x-auto border-t border-[#e7ebf1]">
        <table className="w-full min-w-[1040px] table-fixed text-left text-sm">
          <thead className="bg-[#fafbfc] text-xs font-semibold text-[#697386]">
            <tr>
              <th className="w-[110px] px-5 py-3">状态</th>
              <th className="w-[270px] px-3 py-3">TaskThread</th>
              <th className="w-[160px] px-3 py-3">专项</th>
              <th className="w-[130px] px-3 py-3">模型</th>
              <th className="w-[180px] px-3 py-3">
                {showInputOutput ? "Tokens（输入 / 输出）" : "Tokens"}
              </th>
              <th className="w-[90px] px-3 py-3">Artifact</th>
              <th className="w-[180px] px-3 py-3">最近更新</th>
              <th className="w-[80px] px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0f4]">
            {sessions.map((session) => (
              <tr
                key={`${session.namespaceId}-${session.sessionId}`}
                className="transition-colors hover:bg-[#fafcff]"
              >
                <td className="px-5 py-3">
                  <Status state={session.state} />
                </td>
                <td className="px-3 py-3">
                  <p className="truncate font-semibold">{session.title}</p>
                  <p className="mt-0.5 truncate text-xs text-[#7b8494]">
                    {session.sessionId}
                  </p>
                </td>
                <td className="truncate px-3 py-3 text-[#586174]">
                  {session.projectLabel}
                </td>
                <td className="truncate px-3 py-3 text-[#586174]">
                  {session.model || "—"}
                </td>
                <td className="px-3 py-3 text-[#586174]">
                  {showInputOutput
                    ? `${formatTokens(session.inputTokens)} / ${formatTokens(session.outputTokens)}`
                    : formatTokens(session.inputTokens + session.outputTokens)}
                </td>
                <td className="px-3 py-3 text-[#586174]">
                  {formatInteger(session.artifactCount)}
                </td>
                <td className="px-3 py-3 text-[#586174]">
                  {formatDate(session.updatedAt)}
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/ai-workspace/conversation/${encodeURIComponent(session.sessionId)}`}
                    className="rounded-lg border border-[#dce2ea] px-3 py-1.5 text-xs font-semibold hover:bg-[#f6f8fb]"
                  >
                    查看
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading ? <EmptyData label="正在读取服务端数据…" /> : null}
        {!loading && !sessions.length ? (
          <EmptyData label="暂无服务端会话" />
        ) : null}
      </div>
    </section>
  );
}

function SessionDetail({
  title,
  subtitle,
  sessions,
  loading,
}: {
  title: string;
  subtitle: string;
  sessions: ServerSession[];
  loading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-[#697386]">{subtitle}</p>
      </div>
      <SessionTable
        title="全部记录"
        sessions={sessions}
        loading={loading}
        showInputOutput
      />
    </div>
  );
}

function ProjectsDetail({
  sessions,
  loading,
}: {
  sessions: ServerSession[];
  loading: boolean;
}) {
  const projects = [
    ...new Set(sessions.map((session) => session.projectLabel)),
  ];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">项目 / 专项</h1>
        <p className="mt-1 text-sm text-[#697386]">
          按服务端工作目录聚合 TaskThread 与 Artifact
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const items = sessions.filter(
            (session) => session.projectLabel === project,
          );
          return (
            <div
              key={project}
              className="rounded-xl border border-[#e4e8ef] bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-[#edf4ff] text-[#1260cc]">
                  <Archive className="size-4.5" />
                </span>
                <h2 className="truncate font-bold">{project}</h2>
              </div>
              <p className="mt-4 text-sm text-[#697386]">
                {items.length} 个工作项 ·{" "}
                {items.reduce((sum, item) => sum + item.artifactCount, 0)}{" "}
                个产物
              </p>
            </div>
          );
        })}
      </div>
      {loading ? <EmptyData label="正在读取服务端数据…" /> : null}
      {!loading && !projects.length ? <EmptyData label="暂无专项" /> : null}
    </div>
  );
}

function InboxDetail({
  sessions,
  loading,
}: {
  sessions: ServerSession[];
  loading: boolean;
}) {
  const artifacts = sessions.flatMap((session) =>
    session.artifactPaths.map((path) => ({ path, session })),
  );
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">收件箱</h1>
        <p className="mt-1 text-sm text-[#697386]">服务端归档产物与最近记录</p>
      </div>
      <section className="divide-y divide-[#edf0f4] rounded-xl border border-[#e4e8ef] bg-white">
        {artifacts.map(({ path, session }) => (
          <Link
            key={`${session.sessionId}-${path}`}
            href={`/ai-workspace/conversation/${encodeURIComponent(session.sessionId)}`}
            className="flex items-center gap-3 px-5 py-4 hover:bg-[#fafcff]"
          >
            <FileText className="size-5 text-[#1260cc]" />
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm">
                {path.split("/").at(-1)}
              </strong>
              <span className="mt-1 block truncate text-xs text-[#697386]">
                {session.title} · {path}
              </span>
            </span>
          </Link>
        ))}
        {loading ? <EmptyData label="正在读取服务端数据…" /> : null}
        {!loading && !artifacts.length ? (
          <EmptyData label="暂无归档产物" />
        ) : null}
      </section>
    </div>
  );
}

function Status({ state }: { state: SessionState }) {
  const visual = {
    running: ["进行中", "bg-[#25a244]", "text-[#217a37]"],
    waiting: ["等待中", "bg-[#e6a817]", "text-[#936700]"],
    completed: ["已完成", "bg-[#1769d2]", "text-[#1260cc]"],
    cancelled: ["已取消", "bg-[#a8afb9]", "text-[#697386]"],
  }[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold",
        visual[2],
      )}
    >
      <i className={cn("size-2 rounded-full", visual[1])} />
      {visual[0]}
    </span>
  );
}

function EmptyData({ label }: { label: string }) {
  return (
    <div className="grid min-h-32 place-items-center px-5 text-sm text-[#8a93a2]">
      {label}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-[#f0d5d2] bg-[#fff8f7] px-4 py-3 text-sm text-[#a54841]"
    >
      {message}
    </div>
  );
}
