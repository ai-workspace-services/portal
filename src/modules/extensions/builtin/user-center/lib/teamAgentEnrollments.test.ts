import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decideTeamAgent,
  teamAgentRequest,
  type TeamAgentEnrollment,
} from "./teamAgentEnrollments";
const agent: TeamAgentEnrollment = {
  agentId: "node.example.invalid",
  suggestedTeamId: "suggested",
  assignedTeamId: "",
  status: "pending",
  updatedAt: "2026-10-20T09:00:00Z",
  online: true,
  lastHeartbeat: "2026-10-20T09:00:00Z",
  region: "jp",
  entryPoint: "node.example.invalid",
};
afterEach(() => vi.unstubAllGlobals());
describe("Team agent administrator decisions", () => {
  it("sends administrator assignment with optimistic concurrency version", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetch);
    await decideTeamAgent(agent, "approved", "assigned", "allocate node");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      agentId: agent.agentId,
      status: "approved",
      teamId: "assigned",
      reason: "allocate node",
      updatedAt: agent.updatedAt,
    });
    expect(fetch.mock.calls[0][1].credentials).toBe("include");
  });
  it("does not silently retry a stale administrator decision", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ message: "refresh enrollment before deciding" }),
      });
    vi.stubGlobal("fetch", fetch);
    await expect(
      decideTeamAgent(agent, "approved", "assigned", "allocate node"),
    ).rejects.toThrow("refresh enrollment");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not assign the suggested team when revoking", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetch);
    await decideTeamAgent(agent, "revoked", "suggested", "withdraw access");
    expect(JSON.parse(fetch.mock.calls[0][1].body).teamId).toBe("");
  });
  it("surfaces inventory read failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 403,
          json: async () => ({ error: "forbidden" }),
        }),
    );
    await expect(
      teamAgentRequest("/api/admin/agents/team-enrollments"),
    ).rejects.toThrow("forbidden");
  });
});
