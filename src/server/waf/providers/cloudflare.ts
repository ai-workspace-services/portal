import type {
  CloudflarePlanTier,
  CrawlerPolicyInput,
  WafActionMode,
  WafConnectionTestResult,
  WafProviderCapabilities,
  WafProviderRecord,
  WafRemoteStatusResult,
  WafSyncResult,
} from "../types";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const CRAWLER_RULE_REF = "xconnect_crawler_protection";
const CRAWLER_RULE_DESCRIPTION =
  "[xconnect-crawler] Managed crawler protection rule";
const BOT_TOKEN_PATTERN = /^[A-Za-z0-9._/-]{1,64}$/;
const EXCEPTION_PATH_PATTERN = /^\/[A-Za-z0-9._~/-]{0,128}$/;

export function getCloudflareCapabilities(
  planTier: CloudflarePlanTier = "free",
): WafProviderCapabilities {
  const isEnterprise = planTier === "enterprise";
  return {
    supportsObserveMode: isEnterprise,
    supportsChallengeMode: true,
    supportsZoneDiscovery: true,
    supportsRemoteStatus: true,
    note: isEnterprise
      ? "Cloudflare Enterprise 支持 log（观察）、managed_challenge 与 block。"
      : "Cloudflare Free/Pro/Business 自定义防火墙规则支持 managed_challenge 与 block；观察模式 (log) 仅 Enterprise 套餐可用。",
  };
}

export function resolveCloudflareToken(provider: WafProviderRecord): string {
  if (
    provider.credentialSource === "custom" &&
    provider.customSecret?.trim()
  ) {
    return provider.customSecret.trim();
  }
  return process.env.CLOUDFLARE_API_TOKEN?.trim() ?? "";
}

export function buildCloudflareCrawlerExpression(
  bots: string[],
  exceptions: string[] = ["/robots.txt"],
): string {
  const cleanBots = bots
    .map((b) => b.trim())
    .filter((b) => BOT_TOKEN_PATTERN.test(b));
  if (cleanBots.length === 0) {
    throw new Error("至少选择一个有效的爬虫 User-Agent 规则。");
  }

  const uaClauses = cleanBots.map(
    (bot) => `http.user_agent contains "${bot.replaceAll('"', '\\"')}"`,
  );
  const uaExpr =
    uaClauses.length === 1 ? uaClauses[0] : `(${uaClauses.join(" or ")})`;

  const cleanExceptions = exceptions
    .map((p) => p.trim())
    .filter((p) => EXCEPTION_PATH_PATTERN.test(p));
  if (cleanExceptions.length === 0) {
    return uaExpr;
  }

  const excClauses = cleanExceptions.map(
    (p) => `http.request.uri.path eq "${p.replaceAll('"', '\\"')}"`,
  );
  const excExpr =
    excClauses.length === 1 ? excClauses[0] : `(${excClauses.join(" or ")})`;
  return `${uaExpr} and not ${excExpr}`;
}

export function mapModeToCloudflareAction(
  mode: WafActionMode,
  planTier: CloudflarePlanTier = "free",
): string {
  switch (mode) {
    case "block":
      return "block";
    case "challenge":
      return "managed_challenge";
    case "observe":
      if (planTier !== "enterprise") {
        throw new Error(
          "当前 Cloudflare 套餐不支持纯观察 (log) 动作，请切换为「托管质询 (challenge)」或「拒绝模式 (block)」。",
        );
      }
      return "log";
  }
}

type CloudflareApiResponse<T> = {
  success: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  result?: T;
};

async function cfRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<{ status: number; data: CloudflareApiResponse<T> }> {
  const response = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response
    .json()
    .catch(() => ({ success: false }))) as CloudflareApiResponse<T>;
  return { status: response.status, data };
}

function formatCfError(data: CloudflareApiResponse<unknown>, fallback: string) {
  const msg = data.errors
    ?.map((e) => e.message)
    .filter(Boolean)
    .join("; ");
  return msg || fallback;
}

async function resolveZoneId(
  token: string,
  domain?: string,
  configuredZoneId?: string,
): Promise<{ zoneId: string; zoneName?: string; planName?: string }> {
  const explicit = configuredZoneId?.trim() || process.env.CLOUDFLARE_ZONE_TAG?.trim();
  if (explicit) {
    const { data } = await cfRequest<{
      id: string;
      name?: string;
      plan?: { name?: string };
    }>(`/zones/${encodeURIComponent(explicit)}`, token);
    if (data.success && data.result?.id) {
      return {
        zoneId: data.result.id,
        zoneName: data.result.name,
        planName: data.result.plan?.name,
      };
    }
    if (!domain) {
      throw new Error(formatCfError(data, `无法验证 Cloudflare Zone (${explicit})`));
    }
  }

  const trimmedDomain = domain?.trim().toLowerCase();
  if (!trimmedDomain) {
    throw new Error("请提供站点域名或 Cloudflare Zone ID。");
  }

  // Walk up domain labels (e.g. console.svc.plus -> svc.plus) to find the apex Zone
  const labels = trimmedDomain.split(".");
  for (let i = 0; i <= Math.max(0, labels.length - 2); i += 1) {
    const candidate = labels.slice(i).join(".");
    const { data } = await cfRequest<
      Array<{ id: string; name?: string; plan?: { name?: string } }>
    >(`/zones?name=${encodeURIComponent(candidate)}`, token);
    if (data.success && Array.isArray(data.result) && data.result.length > 0) {
      const zone = data.result[0];
      return {
        zoneId: zone.id,
        zoneName: zone.name,
        planName: zone.plan?.name,
      };
    }
  }

  throw new Error(`未在当前 Cloudflare Token 权限下找到域名 ${trimmedDomain} 对应的 Zone。`);
}

export async function testCloudflareConnection(
  provider: WafProviderRecord,
  domainOverride?: string,
): Promise<WafConnectionTestResult> {
  const token = resolveCloudflareToken(provider);
  if (!token) {
    return {
      ok: false,
      providerId: provider.id,
      message: "未配置 Cloudflare API Token（环境变量 CLOUDFLARE_API_TOKEN 或自定义 Token）。",
    };
  }

  const verify = await cfRequest<{ status?: string }>(
    "/user/tokens/verify",
    token,
  );
  if (!verify.data.success) {
    return {
      ok: false,
      providerId: provider.id,
      message: formatCfError(verify.data, "Cloudflare API Token 校验失败"),
    };
  }

  const targetDomain = domainOverride?.trim() || provider.domain?.trim();
  if (targetDomain || provider.zoneId?.trim()) {
    const zone = await resolveZoneId(token, targetDomain, provider.zoneId);
    return {
      ok: true,
      providerId: provider.id,
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      planName: zone.planName,
      message: `Cloudflare Token 有效，已匹配 Zone: ${zone.zoneName ?? zone.zoneId} (${zone.planName ?? "unknown"})`,
    };
  }

  return {
    ok: true,
    providerId: provider.id,
    message: "Cloudflare API Token 校验通过（未指定域名/Zone ID，下发时将按域名自动解析 Zone）。",
  };
}

type CfRulesetRule = {
  id?: string;
  ref?: string;
  action: string;
  expression: string;
  description?: string;
  enabled?: boolean;
};

type CfRuleset = {
  id: string;
  name?: string;
  rules?: CfRulesetRule[];
};

export async function publishCloudflareCrawlerPolicy(
  provider: WafProviderRecord,
  policy: CrawlerPolicyInput,
): Promise<WafSyncResult> {
  const token = resolveCloudflareToken(provider);
  if (!token) {
    throw new Error("未配置 Cloudflare API Token，无法下发规则。");
  }

  const planTier = provider.planTier ?? "free";
  const action = mapModeToCloudflareAction(policy.mode, planTier);
  const expression = buildCloudflareCrawlerExpression(
    policy.bots,
    policy.exceptions ?? ["/robots.txt"],
  );
  const { zoneId, zoneName } = await resolveZoneId(
    token,
    policy.domain,
    provider.zoneId,
  );

  const entrypointPath = `/zones/${encodeURIComponent(zoneId)}/rulesets/phases/http_request_firewall_custom/entrypoint`;
  const existing = await cfRequest<CfRuleset>(entrypointPath, token);

  const desiredRule: CfRulesetRule = {
    ref: CRAWLER_RULE_REF,
    action,
    expression,
    description: `${CRAWLER_RULE_DESCRIPTION} (${policy.domain})`,
    enabled: true,
  };

  let rulesetId: string | undefined;
  let ruleId: string | undefined;

  if (existing.status === 404 || !existing.data.success || !existing.data.result) {
    const created = await cfRequest<CfRuleset>(
      `/zones/${encodeURIComponent(zoneId)}/rulesets`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          name: "XConnect Custom Firewall Rules",
          kind: "zone",
          phase: "http_request_firewall_custom",
          rules: [desiredRule],
        }),
      },
    );
    if (!created.data.success || !created.data.result) {
      throw new Error(
        formatCfError(created.data, "创建 Cloudflare WAF Ruleset 失败"),
      );
    }
    rulesetId = created.data.result.id;
    ruleId = created.data.result.rules?.find(
      (r) => r.ref === CRAWLER_RULE_REF,
    )?.id;
  } else {
    const currentRules = existing.data.result.rules ?? [];
    const nextRules = currentRules.filter(
      (r) =>
        r.ref !== CRAWLER_RULE_REF &&
        !(r.description ?? "").startsWith(CRAWLER_RULE_DESCRIPTION),
    );
    nextRules.push(desiredRule);

    const updated = await cfRequest<CfRuleset>(
      `/zones/${encodeURIComponent(zoneId)}/rulesets/${encodeURIComponent(existing.data.result.id)}`,
      token,
      {
        method: "PUT",
        body: JSON.stringify({
          rules: nextRules,
        }),
      },
    );
    if (!updated.data.success || !updated.data.result) {
      throw new Error(
        formatCfError(updated.data, "更新 Cloudflare WAF Ruleset 失败"),
      );
    }
    rulesetId = updated.data.result.id;
    ruleId = updated.data.result.rules?.find(
      (r) =>
        r.ref === CRAWLER_RULE_REF ||
        (r.description ?? "").startsWith(CRAWLER_RULE_DESCRIPTION),
    )?.id;
  }

  return {
    ok: true,
    providerId: provider.id,
    providerType: "cloudflare",
    domain: policy.domain,
    mode: policy.mode,
    appliedAction: action,
    ruleId,
    rulesetId,
    expression,
    message: `已同步至 Cloudflare Zone ${zoneName ?? zoneId}（动作: ${action}）`,
    syncedAt: new Date().toISOString(),
  };
}

export async function getCloudflareRemoteStatus(
  provider: WafProviderRecord,
  domain?: string,
): Promise<WafRemoteStatusResult> {
  const token = resolveCloudflareToken(provider);
  if (!token) {
    return {
      ok: false,
      providerId: provider.id,
      configured: false,
      message: "未配置 Cloudflare API Token。",
    };
  }

  const { zoneId, zoneName } = await resolveZoneId(
    token,
    domain || provider.domain,
    provider.zoneId,
  );
  const entrypointPath = `/zones/${encodeURIComponent(zoneId)}/rulesets/phases/http_request_firewall_custom/entrypoint`;
  const existing = await cfRequest<CfRuleset>(entrypointPath, token);
  if (existing.status === 404 || !existing.data.success || !existing.data.result) {
    return {
      ok: true,
      providerId: provider.id,
      configured: false,
      message: `Zone ${zoneName ?? zoneId} 尚未配置自定义防火墙规则集。`,
    };
  }

  const rule = existing.data.result.rules?.find(
    (r) =>
      r.ref === CRAWLER_RULE_REF ||
      (r.description ?? "").startsWith(CRAWLER_RULE_DESCRIPTION),
  );
  if (!rule) {
    return {
      ok: true,
      providerId: provider.id,
      configured: false,
      message: `Zone ${zoneName ?? zoneId} 尚未下发 XConnect 爬虫防护规则。`,
    };
  }

  return {
    ok: true,
    providerId: provider.id,
    configured: true,
    ruleId: rule.id,
    action: rule.action,
    enabled: rule.enabled !== false,
    expression: rule.expression,
    message: `Cloudflare Zone ${zoneName ?? zoneId} 已启用规则（action=${rule.action}）`,
  };
}
