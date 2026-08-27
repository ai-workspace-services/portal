import type { TaskSessionEvent, TaskSessionSnapshot } from "./sessionApi";

export type ConversationRole = "user" | "assistant" | "system";

export type ConversationMessage = {
  id: string;
  seq: number;
  role: ConversationRole;
  text: string;
  createdAt: string;
};

export function mergeOrderedEvents(
  current: TaskSessionEvent[],
  incoming: TaskSessionEvent[],
): TaskSessionEvent[] {
  const events = new Map<number, TaskSessionEvent>();
  for (const event of [...current, ...incoming]) {
    if (Number.isFinite(event.seq) && event.seq > 0)
      events.set(event.seq, event);
  }
  return [...events.values()].sort((left, right) => left.seq - right.seq);
}

export function projectConversationMessages(
  events: TaskSessionEvent[],
): ConversationMessage[] {
  return mergeOrderedEvents([], events)
    .map((event) => projectMessage(event))
    .filter((message): message is ConversationMessage => message !== null);
}

export function sessionTitle(snapshot: TaskSessionSnapshot | null): string {
  return snapshot?.title?.trim() || "未命名会话";
}

export function sessionIsActive(snapshot: TaskSessionSnapshot | null): boolean {
  const state = String(
    snapshot?.taskRun?.state ?? snapshot?.lifecycleState ?? "",
  ).toLowerCase();
  return ["queued", "running", "active", "processing", "waiting"].includes(
    state,
  );
}

function projectMessage(event: TaskSessionEvent): ConversationMessage | null {
  const payload = asRecord(event.payload);
  const message = asRecord(payload.message);
  const type = event.type.toLowerCase();
  const text = textValue(
    payload.text,
    payload.content,
    payload.output,
    message.text,
    message.content,
  );
  if (!text) return null;

  const declaredRole = textValue(payload.role, message.role).toLowerCase();
  let role: ConversationRole;
  if (["user", "human"].includes(declaredRole) || type.includes("user")) {
    role = "user";
  } else if (
    ["assistant", "agent"].includes(declaredRole) ||
    type.includes("assistant")
  ) {
    role = "assistant";
  } else if (type.includes("message")) {
    role = "assistant";
  } else {
    return null;
  }

  return {
    id: textValue(payload.messageId, message.id) || `event-${event.seq}`,
    seq: event.seq,
    role,
    text,
    createdAt: event.createdAt,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
