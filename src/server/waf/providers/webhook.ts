import crypto from "node:crypto";

import type {
  CrawlerPolicyInput,
  WafConnectionTestResult,
  WafProviderCapabilities,
  WafProviderRecord,
  WafRemoteStatusResult,
  WafSyncResult,
} from "../types";

export function getWebhookCapabilities(): WafProviderCapabilities {
  return {
    supportsObserveMode: true,
    supportsChallengeMode: true,
    supportsZoneDiscovery: false,
    supportsRemoteStatus: false,
    note: "向自定义开放 WAF / APISIX / Caddy-Coraza / Ansible Webhook 推送标准 xconnect.waf.crawler/v1 策略载荷（支持 HMAC-SHA256 验签）。",
  };
}

export function resolveWebhookSecret(provider: WafProviderRecord): string {
  if (
    provider.credentialSource === "custom" &&
    provider.customSecret?.trim()
  ) {
    return provider.customSecret.trim();
  }
  return process.env.WAF_WEBHOOK_SECRET?.trim() ?? "";
}

function validateWebhookUrl(rawUrl: string | undefined): URL {
  const trimmed = rawUrl?.trim();
  if (!trimmed) {
    throw new Error("请先配置 Webhook Endpoint URL。");
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`无效的 Webhook URL: ${trimmed}`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Webhook URL 仅支持 http/https 协议。");
  }
  const host = parsed.hostname.toLowerCase();
  const allowPrivate = process.env.ALLOW_PRIVATE_WAF_WEBHOOK === "true";
  if (
    !allowPrivate &&
    (host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("169.254."))
  ) {
    throw new Error("默认禁止指向本机回环或链路本地地址的 Webhook URL。");
  }
  return parsed;
}

export function signWebhookPayload(body: string, secret: string): string {
  const mac = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${mac}`;
}

export async function testWebhookConnection(
  provider: WafProviderRecord,
): Promise<WafConnectionTestResult> {
  const url = validateWebhookUrl(provider.endpointUrl);
  try {
    const response = await fetch(url.toString(), {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    return {
      ok: response.ok || response.status === 405,
      providerId: provider.id,
      message:
        response.ok || response.status === 405
          ? `Webhook 端点可达 (${url.origin} -> HTTP ${response.status})`
          : `Webhook 端点返回异常状态 HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      providerId: provider.id,
      message: `Webhook 连接失败: ${error instanceof Error ? error.message : "unknown_error"}`,
    };
  }
}

export async function publishWebhookCrawlerPolicy(
  provider: WafProviderRecord,
  policy: CrawlerPolicyInput,
): Promise<WafSyncResult> {
  const url = validateWebhookUrl(provider.endpointUrl);
  const secret = resolveWebhookSecret(provider);
  const syncedAt = new Date().toISOString();

  const payload = JSON.stringify({
    schema: "xconnect.waf.crawler/v1",
    providerId: provider.id,
    domain: policy.domain.toLowerCase(),
    mode: policy.mode,
    rules: policy.bots.map((userAgent) => ({ userAgent, action: policy.mode })),
    exceptions: policy.exceptions ?? ["/robots.txt"],
    syncedAt,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "XConnect-Portal-WAF/1.0",
  };
  if (secret) {
    headers["X-XConnect-Signature-256"] = signWebhookPayload(payload, secret);
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: payload,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Webhook 下发失败 (HTTP ${response.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  }

  return {
    ok: true,
    providerId: provider.id,
    providerType: "webhook",
    domain: policy.domain,
    mode: policy.mode,
    appliedAction: `webhook:${policy.mode}`,
    message: `已推送标准策略到开放 WAF Webhook (${url.origin})`,
    syncedAt,
  };
}

export async function getWebhookRemoteStatus(
  provider: WafProviderRecord,
): Promise<WafRemoteStatusResult> {
  return {
    ok: true,
    providerId: provider.id,
    configured: Boolean(provider.endpointUrl?.trim()),
    message: provider.endpointUrl?.trim()
      ? `开放 WAF Webhook 已配置目标 ${provider.endpointUrl}（推送模式，无远端状态回查接口）`
      : "尚未配置 Webhook Endpoint URL。",
  };
}
