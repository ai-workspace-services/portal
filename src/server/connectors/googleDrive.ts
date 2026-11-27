import crypto from "node:crypto";

import {
  DEFAULT_GOOGLE_SHEET_URL,
  getConnectorRecord,
  parseSpreadsheetLocation,
  upsertConnectorRecord,
} from "./store";
import type { ConnectorRecord } from "./types";

const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT =
  "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export const OAUTH_TX_COOKIE_NAME = "google_drive_oauth_tx";

export const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export type GoogleOAuthClientConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleOAuthTxPayload = {
  state: string;
  userId: string;
  connectorId: string;
  returnTo: string;
  mode: "popup" | "redirect";
  issuedAt: number;
};

type GoogleServiceAccountCredentials = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

function resolveOAuthCookieSecret(): string {
  return (
    process.env.INTERNAL_SERVICE_TOKEN?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim() ||
    "portal-connector-oauth-state-key"
  );
}

export function signOAuthStateCookie(payload: GoogleOAuthTxPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const sig = crypto
    .createHmac("sha256", resolveOAuthCookieSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyOAuthStateCookie(
  rawCookie?: string,
  maxAgeMs = 15 * 60_000,
): GoogleOAuthTxPayload | null {
  if (!rawCookie) return null;
  const dotIdx = rawCookie.indexOf(".");
  if (dotIdx <= 0) return null;
  const encoded = rawCookie.slice(0, dotIdx);
  const providedSig = rawCookie.slice(dotIdx + 1);
  if (!encoded || !providedSig) return null;

  const expectedSig = crypto
    .createHmac("sha256", resolveOAuthCookieSecret())
    .update(encoded)
    .digest("base64url");

  const providedBuf = Buffer.from(providedSig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<GoogleOAuthTxPayload>;
    if (
      !parsed.state ||
      !parsed.userId ||
      !parsed.connectorId ||
      !parsed.returnTo ||
      (parsed.mode !== "popup" && parsed.mode !== "redirect") ||
      typeof parsed.issuedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.issuedAt > maxAgeMs) {
      return null;
    }
    return parsed as GoogleOAuthTxPayload;
  } catch {
    return null;
  }
}

export function resolveGoogleOAuthConfig(
  record: ConnectorRecord | null,
  origin: string,
): GoogleOAuthClientConfig | null {
  const clientId =
    record?.clientId?.trim() ||
    process.env.GOOGLE_DRIVE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.OAUTH_GOOGLE_CLIENT_ID?.trim();
  const clientSecret =
    record?.clientSecret?.trim() ||
    process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.OAUTH_GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }

  const normalizedOrigin = origin.replace(/\/+$/, "");
  const redirectUri =
    process.env.GOOGLE_DRIVE_REDIRECT_URI?.trim() ||
    `${normalizedOrigin}/api/connectors/google-drive/callback`;

  return { clientId, clientSecret, redirectUri };
}

export function buildGoogleOAuthAuthorizeUrl(
  config: GoogleOAuthClientConfig,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_DRIVE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${GOOGLE_OAUTH_AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

export async function exchangeGoogleOAuthCode(
  config: GoogleOAuthClientConfig,
  code: string,
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}> {
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Google OAuth token exchange failed (${response.status})`,
    );
  }
  const expiresIn =
    typeof payload.expires_in === "number" ? payload.expires_in : 3600;
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

export async function refreshGoogleOAuthToken(
  config: GoogleOAuthClientConfig,
  refreshToken: string,
): Promise<{
  accessToken: string;
  expiresAt: number;
}> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
  });
  const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Google OAuth refresh failed (${response.status})`,
    );
  }
  const expiresIn =
    typeof payload.expires_in === "number" ? payload.expires_in : 3600;
  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

export async function fetchGoogleUserEmail(
  accessToken: string,
): Promise<string | undefined> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return undefined;
  const payload = (await response.json().catch(() => ({}))) as {
    email?: string;
  };
  return payload.email?.trim() || undefined;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function parseServiceAccountJson(
  raw: string,
): GoogleServiceAccountCredentials | null {
  try {
    const parsed = JSON.parse(raw) as Partial<GoogleServiceAccountCredentials>;
    if (parsed.client_email && parsed.private_key) {
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
        token_uri: parsed.token_uri || GOOGLE_OAUTH_TOKEN_ENDPOINT,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function exchangeServiceAccountToken(
  rawJson: string,
): Promise<{ accessToken: string; clientEmail: string }> {
  const creds = parseServiceAccountJson(rawJson);
  if (!creds) {
    throw new Error("无效的 Google Service Account JSON 凭据。");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64UrlEncode(
    JSON.stringify({
      iss: creds.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly",
      aud: creds.token_uri || GOOGLE_OAUTH_TOKEN_ENDPOINT,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = base64UrlEncode(signer.sign(creds.private_key));
  const assertion = `${signingInput}.${signature}`;

  const response = await fetch(creds.token_uri || GOOGLE_OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Service Account 鉴权失败 (${response.status})`,
    );
  }
  return {
    accessToken: payload.access_token,
    clientEmail: creds.client_email,
  };
}

export async function resolveGoogleAccessContext(
  userId: string,
  origin: string,
): Promise<{
  record: ConnectorRecord;
  accessToken: string | null;
  authMode: "oauth2" | "service-account" | "public-csv";
  writable: boolean;
}> {
  const record = (await getConnectorRecord(userId, "google-drive")) ?? {
    id: "google-drive",
    status: "available" as const,
    spreadsheetUrl: DEFAULT_GOOGLE_SHEET_URL,
  };

  if (record.accessToken || record.refreshToken) {
    const expiredOrMissing =
      !record.accessToken ||
      (typeof record.tokenExpiresAt === "number" &&
        record.tokenExpiresAt < Date.now() + 60_000);
    if (!expiredOrMissing && record.accessToken) {
      return {
        record,
        accessToken: record.accessToken,
        authMode: "oauth2",
        writable: true,
      };
    }
    const oauthConfig = resolveGoogleOAuthConfig(record, origin);
    if (oauthConfig && record.refreshToken) {
      try {
        const refreshed = await refreshGoogleOAuthToken(
          oauthConfig,
          record.refreshToken,
        );
        const updated = await upsertConnectorRecord(userId, "google-drive", {
          accessToken: refreshed.accessToken,
          tokenExpiresAt: refreshed.expiresAt,
          status: "connected",
          authMode: "oauth2",
        });
        return {
          record: updated,
          accessToken: refreshed.accessToken,
          authMode: "oauth2",
          writable: true,
        };
      } catch {
        // Fall through to service account or public CSV if refresh fails.
      }
    }
  }

  const saJson = record.serviceAccountJson?.trim();
  if (saJson) {
    const saToken = await exchangeServiceAccountToken(saJson);
    return {
      record,
      accessToken: saToken.accessToken,
      authMode: "service-account",
      writable: true,
    };
  }

  return {
    record,
    accessToken: null,
    authMode: "public-csv",
    writable: false,
  };
}

export function parseCsvMatrix(csvText: string): string[][] {
  const input = csvText.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r") {
      if (input[i + 1] === "\n") {
        i++;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((value) => value.trim().length > 0));
}

export function serializeCsvMatrix(matrix: string[][]): string {
  return matrix
    .map((row) =>
      row
        .map((value) => {
          const text = value ?? "";
          if (
            text.includes(",") ||
            text.includes('"') ||
            text.includes("\n") ||
            text.includes("\r")
          ) {
            return `"${text.replaceAll('"', '""')}"`;
          }
          return text;
        })
        .join(","),
    )
    .join("\n");
}

function escapeSheetTitleForA1(title: string): string {
  return `'${title.replaceAll("'", "''")}'`;
}

export async function fetchGoogleSheetMetadata(params: {
  spreadsheetId: string;
  gid: string;
  accessToken: string;
}): Promise<{
  documentTitle?: string;
  sheetTitle: string;
  sheetId: number;
}> {
  const url = `${GOOGLE_SHEETS_API_BASE}/${encodeURIComponent(params.spreadsheetId)}?fields=properties.title,sheets(properties(sheetId,title))`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    properties?: { title?: string };
    sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        `无法读取 Google Sheet 元数据 (HTTP ${response.status})`,
    );
  }

  const numericGid = Number(params.gid);
  const matched =
    payload.sheets?.find((s) => s.properties?.sheetId === numericGid) ??
    payload.sheets?.[0];
  const sheetTitle = matched?.properties?.title?.trim() || "Sheet1";
  const sheetId = matched?.properties?.sheetId ?? 0;

  return {
    documentTitle: payload.properties?.title?.trim(),
    sheetTitle,
    sheetId,
  };
}

export type GoogleSheetReadResult = {
  spreadsheetUrl: string;
  spreadsheetId: string;
  gid: string;
  sheetTitle: string;
  documentTitle?: string;
  headers: string[];
  rows: string[][];
  authMode: "oauth2" | "service-account" | "public-csv";
  writable: boolean;
  account?: string;
};

export async function readGoogleSheet(params: {
  userId: string;
  origin: string;
  spreadsheetUrl?: string;
}): Promise<GoogleSheetReadResult> {
  const context = await resolveGoogleAccessContext(
    params.userId,
    params.origin,
  );
  const targetUrl =
    params.spreadsheetUrl?.trim() ||
    context.record.spreadsheetUrl?.trim() ||
    DEFAULT_GOOGLE_SHEET_URL;
  const loc = parseSpreadsheetLocation(targetUrl);
  if (!loc.spreadsheetId) {
    throw new Error("无法从链接解析 Google Spreadsheet ID。");
  }
  const gid = loc.gid || "0";

  if (context.accessToken) {
    const meta = await fetchGoogleSheetMetadata({
      spreadsheetId: loc.spreadsheetId,
      gid,
      accessToken: context.accessToken,
    });
    const range = `${escapeSheetTitleForA1(meta.sheetTitle)}!A:Z`;
    const valuesUrl = `${GOOGLE_SHEETS_API_BASE}/${encodeURIComponent(loc.spreadsheetId)}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;
    const response = await fetch(valuesUrl, {
      headers: { Authorization: `Bearer ${context.accessToken}` },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      values?: string[][];
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(
        payload.error?.message ||
          `Google Sheets API 读取失败 (HTTP ${response.status})`,
      );
    }
    const matrix = payload.values ?? [];
    const headers = matrix[0] ?? [];
    const rows = matrix.slice(1);
    return {
      spreadsheetUrl: targetUrl,
      spreadsheetId: loc.spreadsheetId,
      gid,
      sheetTitle: meta.sheetTitle,
      documentTitle: meta.documentTitle,
      headers,
      rows,
      authMode: context.authMode,
      writable: context.writable,
      account: context.record.account,
    };
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(loc.spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;
  const response = await fetch(csvUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `无法访问 Google Sheet（HTTP ${response.status}）。请先在 /panel/connector 完成 Google OAuth2 授权。`,
    );
  }
  const text = await response.text();
  if (
    text.trimStart().startsWith("<!DOCTYPE html") ||
    text.includes("accounts.google.com/ServiceLogin")
  ) {
    throw new Error(
      "目标表格需要 Google 登录权限。请先在 /panel/connector 授权 Google OAuth2。",
    );
  }
  const matrix = parseCsvMatrix(text);
  const headers = matrix[0] ?? [];
  const rows = matrix.slice(1);
  return {
    spreadsheetUrl: targetUrl,
    spreadsheetId: loc.spreadsheetId,
    gid,
    sheetTitle: `gid:${gid}`,
    headers,
    rows,
    authMode: "public-csv",
    writable: false,
    account: context.record.account,
  };
}

export async function writeGoogleSheet(params: {
  userId: string;
  origin: string;
  spreadsheetUrl?: string;
  matrix: string[][];
}): Promise<{
  spreadsheetId: string;
  gid: string;
  sheetTitle: string;
  updatedRows: number;
  authMode: "oauth2" | "service-account";
}> {
  const context = await resolveGoogleAccessContext(
    params.userId,
    params.origin,
  );
  if (!context.accessToken || context.authMode === "public-csv") {
    throw new Error(
      "当前账号的 Google Drive 处于只读链接模式，无法写回表格。请先完成 Google OAuth2 授权。",
    );
  }

  const targetUrl =
    params.spreadsheetUrl?.trim() ||
    context.record.spreadsheetUrl?.trim() ||
    DEFAULT_GOOGLE_SHEET_URL;
  const loc = parseSpreadsheetLocation(targetUrl);
  if (!loc.spreadsheetId) {
    throw new Error("无法从链接解析 Google Spreadsheet ID。");
  }
  const gid = loc.gid || "0";

  const meta = await fetchGoogleSheetMetadata({
    spreadsheetId: loc.spreadsheetId,
    gid,
    accessToken: context.accessToken,
  });

  const range = `${escapeSheetTitleForA1(meta.sheetTitle)}!A1`;
  const updateUrl = `${GOOGLE_SHEETS_API_BASE}/${encodeURIComponent(loc.spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const response = await fetch(updateUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${context.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      range,
      majorDimension: "ROWS",
      values: params.matrix,
    }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    updatedRows?: number;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        `写入 Google Sheet 失败 (HTTP ${response.status})`,
    );
  }

  return {
    spreadsheetId: loc.spreadsheetId,
    gid,
    sheetTitle: meta.sheetTitle,
    updatedRows: payload.updatedRows ?? params.matrix.length,
    authMode: context.authMode,
  };
}
