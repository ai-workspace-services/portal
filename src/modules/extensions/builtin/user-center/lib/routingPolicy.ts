import yaml from "js-yaml";

export type GitOpsPolicyTarget = {
  repository: string;
  branch: string;
  path: string;
  commitMessage: string;
};

export const DEFAULT_GITOPS_TARGET: GitOpsPolicyTarget = {
  repository: "ai-workspace-infra/gitops",
  branch: "main",
  path: "topology/xconnect/routing-policy.yaml",
  commitMessage: "chore(xconnect): sync three-tier routing policy from portal",
};

export const DEFAULT_ROUTING_POLICY_YAML = `version: 1
revision: "2026-11-19.1"

pools:
  Media-Pool:
    public_resource: true
    media_on_pro_action: "allow"
    fallback_default: true
    description: "公共 VPS 大流量池（Free/Shared/Plus）：流媒体优先 + 全网 MATCH 兜底，不做限制"
    pricing_groups:
      - free
      - shared
      - plus
    url_test:
      url: "https://cp.cloudflare.com/generate_204"
      interval: 300
    nodes:
      - "jp-xconnect-01.svc.plus"
      - "ph-xconnect.svc.plus"
      - "jp-xconnect-free-01.svc.plus"

  Pro-EC2-Pool:
    public_resource: true
    media_on_pro_action: "allow"
    fallback_default: false
    description: "公共高速流量池（Pro-EC2-Pool，EC2 t4g.small / c8g 等）：定义为高速流量，不再限制流媒体与下载（默认 allow）；Pro 订阅可用 Media-Pool + Pro-EC2-Pool（如 50 元套餐：30GB 高速 + 50GB VPS），Plus 订阅仅可用 Media-Pool 且 Pro 节点不可见"
    pricing_groups:
      - pro
    url_test:
      url: "https://cp.cloudflare.com/generate_204"
      interval: 180
    nodes:
      - "jp-xconnect-pro-01.svc.plus"

  Custom-Dedicated:
    public_resource: false
    media_on_pro_action: "allow"
    fallback_default: false
    description: "非公共专属节点（Custom 白名单绑定机制）：绝不进入公共池，没有使用限制"
    pricing_groups:
      - custom
      - team
    nodes:
      - "us-xconnect-los-angeles-custom-01.svc.plus"
      - "us-xconnect.svc.plus"

tiers:
  direct_cn_private:
    priority: 1
    target: "DIRECT"
    server_outbound_tag: "direct-cn"
    private_outbound_tag: "blocked-private"
    clash_rules:
      - "GEOIP,private,DIRECT,no-resolve"
      - "GEOSITE,cn,DIRECT"
      - "GEOIP,cn,DIRECT,no-resolve"

  media_pool_priority:
    priority: 2
    target: "Media-Pool"
    server_outbound_tag_on_media_pool: "pool-media-stream"
    server_outbound_tag_on_pro_pool: "blocked-media-on-pro"
    clash_rules:
      - "GEOSITE,youtube,Media-Pool"
      - "GEOSITE,netflix,Media-Pool"
      - "GEOSITE,disney,Media-Pool"
      - "GEOSITE,tiktok,Media-Pool"
      - "GEOSITE,twitch,Media-Pool"
      - "GEOSITE,spotify,Media-Pool"
      - "GEOSITE,bilibili,Media-Pool"
      - "DOMAIN-SUFFIX,speedtest.net,Media-Pool"
      - "DOMAIN-SUFFIX,fast.com,Media-Pool"
      - "DOMAIN-SUFFIX,steamcontent.com,Media-Pool"
      - "DOMAIN-SUFFIX,icloud-content.com,Media-Pool"
      - "DOMAIN-SUFFIX,mega.nz,Media-Pool"

  pro_ec2_whitelist:
    priority: 3
    target: "Pro-EC2-Pool"
    server_outbound_tag: "pool-pro-ai-dev"
    clash_rules:
      - "GEOSITE,openai,Pro-EC2-Pool"
      - "GEOSITE,anthropic,Pro-EC2-Pool"
      - "DOMAIN-SUFFIX,claude.ai,Pro-EC2-Pool"
      - "DOMAIN-SUFFIX,cursor.sh,Pro-EC2-Pool"
      - "DOMAIN-SUFFIX,cursor.com,Pro-EC2-Pool"
      - "GEOSITE,github,Pro-EC2-Pool"
      - "GEOSITE,google,Pro-EC2-Pool"
      - "GEOSITE,cloudflare,Pro-EC2-Pool"

  global_fallback:
    priority: 4
    target: "Media-Pool"
    server_outbound_tag_on_media_pool: "pool-media-fallback"
    server_outbound_tag_on_pro_pool: "pool-pro-unclassified"
    clash_rules:
      - "MATCH,Media-Pool"
`;

export type ProxyGroupPreviewItem = {
  name: string;
  type: string;
  nodes: string[];
  pricingGroups: string[];
  mediaOnProAction: "allow" | "blackhole";
  fallbackDefault: boolean;
  publicResource: boolean;
};

export type RoutingPolicyValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  revision?: string;
  proxyGroups: ProxyGroupPreviewItem[];
  rules: string[];
  normalizedYaml: string;
  normalizedJson: string;
  clashProjectionYaml: string;
};

export type RoutingPolicyResponse = {
  source: "github" | "canonical_default";
  target: Omit<GitOpsPolicyTarget, "commitMessage">;
  yaml: string;
  revision?: string;
  sha?: string;
  fetchedAt: string;
};

export type RoutingPolicySyncResponse = {
  synced: boolean;
  mode: "github_commit" | "dry_run" | "validation_only";
  target: GitOpsPolicyTarget;
  commitSha?: string;
  htmlUrl?: string;
  message: string;
  validation: RoutingPolicyValidationResult;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function parseAndValidateRoutingPolicy(
  rawInput: string,
): RoutingPolicyValidationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      valid: false,
      errors: ["策略内容不能为空"],
      warnings: [],
      proxyGroups: [],
      rules: [],
      normalizedYaml: "",
      normalizedJson: "",
      clashProjectionYaml: "",
    };
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(trimmed);
  } catch (error) {
    return {
      valid: false,
      errors: [
        error instanceof Error
          ? `YAML/JSON 解析失败: ${error.message}`
          : "YAML/JSON 解析失败",
      ],
      warnings: [],
      proxyGroups: [],
      rules: [],
      normalizedYaml: "",
      normalizedJson: "",
      clashProjectionYaml: "",
    };
  }

  if (!isPlainRecord(parsed)) {
    return {
      valid: false,
      errors: ["根节点必须是 YAML/JSON 对象"],
      warnings: [],
      proxyGroups: [],
      rules: [],
      normalizedYaml: "",
      normalizedJson: "",
      clashProjectionYaml: "",
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const proxyGroups: ProxyGroupPreviewItem[] = [];
  const rules: string[] = [];

  if (isPlainRecord(parsed.pools)) {
    for (const [poolName, rawPool] of Object.entries(parsed.pools)) {
      if (!isPlainRecord(rawPool)) {
        errors.push(`pools.${poolName} 必须是对象`);
        continue;
      }
      const rawAction =
        rawPool.media_on_pro_action ?? rawPool.mediaOnProAction ?? "allow";
      if (rawAction !== "allow" && rawAction !== "blackhole") {
        errors.push(
          `pools.${poolName}.media_on_pro_action 必须是 allow 或 blackhole`,
        );
      }
      const nodes = asStringArray(rawPool.nodes ?? rawPool.proxies);
      if (nodes.length === 0) {
        warnings.push(`pools.${poolName} 尚未声明 nodes 节点列表`);
      }
      proxyGroups.push({
        name: poolName,
        type: isPlainRecord(rawPool.url_test) ? "url-test" : "select",
        nodes,
        pricingGroups: asStringArray(
          rawPool.pricing_groups ?? rawPool.pricingGroups,
        ),
        mediaOnProAction: rawAction === "blackhole" ? "blackhole" : "allow",
        fallbackDefault: Boolean(
          rawPool.fallback_default ?? rawPool.fallbackDefault,
        ),
        publicResource:
          rawPool.public_resource !== undefined
            ? Boolean(rawPool.public_resource)
            : poolName !== "Custom-Dedicated",
      });
    }
  } else if (Array.isArray(parsed["proxy-groups"])) {
    for (const rawGroup of parsed["proxy-groups"]) {
      if (!isPlainRecord(rawGroup) || typeof rawGroup.name !== "string") {
        errors.push("proxy-groups 中的每一项都必须包含有效的 name");
        continue;
      }
      const rawAction =
        rawGroup["media_on_pro_action"] ??
        rawGroup["mediaOnProAction"] ??
        (rawGroup.name === "Pro-EC2-Pool" ? "blackhole" : "allow");
      if (rawAction !== "allow" && rawAction !== "blackhole") {
        errors.push(
          `proxy-groups[${rawGroup.name}].media_on_pro_action 必须是 allow 或 blackhole`,
        );
      }
      proxyGroups.push({
        name: rawGroup.name,
        type: typeof rawGroup.type === "string" ? rawGroup.type : "url-test",
        nodes: asStringArray(rawGroup.proxies ?? rawGroup.nodes),
        pricingGroups: asStringArray(rawGroup.pricing_groups),
        mediaOnProAction: rawAction === "blackhole" ? "blackhole" : "allow",
        fallbackDefault: rawGroup.name === "Media-Pool",
        publicResource: rawGroup.name !== "Custom-Dedicated",
      });
    }
  } else {
    errors.push("必须包含 pools（规范格式）或 proxy-groups（Clash/Mihomo 格式）");
  }

  const mediaPool = proxyGroups.find((item) => item.name === "Media-Pool");
  const proPool = proxyGroups.find((item) => item.name === "Pro-EC2-Pool");
  if (!mediaPool) {
    errors.push("缺少必需的分流池 Media-Pool");
  }
  if (!proPool) {
    errors.push("缺少必需的分流池 Pro-EC2-Pool");
  }

  if (isPlainRecord(parsed.tiers)) {
    const tierEntries = Object.entries(parsed.tiers)
      .filter((entry): entry is [string, Record<string, unknown>] =>
        isPlainRecord(entry[1]),
      )
      .sort((a, b) => {
        const pa = typeof a[1].priority === "number" ? a[1].priority : 999;
        const pb = typeof b[1].priority === "number" ? b[1].priority : 999;
        return pa - pb;
      });
    for (const [, tier] of tierEntries) {
      rules.push(...asStringArray(tier.clash_rules ?? tier.rules));
    }
  }
  if (Array.isArray(parsed.rules)) {
    rules.push(...asStringArray(parsed.rules));
  }

  if (rules.length === 0) {
    errors.push("必须声明至少一条路由规则（tiers.*.clash_rules 或 rules）");
  } else if (!rules.some((rule) => rule.startsWith("MATCH,"))) {
    warnings.push("建议保留 MATCH,Media-Pool 作为最终兜底规则");
  }

  const normalizedYaml = yaml.dump(parsed, { noRefs: true, lineWidth: 120 });
  const normalizedJson = `${JSON.stringify(parsed, null, 2)}\n`;
  const clashProjectionYaml = yaml.dump(
    {
      "proxy-groups": proxyGroups.map((group) => ({
        name: group.name,
        type: group.type,
        proxies: group.nodes,
      })),
      rules,
    },
    { noRefs: true, lineWidth: 120 },
  );

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    revision:
      typeof parsed.revision === "string" ? parsed.revision : undefined,
    proxyGroups,
    rules,
    normalizedYaml,
    normalizedJson,
    clashProjectionYaml,
  };
}

export async function fetchRoutingPolicy(): Promise<RoutingPolicyResponse> {
  const response = await fetch("/api/panel/gateway/routing-policy", {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `routing_policy_fetch_failed (${response.status})`;
    throw new Error(message);
  }
  return payload as RoutingPolicyResponse;
}

export async function syncRoutingPolicy(input: {
  content: string;
  repository: string;
  branch: string;
  path: string;
  commitMessage: string;
  dryRun?: boolean;
}): Promise<RoutingPolicySyncResponse> {
  const response = await fetch("/api/panel/gateway/routing-policy", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `routing_policy_sync_failed (${response.status})`;
    throw new Error(message);
  }
  return payload as RoutingPolicySyncResponse;
}
