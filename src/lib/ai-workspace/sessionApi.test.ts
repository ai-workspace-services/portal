import { describe, expect, it, vi } from "vitest";

import {
  appendTaskMessage,
  createTaskSession,
  getTaskSessionEvents,
  listTaskNamespaces,
  listTaskSessions,
  loadTaskSession,
  replayTaskSessionEvents,
} from "./sessionApi";

describe("shared task-session API client", () => {
  it("uses the Bridge proxy and the frozen session contract", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          sessionId: "session-1",
          namespaceId: "namespace-1",
          snapshotVersion: 2,
          event: {
            seq: 4,
            type: "message.created",
            payload: { text: "hello" },
            createdAt: "2026-08-11T00:00:00Z",
          },
          taskRun: { id: "run-1", state: "queued" },
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await appendTaskMessage(
      "session-1",
      { clientRequestId: "request-1", text: "hello", run: { priority: 0 } },
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledWith(
      "/api/ai-workspace/sessions/session-1/messages",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientRequestId: "request-1",
          text: "hello",
          run: { priority: 0 },
        }),
      }),
    );
    expect(result.taskRun.id).toBe("run-1");
    expect(result.event.seq).toBe(4);
  });

  it("encodes create, snapshot and replay paths without a local task identity", async () => {
    const fetcher = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            sessionId: "session-1",
            namespaceId: "namespace-1",
            lastEventSeq: 3,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      ),
    );

    await createTaskSession("namespace-1", { title: "Shared task" }, fetcher);
    await loadTaskSession("session-1", fetcher);
    await getTaskSessionEvents("session-1", 3, fetcher);

    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/ai-workspace/sessions/namespaces/namespace-1/sessions",
      "/api/ai-workspace/sessions/session-1",
      "/api/ai-workspace/sessions/session-1/events?after_seq=3&limit=100",
    ]);
  });

  it("lists server namespaces and sessions without browser persistence", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          namespaces: [{ namespaceId: "account-1", name: "Account" }],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          sessions: [
            {
              sessionId: "session-1",
              namespaceId: "account-1",
              lastEventSeq: 0,
            },
          ],
        }),
      );

    await expect(listTaskNamespaces(fetcher)).resolves.toEqual([
      { namespaceId: "account-1", label: "Account" },
    ]);
    await expect(listTaskSessions("account-1", fetcher)).resolves.toEqual([
      expect.objectContaining({ sessionId: "session-1" }),
    ]);
  });

  it("replays every ordered event page using the last sequence cursor", async () => {
    const first = Array.from({ length: 100 }, (_, index) => ({
      seq: index + 1,
      type: "message.created",
      payload: { text: `message ${index + 1}` },
      createdAt: "2026-08-11T00:00:00Z",
    }));
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ events: first }))
      .mockResolvedValueOnce(
        Response.json({ events: [{ ...first[0], seq: 101 }] }),
      );

    const events = await replayTaskSessionEvents("session-1", 0, fetcher);

    expect(events).toHaveLength(101);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/ai-workspace/sessions/session-1/events?after_seq=0&limit=100",
      "/api/ai-workspace/sessions/session-1/events?after_seq=100&limit=100",
    ]);
  });
});
