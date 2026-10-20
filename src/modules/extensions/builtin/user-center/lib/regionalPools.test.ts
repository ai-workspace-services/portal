import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchRegionalPools,
  groupRegionalPools,
  regionalNodeOptions,
} from "./regionalPools";
import type { VlessNode } from "./vless";

const node: VlessNode = {
  name: "runtime-de-1",
  region: "de-fra",
  address: "custom.entry.example",
  server_name: "tls.entry.example",
  port: 8443,
  open_to_users: true,
  pool_count: 2,
  transport: "xhttp",
  path: "/custom",
  uri_scheme_xhttp: "vless://${UUID}@${DOMAIN}:8443?sni=${SNI}#${TAG}",
};
afterEach(() => vi.unstubAllGlobals());

describe("registered regional pools", () => {
  it("groups by reported class, separates teams, and never infers class from a hostname", () => {
    const pool = (
      entry: string,
      resourceClass?: "shared" | "free" | "plus" | "pro" | "team",
      teamId?: string,
    ) => ({
      key: entry + (teamId ?? ""),
      code: "jp",
      shortCode: "JP",
      zhName: "日本",
      enName: "Japan",
      entry,
      poolCount: 1,
      openToUsers: true,
      resourceClass,
      teamId,
    });
    const input = [
      pool("team.example", "team", "b"),
      pool("z-free.example", "shared"),
      pool("plus.example", "plus"),
      pool("pro.example", "pro"),
      pool("team.example", "team", "a"),
      pool("free.example", "free"),
      pool("a.example", "shared"),
      pool("shared.example"),
    ];
    const groups = groupRegionalPools(input);
    expect(groups.map(({ group, teamId }) => [group, teamId])).toEqual([
      ["shared", undefined],
      ["free", undefined],
      ["plus", undefined],
      ["pro", undefined],
      ["team", "a"],
      ["team", "b"],
      ["unknown", undefined],
    ]);
    expect(groups[0].pools.map((pool) => pool.entry)).toEqual([
      "a.example",
      "z-free.example",
    ]);
    expect(input[0].teamId).toBe("b");
  });
  it("offers a new reported region without rewriting its transport metadata", () => {
    const options = regionalNodeOptions([node]);
    expect(options).toHaveLength(1);
    expect(options[0].pool).toMatchObject({
      code: "de-fra",
      entry: "custom.entry.example",
      poolCount: 2,
      zhName: "德国",
    });
    expect(options[0].node).toBe(node);
  });
  it("never synthesizes entries from empty, wildcard, or unclassified nodes", () => {
    expect(regionalNodeOptions([])).toEqual([]);
    expect(
      regionalNodeOptions([
        { ...node, address: "*" },
        { name: "template", address: "accounts.example", port: 443 },
      ]),
    ).toEqual([]);
  });
  it("excludes closed regions and deduplicates reports by region and entry", () => {
    expect(
      regionalNodeOptions([
        node,
        node,
        { ...node, region: "us-ca", open_to_users: false },
      ]),
    ).toHaveLength(1);
    expect(
      regionalNodeOptions([
        node,
        { ...node, address: "another.entry.example" },
      ]),
    ).toHaveLength(2);
  });
  it("loads counts and closed state from the authenticated discovery endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          code: "de-fra",
          entry: "custom.entry.example",
          resourceClass: "team",
          teamId: "alpha",
          poolCount: 3,
          openToUsers: false,
          closedReasons: ["unhealthy", "xray_not_running"],
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchRegionalPools()).toEqual([
      expect.objectContaining({
        code: "de-fra",
        resourceClass: "team",
        teamId: "alpha",
        poolCount: 3,
        openToUsers: false,
        closedReasons: ["unhealthy", "xray_not_running"],
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agent-server/v1/regional-pools",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });
  it("keeps empty responses empty and surfaces failures instead of using defaults", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { code: "de", entry: "example", poolCount: -1, openToUsers: true },
        ],
      });
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchRegionalPools()).toEqual([]);
    await expect(fetchRegionalPools()).rejects.toThrow("503");
    await expect(fetchRegionalPools()).rejects.toThrow(
      "unexpected_regional_pools_payload",
    );
  });

  it("accepts an explicitly reported Pro resource without fabricating any node", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            code: "jp",
            entry: "pro.example",
            resourceClass: "pro",
            poolCount: 1,
            openToUsers: true,
          },
        ],
      }),
    );
    expect(await fetchRegionalPools()).toEqual([
      expect.objectContaining({ resourceClass: "pro", entry: "pro.example" }),
    ]);
    expect(regionalNodeOptions([])).toEqual([]);
  });
});
