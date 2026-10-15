import { describe, expect, it, vi } from "vitest";

import { submitRoleTask, waitForRoleTask } from "@/lib/ai-workspace/roleTaskRunner";

function sessionsFetcher(eventPages: unknown[][]) {
  const calls: { url: string; method: string; body?: unknown }[] = [];
  let page = 0;
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({
      url,
      method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (url.endsWith("/namespaces")) {
      return Response.json({ namespaces: [{ namespaceId: "ns-1" }] });
    }
    if (url.endsWith("/namespaces/ns-1/sessions") && method === "POST") {
      return Response.json({ sessionId: "s-1", namespaceId: "ns-1", lastEventSeq: 0 });
    }
    if (url.endsWith("/s-1/messages")) {
      return Response.json({
        sessionId: "s-1",
        namespaceId: "ns-1",
        snapshotVersion: 1,
        event: { seq: 1, type: "message.created", payload: {}, createdAt: "" },
        taskRun: { id: "run-1", state: "queued" },
      });
    }
    if (url.includes("/s-1/events")) {
      const events = eventPages[Math.min(page, eventPages.length - 1)];
      page += 1;
      return Response.json({ events });
    }
    return Response.json({ error: { message: "unexpected" } }, { status: 404 });
  });
  return { fetcher: fetcher as unknown as typeof fetch, calls };
}

describe("submitRoleTask", () => {
  it("opens a session and sends the task with its role", async () => {
    const { fetcher, calls } = sessionsFetcher([[]]);
    const receipt = await submitRoleTask("整理周报", "engineer", {
      fetcher,
      newRequestId: () => "req-1",
    });
    expect(receipt).toEqual({ sessionId: "s-1", runId: "run-1" });
    expect(calls[1]).toMatchObject({ method: "POST", body: { title: "整理周报" } });
    expect(calls[2]).toMatchObject({
      method: "POST",
      body: {
        clientRequestId: "req-1",
        text: "整理周报",
        routing: { roleMode: "auto", role: "engineer" },
      },
    });
  });

  it("sends no role for auto", async () => {
    const { fetcher, calls } = sessionsFetcher([[]]);
    await submitRoleTask("任务", "auto", { fetcher });
    expect(calls[2].body).toMatchObject({ routing: { roleMode: "auto" } });
    expect((calls[2].body as { routing: object }).routing).not.toHaveProperty("role");
  });
});

describe("waitForRoleTask", () => {
  it("polls until the run is terminal and returns its answer", async () => {
    const { fetcher } = sessionsFetcher([
      [{ seq: 2, type: "run.queued", payload: { taskRunId: "run-1" }, createdAt: "" }],
      [
        { seq: 3, type: "assistant.message.created", payload: { taskRunId: "run-1", text: "ok" }, createdAt: "" },
        { seq: 4, type: "run.completed", payload: { taskRunId: "run-1" }, createdAt: "" },
      ],
    ]);
    const phases: string[] = [];
    const view = await waitForRoleTask(
      { sessionId: "s-1", runId: "run-1" },
      { fetcher, sleep: async () => {}, onProgress: (progress) => phases.push(progress.phase) },
    );
    expect(view).toMatchObject({ phase: "completed", answer: "ok" });
    expect(phases).toEqual(["queued", "completed"]);
  });

  it("returns a still-running run at the timeout", async () => {
    const { fetcher } = sessionsFetcher([
      [{ seq: 2, type: "run.running", payload: { taskRunId: "run-1" }, createdAt: "" }],
    ]);
    let clock = 0;
    const view = await waitForRoleTask(
      { sessionId: "s-1", runId: "run-1" },
      {
        fetcher,
        timeoutMs: 1000,
        now: () => clock,
        sleep: async (ms) => {
          clock += ms;
        },
      },
    );
    expect(view.phase).toBe("claimed");
  });
});
