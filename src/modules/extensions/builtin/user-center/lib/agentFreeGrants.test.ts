import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchAgentFreeGrants,
  revokeAgentFreeGrant,
  upsertAgentFreeGrant,
} from "./agentFreeGrants";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("agentFreeGrants API client", () => {
  it("fetches grants without nodeId filter", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        grants: [
          {
            nodeId: "custom-jp-01",
            email: "tester@example.com",
            status: "active",
            state: "active",
            expiresAt: "2026-11-14T00:00:00Z",
            createdAt: "2026-11-07T00:00:00Z",
            updatedAt: "2026-11-07T00:00:00Z",
            reason: "Beta testing",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAgentFreeGrants();
    expect(result.grants).toHaveLength(1);
    expect(result.grants[0].nodeId).toBe("custom-jp-01");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/admin/agents/grants",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("fetches grants with encoded nodeId filter", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ grants: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchAgentFreeGrants("custom node 01");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/admin/agents/grants?nodeId=custom%20node%2001",
      expect.any(Object),
    );
  });

  it("upserts a grant with POST and json payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await upsertAgentFreeGrant({
      nodeId: "custom-jp-01",
      email: "test@example.com",
      expiresInDays: 7,
      reason: "Audit approve",
    });
    expect(res.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/admin/agents/grants",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          nodeId: "custom-jp-01",
          email: "test@example.com",
          expiresInDays: 7,
          reason: "Audit approve",
        }),
      }),
    );
  });

  it("revokes a grant with DELETE", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await revokeAgentFreeGrant({
      nodeId: "custom-jp-01",
      email: "test@example.com",
      reason: "Revoke early access",
    });
    expect(res.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/admin/agents/grants",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({
          nodeId: "custom-jp-01",
          email: "test@example.com",
          reason: "Revoke early access",
        }),
      }),
    );
  });

  it("throws descriptive error when request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "node_not_custom", message: "Only custom nodes allowed" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      upsertAgentFreeGrant({
        nodeId: "free-node",
        email: "test@example.com",
        reason: "Trial",
      }),
    ).rejects.toThrow("Only custom nodes allowed");
  });
});
