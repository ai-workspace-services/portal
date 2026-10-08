import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAgentNodes } from "./fetchAgentNodes";

const node = {
  name: "jp",
  region: "jp",
  address: "jp.entry.example",
  port: 443,
  pool_count: 1,
  open_to_users: true,
};

describe("fetchAgentNodes", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses authenticated canonical discovery without changing metadata", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify([node]), { status: 200 }),
      );
    await expect(fetchAgentNodes()).resolves.toEqual([node]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agent-server/v1/nodes",
      expect.objectContaining({ cache: "no-store", credentials: "include" }),
    );
  });

  it.each([404, 405, 502])(
    "surfaces %s without consulting a legacy host list",
    async (status) => {
      const fetchMock = vi
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "canonical_unavailable" }), {
            status,
          }),
        );
      await expect(fetchAgentNodes()).rejects.toThrow("canonical_unavailable");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [[{ name: "legacy", address: "legacy.entry.example" }]],
    [[{ ...node, open_to_users: false }]],
    [[{ ...node, pool_count: 0 }]],
    [[null]],
  ])("rejects incompatible or unfiltered node metadata", async (payload) => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payload), { status: 200 }),
      );
    await expect(fetchAgentNodes()).rejects.toThrow(
      "unsupported_regional_discovery_payload",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves session errors and unexpected payload errors", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid_session" }), {
          status: 401,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response("[]", { status: 200 }));
    await expect(fetchAgentNodes()).rejects.toThrow("invalid_session");
    await expect(fetchAgentNodes()).rejects.toThrow(
      "unexpected_agent_nodes_payload",
    );
    await expect(fetchAgentNodes()).resolves.toEqual([]);
  });
});
