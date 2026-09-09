import { describe, expect, it } from "vitest";

import { regionalNodeOptions, regionForNode } from "./regionalPools";
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
  });
});
