import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRegionalPools, regionalNodeOptions } from "./regionalPools";
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
});
