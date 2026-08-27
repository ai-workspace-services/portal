export type TaskSessionEvent = {
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type TaskRunSummary = {
  id: string;
  state: string;
  bridgeTaskRef?: string;
};

export type TaskNamespace = {
  namespaceId: string;
  label?: string;
};

export type TaskSessionSnapshot = {
  sessionId: string;
  namespaceId: string;
  title?: string;
  snapshotVersion?: number;
  lastEventSeq: number;
  lifecycleState?: string;
  context?: Record<string, unknown>;
  taskRun?: TaskRunSummary;
  createdAt?: string;
  updatedAt?: string;
};

export type SubmitTaskMessageResult = {
  sessionId: string;
  namespaceId: string;
  snapshotVersion: number;
  event: TaskSessionEvent;
  taskRun: TaskRunSummary;
};

export type Fetcher = typeof fetch;

const apiBase = "/api/ai-workspace/sessions";

export async function listTaskNamespaces(
  fetcher: Fetcher = fetch,
): Promise<TaskNamespace[]> {
  const payload = await request<unknown>(
    `${apiBase}/namespaces`,
    { method: "GET" },
    fetcher,
  );
  return extractItems(payload, "namespaces")
    .map((value) => {
      if (typeof value === "string") return { namespaceId: value };
      const item = asRecord(value);
      const namespaceId = textValue(item.namespaceId, item.id, item.key);
      return namespaceId
        ? { namespaceId, label: textValue(item.label, item.name) || undefined }
        : null;
    })
    .filter((value): value is TaskNamespace => value !== null);
}

export async function listTaskSessions(
  namespaceId: string,
  fetcher: Fetcher = fetch,
): Promise<TaskSessionSnapshot[]> {
  const payload = await request<unknown>(
    `${apiBase}/namespaces/${encodeURIComponent(namespaceId)}/sessions`,
    { method: "GET" },
    fetcher,
  );
  return extractItems(payload, "sessions") as TaskSessionSnapshot[];
}

export async function createTaskSession(
  namespaceId: string,
  body: { title?: string },
  fetcher: Fetcher = fetch,
): Promise<TaskSessionSnapshot> {
  return request<TaskSessionSnapshot>(
    `${apiBase}/namespaces/${encodeURIComponent(namespaceId)}/sessions`,
    { method: "POST", body: JSON.stringify(body) },
    fetcher,
  );
}

export async function loadTaskSession(
  sessionId: string,
  fetcher: Fetcher = fetch,
): Promise<TaskSessionSnapshot> {
  return request<TaskSessionSnapshot>(
    `${apiBase}/${encodeURIComponent(sessionId)}`,
    { method: "GET" },
    fetcher,
  );
}

export async function getTaskSessionEvents(
  sessionId: string,
  afterSeq: number,
  fetcher: Fetcher = fetch,
): Promise<{ events: TaskSessionEvent[] }> {
  const query = new URLSearchParams({
    after_seq: String(Math.max(0, afterSeq)),
    limit: "100",
  });
  const payload = await request<unknown>(
    `${apiBase}/${encodeURIComponent(sessionId)}/events?${query.toString()}`,
    { method: "GET" },
    fetcher,
  );
  return { events: extractItems(payload, "events") as TaskSessionEvent[] };
}

export async function replayTaskSessionEvents(
  sessionId: string,
  afterSeq = 0,
  fetcher: Fetcher = fetch,
): Promise<TaskSessionEvent[]> {
  const events: TaskSessionEvent[] = [];
  let cursor = Math.max(0, afterSeq);
  for (;;) {
    const page = await getTaskSessionEvents(sessionId, cursor, fetcher);
    const ordered = page.events
      .filter((event) => Number.isFinite(event.seq) && event.seq > cursor)
      .sort((left, right) => left.seq - right.seq);
    events.push(...ordered);
    if (ordered.length < 100) break;
    const nextCursor = ordered.at(-1)?.seq ?? cursor;
    if (nextCursor <= cursor) break;
    cursor = nextCursor;
  }
  return events;
}

export async function appendTaskMessage(
  sessionId: string,
  body: {
    clientRequestId: string;
    text: string;
    run?: { priority: number; notBefore?: string };
  },
  fetcher: Fetcher = fetch,
): Promise<SubmitTaskMessageResult> {
  return request<SubmitTaskMessageResult>(
    `${apiBase}/${encodeURIComponent(sessionId)}/messages`,
    { method: "POST", body: JSON.stringify(body) },
    fetcher,
  );
}

async function request<T>(
  url: string,
  init: { method: "GET" | "POST"; body?: string },
  fetcher: Fetcher,
): Promise<T> {
  const response = await fetcher(url, {
    method: init.method,
    credentials: "include",
    headers: init.body ? { "content-type": "application/json" } : undefined,
    body: init.body,
  });
  const data = (await response.json()) as T | { error?: { message?: string } };
  if (!response.ok) {
    const error = data as { error?: { message?: string } };
    throw new Error(
      error.error?.message ?? `Task session request failed: ${response.status}`,
    );
  }
  return data as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(...values: unknown[]): string {
  return (
    values
      .find((value) => typeof value === "string" && value.trim())
      ?.toString()
      .trim() ?? ""
  );
}

function extractItems(payload: unknown, key: string): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (Array.isArray(record[key])) return record[key];
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  return [];
}
