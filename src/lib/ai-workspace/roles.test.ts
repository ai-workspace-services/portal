import { describe, expect, it } from "vitest";

import {
  ASSISTANT_ROLES,
  botRoleRouting,
  botTaskTitle,
  foldBotTasks,
  roleAnswerHeader,
  runsOnBotTeam,
} from "@/lib/ai-workspace/roles";
import type { TaskSessionEvent } from "@/lib/ai-workspace/sessionApi";

function event(seq: number, type: string, payload: Record<string, unknown>): TaskSessionEvent {
  return { seq, type, payload, createdAt: "2026-10-15T00:00:00Z" };
}

describe("assistant roles", () => {
  it("lists the six App tiers in order, with only Chat off the Bot team", () => {
    expect(ASSISTANT_ROLES.map((role) => role.label)).toEqual([
      "Chat",
      "Worker",
      "Engineer",
      "Architect",
      "Researcher",
      "Specialist",
    ]);
    expect(ASSISTANT_ROLES.filter((role) => !runsOnBotTeam(role.value))).toHaveLength(1);
  });

  it("routes a role and leaves auto to the orchestrator policy", () => {
    expect(botRoleRouting("worker")).toEqual({ roleMode: "auto", role: "worker" });
    expect(botRoleRouting("  ")).toEqual({ roleMode: "auto" });
  });

  it("titles a task with its first 40 characters", () => {
    expect(botTaskTitle("  short  ")).toBe("short");
    expect(botTaskTitle("x".repeat(41))).toBe(`${"x".repeat(40)}…`);
  });
});

describe("foldBotTasks", () => {
  it("folds a completed run with its selection and answer", () => {
    const [view] = foldBotTasks([
      event(3, "assistant.message.created", { taskRunId: "run-1", text: "done" }),
      event(1, "message.created", { taskRunId: "run-1", text: "do it" }),
      event(2, "run.progressed", {
        taskRunId: "run-1",
        phase: "selected",
        roleSelection: { role: "Worker", executor: "codex", modelId: "m-1" },
      }),
      event(4, "run.completed", { taskRunId: "run-1", resolvedModelId: "m-2" }),
    ]);
    expect(view).toMatchObject({
      runId: "run-1",
      prompt: "do it",
      phase: "completed",
      role: "Worker",
      executor: "codex",
      modelId: "m-2",
      answer: "done",
      lastSeq: 4,
    });
    expect(roleAnswerHeader(view, "Worker")).toBe("Worker · codex · m-2");
  });

  it("reports a policy rejection with the selection message", () => {
    const [view] = foldBotTasks([
      event(1, "run.failed", {
        taskRunId: "run-2",
        phase: "rejected",
        roleSelection: { role: "Specialist", message: "no executor for role" },
      }),
    ]);
    expect(view.phase).toBe("rejected");
    expect(view.error).toBe("no executor for role");
  });

  it("joins failure details and ignores events without a run", () => {
    const views = foldBotTasks([
      event(1, "session.created", {}),
      event(2, "run.failed", { taskRunId: "run-3", code: "E1", error: "boom" }),
    ]);
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({ phase: "failed", error: "E1 · boom" });
  });
});
