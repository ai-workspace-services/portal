import fs from "node:fs/promises";
import path from "node:path";

import type {
  ConnectorAuthMode,
  ConnectorDefinition,
  ConnectorRecord,
  ConnectorRuntime,
  ConnectorSanitizedConfigDocument,
} from "./types";

export const DEFAULT_GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1V4u9b6MFIJgVuVAb056jidZLSFMiyhJJj9eDSGud1_I/edit?gid=1136257492#gid=1136257492";

export const BUILTIN_CONNECTOR_CATALOG: ConnectorDefinition[] = [
  {
    id: "github",
    name: "GitHub",
    description: "支持 GitHub OIDC 与仓库工作流接入。",
    category: "code",
    categoryLabel: "代码托管",
    authKinds: ["oidc", "api-token"],
    preferredAuth: "oidc",
  },
  {
    id: "gitea",
    name: "Gitea",
    description: "自托管或 Gitea.com 仓库与组织连接。",
    category: "code",
    categoryLabel: "代码托管",
    authKinds: ["api-token", "oidc"],
    preferredAuth: "api-token",
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "GitLab SaaS 或私有部署实例流水线集成。",
    category: "code",
    categoryLabel: "代码托管",
    authKinds: ["oidc", "api-token"],
    preferredAuth: "oidc",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "通过 Google OAuth 连接邮箱与服务通知工作流。",
    category: "email",
    categoryLabel: "邮件通信",
    authKinds: ["oidc"],
    preferredAuth: "oidc",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Google OAuth2 授权读写云端表格，驱动管理台订阅双向同步。",
    category: "workspace",
    categoryLabel: "办公协作",
    authKinds: ["oidc", "service-account"],
    preferredAuth: "oidc",
  },
  {
    id: "google-workspaces",
    name: "Google Workspaces",
    description: "集成 Google Drive、Sheets 与 Docs 办公协作套件。",
    category: "workspace",
    categoryLabel: "办公协作",
    authKinds: ["oidc"],
    preferredAuth: "oidc",
  },
  {
    id: "vault",
    name: "Vault Server",
    description: "HashiCorp Vault 密钥与凭据安全读取。",
    category: "secrets",
    categoryLabel: "密钥安全",
    authKinds: ["api-token", "oidc"],
    preferredAuth: "api-token",
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    description: "Cloudflare Workers、DNS 与边缘网络规则。",
    category: "cloud",
    categoryLabel: "云基础设施",
    authKinds: ["api-token"],
    preferredAuth: "api-token",
  },
  {
    id: "aws-lightsail",
    name: "AWS Lightsail",
    description: "AWS Lightsail 实例、静态 IP 与节点健康。",
    category: "cloud",
    categoryLabel: "云基础设施",
    authKinds: ["ak-sk", "oidc"],
    preferredAuth: "ak-sk",
  },
  {
    id: "gcp",
    name: "GCP",
    description: "Google Cloud 项目、Cloud Run 与 IAM 身份治理。",
    category: "cloud",
    categoryLabel: "云基础设施",
    authKinds: ["oidc", "service-account"],
    preferredAuth: "oidc",
  },
  {
    id: "linode-vps",
    name: "Linode VPS",
    description: "Akamai / Linode VPS 边缘节点资源与算力管理。",
    category: "cloud",
    categoryLabel: "云基础设施",
    authKinds: ["api-token"],
    preferredAuth: "api-token",
  },
];

type PersistedStoreV2 = {
  version: 2;
  users: Record<string, ConnectorRecord[]>;
};

const DEFAULT_STORE_PATH = path.join(process.cwd(), ".data", "connectors.json");

let memoryStoreByUser: Map<string, Map<string, ConnectorRecord>> | null = null;

function getStorePath(): string {
  return process.env.CONNECTORS_STORE_PATH?.trim() || DEFAULT_STORE_PATH;
}

export function resetConnectorsMemoryCache(): void {
  memoryStoreByUser = null;
}

function normalizeOwnerId(userId: string): string {
  const ownerId = userId.trim();
  if (!ownerId) {
    throw new Error("connector owner userId is required");
  }
  return ownerId;
}

function readFirstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

export function parseSpreadsheetLocation(urlOrId?: string): {
  spreadsheetId?: string;
  gid?: string;
} {
  const raw = urlOrId?.trim();
  if (!raw) return {};

  const idMatch = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const spreadsheetId = idMatch
    ? idMatch[1]
    : /^[a-zA-Z0-9-_]{20,}$/.test(raw)
      ? raw
      : undefined;

  let gid: string | undefined;
  try {
    const parsed = new URL(raw);
    const hashGid = parsed.hash.match(/gid=(\d+)/)?.[1];
    const queryGid = parsed.searchParams.get("gid") ?? undefined;
    gid = hashGid || queryGid;
  } catch {
    gid = raw.match(/gid=(\d+)/)?.[1];
  }

  return {
    spreadsheetId,
    gid: spreadsheetId ? gid || "0" : undefined,
  };
}

function resolveEnvSeed(id: string): Partial<ConnectorRecord> {
  if (id === "google-drive") {
    const spreadsheetUrl =
      readFirstEnv("GOOGLE_SHEETS_SUBSCRIPTION_URL") ||
      DEFAULT_GOOGLE_SHEET_URL;
    const loc = parseSpreadsheetLocation(spreadsheetUrl);
    return {
      spreadsheetUrl,
      spreadsheetId: loc.spreadsheetId,
      gid: loc.gid,
      status: "available",
      authMode: "none",
    };
  }
  if (id === "vault") {
    return {
      endpoint: readFirstEnv("VAULT_SERVER_URL", "VAULT_ADDR", "vault_addr"),
      status: "available",
      authMode: "none",
    };
  }
  return { status: "available", authMode: "none" };
}

function isGoogleOAuthClientConfigured(record?: ConnectorRecord): boolean {
  const clientId =
    record?.clientId?.trim() ||
    readFirstEnv(
      "GOOGLE_DRIVE_CLIENT_ID",
      "GOOGLE_CLIENT_ID",
      "OAUTH_GOOGLE_CLIENT_ID",
    );
  const clientSecret =
    record?.clientSecret?.trim() ||
    readFirstEnv(
      "GOOGLE_DRIVE_CLIENT_SECRET",
      "GOOGLE_CLIENT_SECRET",
      "OAUTH_GOOGLE_CLIENT_SECRET",
    );
  return Boolean(clientId && clientSecret);
}

function buildSeedRecords(): ConnectorRecord[] {
  const now = new Date().toISOString();
  return BUILTIN_CONNECTOR_CATALOG.map((item) => {
    const envSeed = resolveEnvSeed(item.id);
    return {
      id: item.id,
      status: envSeed.status ?? "available",
      authMode: envSeed.authMode ?? "none",
      endpoint: envSeed.endpoint,
      spreadsheetUrl: envSeed.spreadsheetUrl,
      spreadsheetId: envSeed.spreadsheetId,
      gid: envSeed.gid,
      updatedAt: now,
    };
  });
}

function buildUserSeedMap(): Map<string, ConnectorRecord> {
  const userMap = new Map<string, ConnectorRecord>();
  for (const seed of buildSeedRecords()) {
    userMap.set(seed.id, seed);
  }
  return userMap;
}

async function readDiskStoreV2(): Promise<PersistedStoreV2 | null> {
  try {
    const content = await fs.readFile(getStorePath(), "utf8");
    const parsed = JSON.parse(content) as Partial<PersistedStoreV2>;
    if (
      parsed &&
      parsed.version === 2 &&
      parsed.users &&
      typeof parsed.users === "object" &&
      !Array.isArray(parsed.users)
    ) {
      return {
        version: 2,
        users: parsed.users,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function writeDiskStoreV2(
  byUser: Map<string, Map<string, ConnectorRecord>>,
): Promise<void> {
  const filePath = getStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const users: Record<string, ConnectorRecord[]> = {};
  for (const [ownerId, map] of byUser.entries()) {
    users[ownerId] = Array.from(map.values());
  }
  const payload: PersistedStoreV2 = { version: 2, users };
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
}

async function loadAllUsersStore(): Promise<
  Map<string, Map<string, ConnectorRecord>>
> {
  if (memoryStoreByUser) {
    return memoryStoreByUser;
  }

  const all = new Map<string, Map<string, ConnectorRecord>>();
  const persisted = await readDiskStoreV2();
  if (persisted) {
    for (const [ownerId, records] of Object.entries(persisted.users)) {
      if (!ownerId.trim() || !Array.isArray(records)) continue;
      const userMap = buildUserSeedMap();
      for (const item of records) {
        if (!item || typeof item.id !== "string") continue;
        const existing = userMap.get(item.id);
        userMap.set(item.id, existing ? { ...existing, ...item } : item);
      }
      all.set(ownerId.trim(), userMap);
    }
  }

  memoryStoreByUser = all;
  return all;
}

async function loadUserStoreMap(
  userId: string,
): Promise<Map<string, ConnectorRecord>> {
  const ownerId = normalizeOwnerId(userId);
  const all = await loadAllUsersStore();
  let userMap = all.get(ownerId);
  if (!userMap) {
    userMap = buildUserSeedMap();
    all.set(ownerId, userMap);
  }
  return userMap;
}

async function persistUserStoreMap(
  userId: string,
  userMap: Map<string, ConnectorRecord>,
): Promise<void> {
  const ownerId = normalizeOwnerId(userId);
  const all = await loadAllUsersStore();
  all.set(ownerId, userMap);
  memoryStoreByUser = all;
  try {
    await writeDiskStoreV2(all);
  } catch {
    // Read-only runtimes retain per-user state in memory.
  }
}

function computeCredentialConfigured(record: ConnectorRecord): boolean {
  return Boolean(
    record.accessToken?.trim() ||
      record.refreshToken?.trim() ||
      record.token?.trim() ||
      record.serviceAccountJson?.trim() ||
      (record.accessKey?.trim() && record.secretKey?.trim()),
  );
}

function resolveAuthMode(record: ConnectorRecord): ConnectorAuthMode {
  if (record.id === "google-drive") {
    if (record.refreshToken?.trim() || record.accessToken?.trim()) {
      return "oauth2";
    }
    if (record.serviceAccountJson?.trim()) {
      return "service-account";
    }
    if (record.authMode === "public-csv") {
      return "public-csv";
    }
    return "none";
  }
  if (record.refreshToken?.trim() || record.accessToken?.trim()) {
    return "oauth2";
  }
  if (record.accessKey?.trim() && record.secretKey?.trim()) {
    return "ak-sk";
  }
  if (record.token?.trim()) {
    return record.isCustom ? "webhook-mcp" : "api-token";
  }
  if (record.endpoint?.trim() && record.isCustom) {
    return "webhook-mcp";
  }
  return record.authMode ?? "none";
}

export function sanitizeConnectorRecord(
  record: ConnectorRecord,
): ConnectorRuntime {
  const credentialConfigured = computeCredentialConfigured(record);
  const authMode = resolveAuthMode(record);
  const isGoogleConnector =
    record.id === "google-drive" ||
    record.id === "gmail" ||
    record.id === "google-workspaces" ||
    record.id === "gcp";
  const oauthConfigured = isGoogleConnector
    ? isGoogleOAuthClientConfigured(record)
    : record.id === "github"
      ? Boolean(
          record.clientId?.trim() ||
            readFirstEnv("GITHUB_CLIENT_ID", "OAUTH_GITHUB_CLIENT_ID"),
        )
      : false;
  const writable =
    record.id === "google-drive"
      ? authMode === "oauth2" || authMode === "service-account"
      : credentialConfigured;

  const loc = parseSpreadsheetLocation(record.spreadsheetUrl);

  return {
    id: record.id,
    status: record.status,
    account: record.account,
    authMode,
    credentialConfigured,
    writable,
    oauthConfigured,
    endpoint: record.endpoint,
    spreadsheetUrl: record.spreadsheetUrl,
    spreadsheetId: record.spreadsheetId ?? loc.spreadsheetId,
    gid: record.gid ?? loc.gid,
    sheetTitle: record.sheetTitle,
    lastChecked: record.lastChecked,
    lastSyncedAt: record.lastSyncedAt,
    statusDetail: record.statusDetail,
    isCustom: record.isCustom,
    customMeta: record.customMeta,
  };
}

export async function listConnectorRecords(
  userId: string,
): Promise<ConnectorRecord[]> {
  const map = await loadUserStoreMap(userId);
  return Array.from(map.values());
}

export async function listSanitizedConnectors(
  userId: string,
): Promise<Record<string, ConnectorRuntime>> {
  const records = await listConnectorRecords(userId);
  const out: Record<string, ConnectorRuntime> = {};
  for (const record of records) {
    out[record.id] = sanitizeConnectorRecord(record);
  }
  return out;
}

export async function getConnectorRecord(
  userId: string,
  id: string,
): Promise<ConnectorRecord | null> {
  const map = await loadUserStoreMap(userId);
  return map.get(id) ?? null;
}

export async function upsertConnectorRecord(
  userId: string,
  id: string,
  patch: Partial<ConnectorRecord>,
): Promise<ConnectorRecord> {
  const map = await loadUserStoreMap(userId);
  const existing = map.get(id) ?? {
    id,
    status: "available" as const,
  };
  const nextUrl =
    patch.spreadsheetUrl !== undefined
      ? patch.spreadsheetUrl.trim()
      : existing.spreadsheetUrl;
  const loc = nextUrl ? parseSpreadsheetLocation(nextUrl) : {};
  const updated: ConnectorRecord = {
    ...existing,
    ...patch,
    id,
    ...(nextUrl !== undefined ? { spreadsheetUrl: nextUrl } : {}),
    ...(loc.spreadsheetId
      ? { spreadsheetId: loc.spreadsheetId, gid: loc.gid }
      : {}),
    updatedAt: new Date().toISOString(),
  };
  map.set(id, updated);
  await persistUserStoreMap(userId, map);
  return updated;
}

export async function clearConnectorCredentials(
  userId: string,
  id: string,
): Promise<ConnectorRecord> {
  const map = await loadUserStoreMap(userId);
  const existing = map.get(id) ?? { id, status: "available" as const };
  const cleared: ConnectorRecord = {
    ...existing,
    status: "available",
    account: undefined,
    authMode: "none",
    token: undefined,
    accessKey: undefined,
    secretKey: undefined,
    accessToken: undefined,
    refreshToken: undefined,
    tokenExpiresAt: undefined,
    serviceAccountJson: undefined,
    statusDetail: "已断开连接并清除凭据",
    updatedAt: new Date().toISOString(),
  };
  map.set(id, cleared);
  await persistUserStoreMap(userId, map);
  return cleared;
}

export async function addCustomMcpConnector(
  userId: string,
  input: {
    name: string;
    description?: string;
    endpoint: string;
    token?: string;
  },
): Promise<ConnectorRecord> {
  const slug = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const id = `custom-mcp-${slug || Date.now()}`;
  const map = await loadUserStoreMap(userId);
  const record: ConnectorRecord = {
    id,
    status: input.endpoint.trim() ? "connected" : "available",
    authMode: "webhook-mcp",
    endpoint: input.endpoint.trim(),
    token: input.token?.trim() || undefined,
    account: input.endpoint.trim(),
    isCustom: true,
    customMeta: {
      name: input.name.trim(),
      description:
        input.description?.trim() || "自定义 MCP / Webhook 外部服务连接器。",
      category: "mcp",
      categoryLabel: "自定义 MCP",
      authKinds: ["webhook-mcp", "api-token"],
      preferredAuth: "webhook-mcp",
    },
    updatedAt: new Date().toISOString(),
  };
  map.set(id, record);
  await persistUserStoreMap(userId, map);
  return record;
}

export async function getSanitizedConfigDocument(
  userId: string,
): Promise<ConnectorSanitizedConfigDocument> {
  const ownerId = normalizeOwnerId(userId);
  const records = await listConnectorRecords(ownerId);
  return {
    ownerId,
    storePathConfigured: Boolean(process.env.CONNECTORS_STORE_PATH?.trim()),
    updatedAt: new Date().toISOString(),
    connectors: records.map((record) => {
      const sanitized = sanitizeConnectorRecord(record);
      return {
        id: sanitized.id,
        status: sanitized.status,
        authMode: sanitized.authMode,
        credentialConfigured: sanitized.credentialConfigured,
        oauthConfigured: sanitized.oauthConfigured,
        writable: sanitized.writable,
        account: sanitized.account,
        endpoint: sanitized.endpoint,
        spreadsheetUrl: sanitized.spreadsheetUrl,
        spreadsheetId: sanitized.spreadsheetId,
        gid: sanitized.gid,
        sheetTitle: sanitized.sheetTitle,
        lastChecked: sanitized.lastChecked,
        lastSyncedAt: sanitized.lastSyncedAt,
        isCustom: sanitized.isCustom,
      };
    }),
  };
}
