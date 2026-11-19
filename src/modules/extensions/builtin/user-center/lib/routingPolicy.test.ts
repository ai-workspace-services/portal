import { describe, expect, it } from "vitest";

import {
  DEFAULT_ROUTING_POLICY_YAML,
  parseAndValidateRoutingPolicy,
} from "./routingPolicy";

describe("routingPolicy parser and validator", () => {
  it("validates the canonical three-tier xconnect-routing-policy.yaml", () => {
    const result = parseAndValidateRoutingPolicy(DEFAULT_ROUTING_POLICY_YAML);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.proxyGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Media-Pool",
          mediaOnProAction: "allow",
          fallbackDefault: true,
        }),
        expect.objectContaining({
          name: "Pro-EC2-Pool",
          mediaOnProAction: "allow",
          fallbackDefault: false,
        }),
        expect.objectContaining({
          name: "Custom-Dedicated",
          publicResource: false,
        }),
      ]),
    );
    expect(result.rules[0]).toBe("GEOIP,private,DIRECT,no-resolve");
    expect(result.rules).toContain("GEOSITE,youtube,Media-Pool");
    expect(result.rules).toContain("GEOSITE,openai,Pro-EC2-Pool");
    expect(result.rules[result.rules.length - 1]).toBe("MATCH,Media-Pool");
  });

  it("supports Clash/Mihomo proxy-groups + rules JSON format", () => {
    const jsonInput = JSON.stringify({
      "proxy-groups": [
        {
          name: "Media-Pool",
          type: "url-test",
          proxies: ["jp-xconnect-01.svc.plus"],
        },
        {
          name: "Pro-EC2-Pool",
          type: "url-test",
          proxies: ["jp-xconnect-02.svc.plus"],
          media_on_pro_action: "blackhole",
        },
      ],
      rules: [
        "GEOIP,private,DIRECT,no-resolve",
        "GEOSITE,youtube,Media-Pool",
        "GEOSITE,openai,Pro-EC2-Pool",
        "MATCH,Media-Pool",
      ],
    });

    const result = parseAndValidateRoutingPolicy(jsonInput);
    expect(result.valid).toBe(true);
    expect(result.proxyGroups).toHaveLength(2);
    expect(result.rules).toHaveLength(4);
  });

  it("rejects malformed YAML and missing required pools", () => {
    expect(parseAndValidateRoutingPolicy("")).toMatchObject({
      valid: false,
      errors: ["策略内容不能为空"],
    });

    expect(parseAndValidateRoutingPolicy(":\n  - [unclosed")).toMatchObject({
      valid: false,
    });

    const missingPro = parseAndValidateRoutingPolicy(`
pools:
  Media-Pool:
    media_on_pro_action: "allow"
    nodes: ["jp-1"]
rules:
  - "MATCH,Media-Pool"
`);
    expect(missingPro.valid).toBe(false);
    expect(missingPro.errors).toContain("缺少必需的分流池 Pro-EC2-Pool");
  });

  it("accepts both allow (default) and blackhole (opt-in strict mode) on Pro-EC2-Pool without warnings", () => {
    const allowPro = parseAndValidateRoutingPolicy(`
pools:
  Media-Pool:
    media_on_pro_action: "allow"
    nodes: ["jp-1"]
  Pro-EC2-Pool:
    media_on_pro_action: "allow"
    nodes: ["jp-2"]
rules:
  - "GEOSITE,openai,Pro-EC2-Pool"
  - "MATCH,Media-Pool"
`);
    expect(allowPro.valid).toBe(true);
    expect(allowPro.warnings).toEqual([]);
  });
});
