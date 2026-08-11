export type TaskSessionEvent = {
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type TaskRunSummary = {
  id: string;
  state: string;
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
  const query = new URLSearchParams({ after_seq: String(Math.max(0, afterSeq)), limit: "100" });
  return request<{ events: TaskSessionEvent[] }>(
    `${apiBase}/${encodeURIComponent(sessionId)}/events?${query.toString()}`,
    { method: "GET" },
    fetcher,
  );
}

export async function appendTaskMessage(
  sessionId: string,
  body: { clientRequestId: string; text: string; run?: { priority: number; notBefore?: string } },
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
    throw new Error(error.error?.message ?? `Task session request failed: ${response.status}`);
  }
  return data as T;
}
