import { describe, expect, it } from "vitest";

import {
  regionalNodeOptions,
  regionForNode,
  XCONNECT_REGIONAL_POOLS,
} from "./regionalPools";
import type { VlessNode } from "./vless";

const node = (name: string, address: string): VlessNode => ({
  name,
  address,
  port: 443,
  transport: "xhttp",
  uri_scheme_xhttp: "vless://${UUID}@${DOMAIN}:443?sni=${SNI}#${TAG}",
});

describe("regional pools", () => {
  it("maps runtime node metadata to the corresponding public region", () => {
    expect(regionForNode(node("Tokyo", "jp-xhttp.internal"))?.code).toBe(
      "jpn-tky",
    );
    expect(regionForNode(node("Manila", "ph-xhttp.internal"))?.code).toBe(
      "ph-mnl",
    );
  });

  it("replaces every exposed VLESS host with a lowercase regional entry", () => {
    const options = regionalNodeOptions([
      node("JP-XHTTP", "runtime-jp.internal"),
      node("US-XHTTP", "runtime-us.internal"),
      node("Hong Kong", "runtime-hk.internal"),
      node("Manila", "runtime-ph.internal"),
    ]);

    expect(options.map(({ node: option }) => option.address)).toEqual([
      "jp-xconnect.svc.plus",
      "us-xconnect.svc.plus",
      "hk-xconnect.svc.plus",
      "ph-xconnect.svc.plus",
    ]);
    expect(
      options.every(
        ({ node: option }) => option.server_name === option.address,
      ),
    ).toBe(true);
    expect(options.map(({ node: option }) => option.name)).toEqual([
      "JP-Connect",
      "US-Connect",
      "HK-Connect",
      "PH-Connect",
    ]);
  });

  it("does not assign an unknown runtime node to an arbitrary region", () => {
    expect(
      regionalNodeOptions([node("unclassified-edge", "edge.internal")]),
    ).toEqual([]);
  });

  it("recognizes the PH manually provisioned node", () => {
    expect(
      regionForNode(node("ph-surfercloud-01", "165.154.233.239"))?.code,
    ).toBe("ph-mnl");
  });

  it("declares an explicit open-to-users state for every region", () => {
    for (const pool of XCONNECT_REGIONAL_POOLS) {
      expect(typeof pool.openToUsers).toBe("boolean");
    }
  });

  // Derived from the declaration rather than hard-coded, so closing a region
  // in regionalPools.ts keeps this test meaningful instead of breaking it.
  it("offers exactly the regions marked open to users", () => {
    const options = regionalNodeOptions(
      XCONNECT_REGIONAL_POOLS.map((pool) =>
        node(pool.shortCode, `runtime-${pool.shortCode.toLowerCase()}-x.internal`),
      ),
    );

    expect(options.map(({ pool }) => pool.code)).toEqual(
      XCONNECT_REGIONAL_POOLS.filter((pool) => pool.openToUsers).map(
        (pool) => pool.code,
      ),
    );
    expect(options.every(({ pool }) => pool.openToUsers)).toBe(true);
  });
});
