import { describe, expect, it } from "vitest";

import {
  mergeOrderedEvents,
  projectConversationMessages,
} from "./sessionProjection";

const createdAt = "2026-08-27T10:00:00Z";

describe("task session event projection", () => {
  it("deduplicates and orders cross-terminal event replay", () => {
    const merged = mergeOrderedEvents(
      [
        {
          seq: 2,
          type: "message.created",
          payload: { text: "second" },
          createdAt,
        },
      ],
      [
        {
          seq: 1,
          type: "message.created",
          payload: { text: "first" },
          createdAt,
        },
        {
          seq: 2,
          type: "message.created",
          payload: { text: "second retry" },
          createdAt,
        },
      ],
    );

    expect(merged.map((event) => [event.seq, event.payload.text])).toEqual([
      [1, "first"],
      [2, "second retry"],
    ]);
  });

  it("projects only persisted message events and preserves roles", () => {
    const messages = projectConversationMessages([
      {
        seq: 3,
        type: "task_run.updated",
        payload: { state: "running" },
        createdAt,
      },
      {
        seq: 1,
        type: "message.created",
        payload: { messageId: "u1", role: "user", text: "继续推进" },
        createdAt,
      },
      {
        seq: 2,
        type: "assistant.message.created",
        payload: { message: { id: "a1", role: "assistant", content: "收到" } },
        createdAt,
      },
    ]);

    expect(messages).toEqual([
      expect.objectContaining({
        id: "u1",
        seq: 1,
        role: "user",
        text: "继续推进",
      }),
      expect.objectContaining({
        id: "a1",
        seq: 2,
        role: "assistant",
        text: "收到",
      }),
    ]);
  });
});
