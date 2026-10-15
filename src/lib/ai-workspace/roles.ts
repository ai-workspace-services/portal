import type { TaskSessionEvent } from "@/lib/ai-workspace/sessionApi";

/**
 * The six composer roles, same as the XWorkmate App. Chat goes straight to
 * the Gateway through the Bridge; every other role is routed to the DS Bot
 * team through the task-session API.
 */
export type AssistantRole =
  | "chat"
  | "worker"
  | "engineer"
  | "architect"
  | "researcher"
  | "specialist";

export type AssistantRoleOption = {
  value: AssistantRole;
  /** Role names stay in English: they are the names the DS Bot policy uses. */
  label: string;
  description: string;
};

export const ASSISTANT_ROLES: readonly AssistantRoleOption[] = [
  { value: "chat", label: "Chat", description: "直连对话，立即得到回答" },
  { value: "worker", label: "Worker", description: "执行明确的日常任务" },
  { value: "engineer", label: "Engineer", description: "编码、调试与工程交付" },
  { value: "architect", label: "Architect", description: "方案设计与架构评审" },
  { value: "researcher", label: "Researcher", description: "调研、检索与对比分析" },
  { value: "specialist", label: "Specialist", description: "领域专家级深度处理" },
];

export function roleOption(role: AssistantRole): AssistantRoleOption {
  return ASSISTANT_ROLES.find((option) => option.value === role) ?? ASSISTANT_ROLES[0];
}

export function runsOnBotTeam(role: AssistantRole): boolean {
  return role !== "chat";
}

/** Session title for a task: its first 40 characters. */
export function botTaskTitle(text: string): string {
  const prompt = text.trim();
  return prompt.length > 40 ? `${prompt.slice(0, 40)}…` : prompt;
}

export type BotRoleRouting = {
  roleMode: "auto";
  role?: string;
};

/** Routing for a task. An empty role lets the orchestrator's policy pick one. */
export function botRoleRouting(role = ""): BotRoleRouting {
  const trimmed = role.trim();
  return trimmed ? { roleMode: "auto", role: trimmed } : { roleMode: "auto" };
}

export type BotTaskPhase =
  | "queued"
  | "claimed"
  | "selected"
  | "executing"
  | "completed"
  | "failed"
  | "rejected"
  | "cancelled";

const TERMINAL_PHASES: ReadonlySet<BotTaskPhase> = new Set([
  "completed",
  "failed",
  "rejected",
  "cancelled",
]);

export function isTerminalPhase(phase: BotTaskPhase): boolean {
  return TERMINAL_PHASES.has(phase);
}

export const BOT_TASK_PHASE_LABEL: Record<BotTaskPhase, string> = {
  queued: "排队中",
  claimed: "已领取",
  selected: "已选定执行器",
  executing: "执行中",
  completed: "已完成",
  failed: "失败",
  rejected: "被策略拒绝",
  cancelled: "已取消",
};

/** One task run folded from the session's ordered events. */
export type BotTaskView = {
  runId: string;
  prompt: string;
  phase: BotTaskPhase;
  role: string;
  executor: string;
  modelId: string;
  answer: string;
  error: string;
  lastSeq: number;
};

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function emptyBotTaskView(runId: string): BotTaskView {
  return {
    runId,
    prompt: "",
    phase: "queued",
    role: "",
    executor: "",
    modelId: "",
    answer: "",
    error: "",
    lastSeq: 0,
  };
}

function applyResolved(view: BotTaskView, payload: Record<string, unknown>) {
  view.role = text(payload.resolvedRole) || view.role;
  view.executor = text(payload.executor) || view.executor;
  view.modelId = text(payload.resolvedModelId) || view.modelId;
}

/**
 * Folds events in sequence order into one view per run, oldest first. Mirrors
 * `foldBotTasks` in the App so both clients read a run the same way.
 */
export function foldBotTasks(events: readonly TaskSessionEvent[]): BotTaskView[] {
  const runs = new Map<string, BotTaskView>();
  const ordered = [...events].sort((left, right) => left.seq - right.seq);
  for (const event of ordered) {
    const payload = record(event.payload);
    const runId = text(payload.taskRunId);
    if (!runId) continue;
    let view = runs.get(runId);
    if (!view) {
      view = emptyBotTaskView(runId);
      runs.set(runId, view);
    }
    view.lastSeq = event.seq;
    const selection = record(payload.roleSelection);
    if (Object.keys(selection).length) {
      view.role = text(selection.role);
      view.executor = text(selection.executor);
      view.modelId = text(selection.modelId);
    }
    switch (event.type) {
      case "message.created":
        view.prompt = text(payload.text);
        break;
      case "run.queued":
        view.phase = "queued";
        break;
      case "run.running":
        view.phase = "claimed";
        break;
      case "run.progressed": {
        const phase = text(payload.phase);
        if (phase === "selected") view.phase = "selected";
        if (phase === "started") view.phase = "executing";
        break;
      }
      case "assistant.message.created":
        view.answer = text(payload.text);
        break;
      case "run.completed":
        view.phase = "completed";
        applyResolved(view, payload);
        break;
      case "run.failed": {
        const rejected = text(payload.phase) === "rejected";
        view.phase = rejected ? "rejected" : "failed";
        applyResolved(view, payload);
        view.error = rejected
          ? text(selection.message)
          : [payload.code, payload.stopReason, payload.error, payload.diagnostic]
              .map(text)
              .filter(Boolean)
              .join(" · ");
        break;
      }
      case "run.cancelled":
        view.phase = "cancelled";
        break;
    }
  }
  return [...runs.values()];
}

/** The header the App puts above a role answer: `[Role · executor · model]`. */
export function roleAnswerHeader(view: BotTaskView, fallbackRole: string): string {
  return [view.role || fallbackRole, view.executor, view.modelId]
    .filter(Boolean)
    .join(" · ");
}
