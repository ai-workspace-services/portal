import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getAccountSession } from "@server/account/session";
import {
  buildGoogleOAuthAuthorizeUrl,
  OAUTH_TX_COOKIE_NAME,
  readGoogleSheet,
  resolveGoogleOAuthConfig,
  signOAuthStateCookie,
} from "@server/connectors/googleDrive";
import {
  clearConnectorCredentials,
  getConnectorRecord,
  sanitizeConnectorRecord,
  upsertConnectorRecord,
} from "@server/connectors/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; action: string }> };

function safeReturnTo(raw?: string): string {
  const trimmed = raw?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/panel/connector";
  }
  return trimmed;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getAccountSession(request);
  if (!session.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const userId = session.user.uuid || session.user.id;
  const { id, action } = await context.params;
  if (!["save", "authorize", "check", "disconnect"].includes(action)) {
    return NextResponse.json({ message: "不支持的操作类型。" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    authType?: string;
    endpoint?: string;
    token?: string;
    accessKey?: string;
    secretKey?: string;
    clientId?: string;
    clientSecret?: string;
    serviceAccountJson?: string;
    spreadsheetUrl?: string;
    returnTo?: string;
    mode?: "popup" | "redirect";
  };

  if (action === "disconnect") {
    const cleared = await clearConnectorCredentials(userId, id);
    return NextResponse.json({
      ...sanitizeConnectorRecord(cleared),
      message: "已断开当前账号的连接并清除凭据。",
    });
  }

  if (action === "save") {
    const existing = await getConnectorRecord(userId, id);
    const nextPatch: Parameters<typeof upsertConnectorRecord>[2] = {
      status: "connected",
    };

    if (body.endpoint !== undefined) nextPatch.endpoint = body.endpoint.trim();
    if (body.token) nextPatch.token = body.token.trim();
    if (body.accessKey) nextPatch.accessKey = body.accessKey.trim();
    if (body.secretKey) nextPatch.secretKey = body.secretKey.trim();
    if (body.clientId !== undefined && body.clientId.trim()) {
      nextPatch.clientId = body.clientId.trim();
    }
    if (body.clientSecret !== undefined && body.clientSecret.trim()) {
      nextPatch.clientSecret = body.clientSecret.trim();
    }
    if (body.serviceAccountJson?.trim()) {
      nextPatch.serviceAccountJson = body.serviceAccountJson.trim();
      nextPatch.authMode = "service-account";
    }
    if (body.spreadsheetUrl !== undefined && body.spreadsheetUrl.trim()) {
      nextPatch.spreadsheetUrl = body.spreadsheetUrl.trim();
    }
    if (
      id === "google-drive" &&
      !body.serviceAccountJson?.trim() &&
      !existing?.accessToken &&
      !existing?.refreshToken &&
      !existing?.serviceAccountJson
    ) {
      nextPatch.status = "available";
      nextPatch.statusDetail = "已保存配置，请继续完成 Google OAuth2 授权。";
    } else if (body.authType === "api-token") {
      nextPatch.authMode = "api-token";
    } else if (body.authType === "ak-sk") {
      nextPatch.authMode = "ak-sk";
    } else if (body.authType === "webhook-mcp") {
      nextPatch.authMode = "webhook-mcp";
    }

    const updated = await upsertConnectorRecord(userId, id, nextPatch);
    return NextResponse.json({
      ...sanitizeConnectorRecord(updated),
      message:
        id === "google-drive" && nextPatch.status !== "connected"
          ? "已保存表格与 OAuth2 配置。"
          : "当前账号的连接器设置已保存。",
    });
  }

  if (action === "authorize") {
    if (
      id === "google-drive" ||
      id === "gmail" ||
      id === "google-workspaces" ||
      id === "gcp"
    ) {
      const record = await getConnectorRecord(userId, id);
      const origin = request.nextUrl.origin;
      const oauthConfig = resolveGoogleOAuthConfig(record, origin);
      if (!oauthConfig) {
        return NextResponse.json(
          {
            message:
              "未检测到 Google OAuth2 Client ID / Secret。请在服务端配置 GOOGLE_CLIENT_ID 与 GOOGLE_CLIENT_SECRET，或在此抽屉填写后重试。",
          },
          { status: 400 },
        );
      }

      if (body.spreadsheetUrl?.trim()) {
        await upsertConnectorRecord(userId, id, {
          spreadsheetUrl: body.spreadsheetUrl.trim(),
        });
      }

      const mode = body.mode === "redirect" ? "redirect" : "popup";
      const returnTo = safeReturnTo(body.returnTo);
      const state = crypto.randomBytes(24).toString("hex");
      const authorizationUrl = buildGoogleOAuthAuthorizeUrl(oauthConfig, state);
      const signedTx = signOAuthStateCookie({
        state,
        userId,
        connectorId: id,
        returnTo,
        mode,
        issuedAt: Date.now(),
      });
      const secureCookie = origin.startsWith("https://");

      const response = NextResponse.json({ authorizationUrl, mode });
      response.cookies.set(OAUTH_TX_COOKIE_NAME, signedTx, {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookie,
        path: "/",
        maxAge: 900,
      });
      return response;
    }

    return NextResponse.json(
      {
        message: `${id} 暂未配置在线 OAuth 应用，请切换为 API Token。`,
      },
      { status: 400 },
    );
  }

  // action === "check"
  const now = new Date().toISOString();
  if (id === "google-drive") {
    try {
      const sheet = await readGoogleSheet({
        userId,
        origin: request.nextUrl.origin,
        spreadsheetUrl: body.spreadsheetUrl,
      });
      const status = sheet.writable ? "connected" : "attention";
      const statusDetail = sheet.writable
        ? `Google OAuth2 / API 已就绪，可双向读写「${sheet.sheetTitle}」（共 ${sheet.rows.length} 行）`
        : `只读链接可拉取「${sheet.sheetTitle}」（${sheet.rows.length} 行），写回需完成 Google OAuth2 授权`;
      const updated = await upsertConnectorRecord(userId, id, {
        status,
        authMode: sheet.authMode,
        spreadsheetUrl: sheet.spreadsheetUrl,
        spreadsheetId: sheet.spreadsheetId,
        gid: sheet.gid,
        sheetTitle: sheet.sheetTitle,
        lastChecked: now,
        statusDetail,
      });
      return NextResponse.json({
        ...sanitizeConnectorRecord(updated),
        message: statusDetail,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Google Sheet 连通性检测失败。";
      const updated = await upsertConnectorRecord(userId, id, {
        status: "attention",
        lastChecked: now,
        statusDetail: message,
      });
      return NextResponse.json(
        { ...sanitizeConnectorRecord(updated), message },
        { status: 502 },
      );
    }
  }

  if (id === "vault") {
    const record = await getConnectorRecord(userId, id);
    const endpoint =
      body.endpoint?.trim() ||
      record?.endpoint?.trim() ||
      process.env.VAULT_SERVER_URL?.trim() ||
      process.env.VAULT_ADDR?.trim();
    const vaultToken = body.token?.trim() || record?.token?.trim();
    if (!endpoint) {
      return NextResponse.json(
        { message: "未配置 Vault Server 地址。" },
        { status: 400 },
      );
    }
    try {
      const probe = await fetch(`${endpoint.replace(/\/+$/, "")}/v1/sys/health`, {
        headers: vaultToken ? { "X-Vault-Token": vaultToken } : undefined,
        cache: "no-store",
      });
      const updated = await upsertConnectorRecord(userId, id, {
        status: probe.ok ? "connected" : "attention",
        endpoint,
        lastChecked: now,
        statusDetail: probe.ok
          ? `Vault 健康检查通过 (HTTP ${probe.status})`
          : `Vault 返回 HTTP ${probe.status}`,
      });
      return NextResponse.json({
        ...sanitizeConnectorRecord(updated),
        message: updated.statusDetail,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Vault 连通性检测失败。";
      return NextResponse.json({ message }, { status: 502 });
    }
  }

  const record = await getConnectorRecord(userId, id);
  const sanitized = record ? sanitizeConnectorRecord(record) : null;
  if (sanitized?.endpoint && id.startsWith("custom-mcp-")) {
    try {
      const probe = await fetch(sanitized.endpoint, {
        method: "GET",
        headers: record?.token
          ? { Authorization: `Bearer ${record.token}` }
          : undefined,
        cache: "no-store",
      });
      const updated = await upsertConnectorRecord(userId, id, {
        status: probe.ok ? "connected" : "attention",
        lastChecked: now,
        statusDetail: `MCP 端点响应 HTTP ${probe.status}`,
      });
      return NextResponse.json({
        ...sanitizeConnectorRecord(updated),
        message: updated.statusDetail,
      });
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error ? error.message : "MCP 端点连接失败。",
        },
        { status: 502 },
      );
    }
  }

  const configured = Boolean(sanitized?.credentialConfigured);
  const updated = await upsertConnectorRecord(userId, id, {
    status: configured ? "connected" : "attention",
    lastChecked: now,
    statusDetail: configured
      ? "当前账号凭据已配置，状态正常。"
      : "当前账号尚未配置连接凭据或 OAuth 授权。",
  });
  return NextResponse.json({
    ...sanitizeConnectorRecord(updated),
    message: updated.statusDetail,
  });
}
