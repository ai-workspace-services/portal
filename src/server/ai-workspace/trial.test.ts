import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import {
  consumeTrialTask,
  getTrialState,
} from "@server/ai-workspace/trial";

function requestWithCookie(cookieValue?: string): NextRequest {
  return new NextRequest("http://localhost/api/ai-workspace/trial", {
    headers: cookieValue ? { cookie: `xworkmate_trial=${cookieValue}` } : {},
  });
}

describe("AI Workspace anonymous trial", () => {
  it("starts at five tasks and prevents the sixth task", () => {
    let cookieValue: string | undefined;
    let request = requestWithCookie();

    const initial = getTrialState(request);
    expect(initial.state.limit).toBe(5);
    expect(initial.state.remaining).toBe(5);
    cookieValue = initial.cookieValue;

    for (let index = 0; index < 5; index += 1) {
      request = requestWithCookie(cookieValue);
      const consumed = consumeTrialTask(request);
      expect(consumed.allowed).toBe(true);
      expect(consumed.state.remaining).toBe(4 - index);
      cookieValue = consumed.cookieValue;
    }

    const blocked = consumeTrialTask(requestWithCookie(cookieValue));
    expect(blocked.allowed).toBe(false);
    expect(blocked.state.remaining).toBe(0);
  });

  it("ignores a tampered cookie and starts a fresh signed identity", () => {
    const state = getTrialState(requestWithCookie("tampered.value"));
    expect(state.state.used).toBe(0);
    expect(state.state.id).toBeTruthy();
  });
});
