import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/account/session", () => ({
  getAccountSession: vi.fn(async () => ({ token: "account-token" })),
}));

import { GET, POST } from "./route";

describe("task-session Bridge proxy paths", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("allows an authenticated single-session snapshot GET", async () => {
    const upstream = vi.fn(async () =>
      Response.json({ sessionId: "session-1", lastEventSeq: 4 }),
    );
    vi.stubGlobal("fetch", upstream);

    const response = await GET(
      new NextRequest("http://portal.test/api/ai-workspace/sessions/session-1"),
      { params: Promise.resolve({ segments: ["session-1"] }) },
    );

    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/api/v1/sessions/session-1" }),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer account-token",
        }),
      }),
    );
  });

  it("rejects methods outside the frozen session contract", async () => {
    const response = await POST(
      new NextRequest(
        "http://portal.test/api/ai-workspace/sessions/session-1",
        {
          method: "POST",
        },
      ),
      { params: Promise.resolve({ segments: ["session-1"] }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { message: "Unsupported task-session path." },
    });
  });
});
