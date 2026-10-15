import {
  appendTaskMessage,
  createTaskSession,
  getTaskSessionEvents,
  listTaskNamespaces,
  type Fetcher,
  type TaskSessionEvent,
} from "@/lib/ai-workspace/sessionApi";
import {
  botRoleRouting,
  botTaskTitle,
  emptyBotTaskView,
  foldBotTasks,
  isTerminalPhase,
  type AssistantRole,
  type BotTaskView,
} from "@/lib/ai-workspace/roles";

export type RoleTaskReceipt = {
  sessionId: string;
  runId: string;
};

type RoleTaskOptions = {
  fetcher?: Fetcher;
  newRequestId?: () => string;
};

function requestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Opens a task session in the account's first namespace and sends the task
 * with its role. This is all "交给 Bot 团队" does: the run continues on DS Bot
 * and is followed from the conversation page or the Bot team page.
 */
export async function submitRoleTask(
  text: string,
  role: AssistantRole | "auto",
  { fetcher = fetch, newRequestId = requestId }: RoleTaskOptions = {},
): Promise<RoleTaskReceipt> {
  const namespaces = await listTaskNamespaces(fetcher);
  const namespaceId = namespaces[0]?.namespaceId;
  if (!namespaceId) throw new Error("当前账号尚未分配会话命名空间");
  const session = await createTaskSession(
    namespaceId,
    { title: botTaskTitle(text) },
    fetcher,
  );
  const receipt = await appendTaskMessage(
    session.sessionId,
    {
      clientRequestId: newRequestId(),
      text,
      run: { priority: 0 },
      // Chat and auto send no role and let the orchestrator's policy pick one.
      routing: botRoleRouting(role === "chat" || role === "auto" ? "" : role),
    },
    fetcher,
  );
  return { sessionId: session.sessionId, runId: receipt.taskRun.id };
}

type WaitOptions = {
  fetcher?: Fetcher;
  pollIntervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onProgress?: (view: BotTaskView) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Polls a run's events until it is terminal, for "立即执行" with a Bot role.
 * A run still going at the timeout comes back non-terminal: it keeps running
 * and stays visible on the Bot team page.
 */
export async function waitForRoleTask(
  receipt: RoleTaskReceipt,
  {
    fetcher = fetch,
    pollIntervalMs = 1500,
    timeoutMs = 15 * 60 * 1000,
    signal,
    onProgress,
    sleep = defaultSleep,
    now = Date.now,
  }: WaitOptions = {},
): Promise<BotTaskView> {
  const events: TaskSessionEvent[] = [];
  let afterSeq = 0;
  const deadline = now() + timeoutMs;
  for (;;) {
    const page = await getTaskSessionEvents(receipt.sessionId, afterSeq, fetcher);
    for (const event of page.events) {
      if (event.seq > afterSeq) {
        events.push(event);
        afterSeq = event.seq;
      }
    }
    const view =
      foldBotTasks(events).find((task) => task.runId === receipt.runId) ??
      emptyBotTaskView(receipt.runId);
    onProgress?.(view);
    if (isTerminalPhase(view.phase) || now() >= deadline || signal?.aborted) {
      return view;
    }
    await sleep(pollIntervalMs);
  }
}
