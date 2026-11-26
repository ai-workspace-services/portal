import fs from "node:fs/promises";
import path from "node:path";

import {
  getCloudflareCapabilities,
  resolveCloudflareToken,
} from "./providers/cloudflare";
import {
  getWebhookCapabilities,
  resolveWebhookSecret,
} from "./providers/webhook";
import type {
  CloudflarePlanTier,
  WafProviderConfig,
  WafProviderRecord,
  WafProviderType,
  WafProviderUpsertInput,
} from "./types";

const DEFAULT_STORE_PATH = path.join(process.cwd(), ".data", "waf-providers.json");

let memoryStore: Map<string, WafProviderRecord> | null = null;

function getStorePath(): string {
  return process.env.WAF_PROVIDERS_STORE_PATH?.trim() || DEFAULT_STORE_PATH;
}

function normalizePlanTier(tier?: string): CloudflarePlanTier {
  if (tier === "pro" || tier === "business" || tier === "enterprise") {
    return tier;
  }
  return "free";
}

function normalizeProviderId(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `waf-${Date.now()}`;
}

function computeCapabilities(record: Pick<WafProviderRecord, "type" | "planTier">) {
  return record.type === "cloudflare"
    ? getCloudflareCapabilities(record.planTier)
    : getWebhookCapabilities();
}

function computeHasSecret(record: WafProviderRecord): boolean {
  if (record.credentialSource === "custom") {
    return Boolean(record.customSecret?.trim());
  }
  if (record.type === "cloudflare") {
    return Boolean(resolveCloudflareToken(record));
  }
  return Boolean(resolveWebhookSecret(record));
}

export function sanitizeProvider(record: WafProviderRecord): WafProviderConfig {
  const { customSecret: _removed, ...rest } = record;
  return {
    ...rest,
    capabilities: computeCapabilities(record),
    hasSecret: computeHasSecret(record),
  };
}

function buildSeedRecords(): WafProviderRecord[] {
  const now = new Date().toISOString();
  const cfTier = normalizePlanTier(process.env.CLOUDFLARE_PLAN_TIER?.trim());
  const cfZoneId =
    process.env.CLOUDFLARE_ZONE_TAG?.trim() ||
    process.env.CLOUDFLARE_ZONE_ID?.trim() ||
    "";
  const webhookUrl = process.env.WAF_WEBHOOK_URL?.trim() || "";

  const seeds: WafProviderRecord[] = [
    {
      id: "cloudflare-default",
      type: "cloudflare",
      name: "Cloudflare WAF",
      enabled: true,
      builtIn: true,
      domain: process.env.CLOUDFLARE_DEFAULT_DOMAIN?.trim() || "",
      zoneId: cfZoneId,
      planTier: cfTier,
      credentialSource: "env",
      hasSecret: false,
      capabilities: getCloudflareCapabilities(cfTier),
      updatedAt: now,
    },
    {
      id: "open-webhook",
      type: "webhook",
      name: "Open Webhook / 自建边缘 WAF",
      enabled: Boolean(webhookUrl),
      builtIn: true,
      endpointUrl: webhookUrl,
      credentialSource: "env",
      hasSecret: false,
      capabilities: getWebhookCapabilities(),
      updatedAt: now,
    },
  ];

  const rawJson = process.env.WAF_PROVIDERS_JSON?.trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item || typeof item !== "object") continue;
          const type: WafProviderType =
            item.type === "webhook" ? "webhook" : "cloudflare";
          const id = normalizeProviderId(String(item.id || item.name || ""));
          const planTier =
            type === "cloudflare" ? normalizePlanTier(item.planTier) : undefined;
          const credentialSource =
            item.credentialSource === "custom" || item.secret ? "custom" : "env";
          const record: WafProviderRecord = {
            id,
            type,
            name: String(item.name || id),
            enabled: item.enabled !== false,
            builtIn: id === "cloudflare-default" || id === "open-webhook",
            domain: typeof item.domain === "string" ? item.domain.trim() : "",
            zoneId: typeof item.zoneId === "string" ? item.zoneId.trim() : "",
            planTier,
            endpointUrl:
              typeof item.endpointUrl === "string" ? item.endpointUrl.trim() : "",
            credentialSource,
            customSecret:
              typeof item.secret === "string" && item.secret.trim()
                ? item.secret.trim()
                : undefined,
            hasSecret: false,
            capabilities: computeCapabilities({ type, planTier }),
            updatedAt: now,
          };
          record.hasSecret = computeHasSecret(record);
          const idx = seeds.findIndex((s) => s.id === id);
          if (idx >= 0) {
            seeds[idx] = record;
          } else {
            seeds.push(record);
          }
        }
      }
    } catch {
      // Ignore malformed WAF_PROVIDERS_JSON so built-in defaults still load.
    }
  }

  for (const seed of seeds) {
    seed.hasSecret = computeHasSecret(seed);
  }
  return seeds;
}

async function loadStore(): Promise<Map<string, WafProviderRecord>> {
  if (memoryStore) {
    return memoryStore;
  }

  const map = new Map<string, WafProviderRecord>();
  for (const seed of buildSeedRecords()) {
    map.set(seed.id, seed);
  }

  try {
    const raw = await fs.readFile(getStorePath(), "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!item || typeof item !== "object" || typeof item.id !== "string") {
          continue;
        }
        const type: WafProviderType =
          item.type === "webhook" ? "webhook" : "cloudflare";
        const planTier =
          type === "cloudflare" ? normalizePlanTier(item.planTier) : undefined;
        const record: WafProviderRecord = {
          id: item.id,
          type,
          name: String(item.name || item.id),
          enabled: item.enabled !== false,
          builtIn:
            item.builtIn === true ||
            item.id === "cloudflare-default" ||
            item.id === "open-webhook",
          domain: typeof item.domain === "string" ? item.domain : "",
          zoneId: typeof item.zoneId === "string" ? item.zoneId : "",
          planTier,
          endpointUrl:
            typeof item.endpointUrl === "string" ? item.endpointUrl : "",
          credentialSource: item.credentialSource === "custom" ? "custom" : "env",
          customSecret:
            typeof item.customSecret === "string" ? item.customSecret : undefined,
          hasSecret: false,
          capabilities: computeCapabilities({ type, planTier }),
          updatedAt:
            typeof item.updatedAt === "string"
              ? item.updatedAt
              : new Date().toISOString(),
        };
        record.hasSecret = computeHasSecret(record);
        map.set(record.id, record);
      }
    }
  } catch {
    // Store file may not exist yet; start with seeded defaults.
  }

  memoryStore = map;
  return map;
}

async function persistStore(store: Map<string, WafProviderRecord>): Promise<void> {
  const filePath = getStorePath();
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const records = Array.from(store.values());
    await fs.writeFile(filePath, JSON.stringify(records, null, 2), "utf8");
  } catch {
    // Keep in-memory state if disk is read-only.
  }
}

export function resetWafStoreForTests(): void {
  memoryStore = null;
}

export async function listProviders(): Promise<WafProviderConfig[]> {
  const store = await loadStore();
  return Array.from(store.values()).map(sanitizeProvider);
}

export async function getProviderRecord(id: string): Promise<WafProviderRecord | null> {
  const store = await loadStore();
  return store.get(id) ?? null;
}

export async function upsertProvider(
  input: WafProviderUpsertInput,
): Promise<WafProviderConfig> {
  const store = await loadStore();
  const id = normalizeProviderId(input.id || input.name);
  const existing = store.get(id);
  const type: WafProviderType =
    input.type === "webhook" ? "webhook" : "cloudflare";
  const planTier =
    type === "cloudflare"
      ? normalizePlanTier(input.planTier ?? existing?.planTier)
      : undefined;

  const trimmedSecret = input.secret?.trim();
  const credentialSource =
    input.credentialSource ??
    (trimmedSecret ? "custom" : existing?.credentialSource ?? "env");

  let customSecret = existing?.customSecret;
  if (credentialSource === "env") {
    customSecret = undefined;
  } else if (trimmedSecret) {
    customSecret = trimmedSecret;
  }

  const record: WafProviderRecord = {
    id,
    type,
    name: input.name.trim() || existing?.name || id,
    enabled: input.enabled ?? existing?.enabled ?? true,
    builtIn:
      existing?.builtIn === true ||
      id === "cloudflare-default" ||
      id === "open-webhook",
    domain:
      typeof input.domain === "string"
        ? input.domain.trim()
        : existing?.domain ?? "",
    zoneId:
      typeof input.zoneId === "string"
        ? input.zoneId.trim()
        : existing?.zoneId ?? "",
    planTier,
    endpointUrl:
      typeof input.endpointUrl === "string"
        ? input.endpointUrl.trim()
        : existing?.endpointUrl ?? "",
    credentialSource,
    customSecret,
    hasSecret: false,
    capabilities: computeCapabilities({ type, planTier }),
    updatedAt: new Date().toISOString(),
  };
  record.hasSecret = computeHasSecret(record);

  store.set(id, record);
  await persistStore(store);
  return sanitizeProvider(record);
}

export async function deleteProvider(id: string): Promise<{ deleted: boolean; reason?: string }> {
  const store = await loadStore();
  const existing = store.get(id);
  if (!existing) {
    return { deleted: false, reason: "not_found" };
  }
  if (existing.builtIn) {
    return { deleted: false, reason: "cannot_delete_builtin" };
  }
  store.delete(id);
  await persistStore(store);
  return { deleted: true };
}
