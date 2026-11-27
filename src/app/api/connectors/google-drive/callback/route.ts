import { NextRequest, NextResponse } from "next/server";

import { getAccountSession } from "@server/account/session";
import {
  exchangeGoogleOAuthCode,
  fetchGoogleUserEmail,
  OAUTH_TX_COOKIE_NAME,
  resolveGoogleOAuthConfig,
  verifyOAuthStateCookie,
} from "@server/connectors/googleDrive";
import {
  getConnectorRecord,
  upsertConnectorRecord,
} from "@server/connectors/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function renderPopupCompletionHtml(payload: {
  type: "connector-oauth-complete";
  connectorId: string;
  ok: boolean;
  account?: string;
  error?: string;
}): NextResponse {
  const safeJson = JSON.stringify(payload).replaceAll("<", "\\u003c");
  const titleText = payload.ok ? "Google OAuth2 授权成功" : "Google OAuth2 授权未完成";
  const bodyText = payload.ok
    ? `已绑定账号 ${payload.account ?? ""}，正在返回控制台…`
    : payload.error || "授权未能完成，请关闭此窗口后重试。";

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${titleText}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8fafc; color: #0f172a; }
    .card { max-width: 380px; width: calc(100% - 32px); background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; text-align: center; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
    h1 { font-size: 18px; margin: 0 0 8px; }
    p { font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 18px; word-break: break-word; }
    button { border: 0; border-radius: 10px; padding: 9px 18px; font-size: 13px; font-weight: 600; background: #0f172a; color: #fff; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${titleText}</h1>
    <p>${bodyText.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>
    <button type="button" onclick="window.close()">关闭窗口</button>
  </div>
  <script>
    (function () {
      var data = ${safeJson};
      try {
        if (typeof BroadcastChannel !== "undefined") {
          var ch = new BroadcastChannel("connector-oauth");
          ch.postMessage(data);
          ch.close();
        }
      } catch (e) {}
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(data, window.location.origin);
        }
      } catch (e) {}
      setTimeout(function () { window.close(); }, ${payload.ok ? 300 : 1200});
    })();
  </script>
</body>
</html>`;

  const response = new NextResponse(html, {
    status: payload.ok ? 200 : 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
  response.cookies.delete(OAUTH_TX_COOKIE_NAME);
  return response;
}

function buildRedirectResponse(
  request: NextRequest,
  path: string,
  params: Record<string, string>,
): NextResponse {
  const target = new URL(path, request.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) {
    target.searchParams.set(k, v);
  }
  const response = NextResponse.redirect(target);
  response.cookies.delete(OAUTH_TX_COOKIE_NAME);
  return response;
}

export async function GET(request: NextRequest) {
  const tx = verifyOAuthStateCookie(
    request.cookies.get(OAUTH_TX_COOKIE_NAME)?.value,
  );
  const safePath = tx?.returnTo || "/panel/connector";
  const connectorId = tx?.connectorId || "google-drive";
  const isPopup = !tx || tx.mode === "popup";

  const finishError = (message: string) => {
    if (isPopup) {
      return renderPopupCompletionHtml({
        type: "connector-oauth-complete",
        connectorId,
        ok: false,
        error: message,
      });
    }
    return buildRedirectResponse(request, safePath, {
      connectorError: message,
    });
  };

  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    return finishError(`Google 授权已取消或失败 (${oauthError})`);
  }

  const state = request.nextUrl.searchParams.get("state");
  if (!tx || !state || state !== tx.state) {
    return finishError("Google OAuth2 状态校验失败或已过期，请重新发起授权。");
  }

  const session = await getAccountSession(request);
  const activeUserId = session.user
    ? session.user.uuid || session.user.id
    : "";
  if (!activeUserId || activeUserId !== tx.userId) {
    return finishError("当前登录会话与发起授权的账号不一致，请重新登录后授权。");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return finishError("Google OAuth2 回调缺少授权码。");
  }

  const record = await getConnectorRecord(tx.userId, connectorId);
  const oauthConfig = resolveGoogleOAuthConfig(record, request.nextUrl.origin);
  if (!oauthConfig) {
    return finishError("服务端缺少 Google OAuth2 Client 配置。");
  }

  try {
    const tokens = await exchangeGoogleOAuthCode(oauthConfig, code);
    const accountEmail = await fetchGoogleUserEmail(tokens.accessToken);
    const resolvedAccount = accountEmail || record?.account || "Google OAuth2";
    await upsertConnectorRecord(tx.userId, connectorId, {
      status: "connected",
      authMode: "oauth2",
      account: resolvedAccount,
      accessToken: tokens.accessToken,
      ...(tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
      tokenExpiresAt: tokens.expiresAt,
      lastChecked: new Date().toISOString(),
      statusDetail: "Google OAuth2 已授权，支持 Google Sheets 双向读写同步。",
    });

    if (tx.mode === "popup") {
      return renderPopupCompletionHtml({
        type: "connector-oauth-complete",
        connectorId,
        ok: true,
        account: resolvedAccount,
      });
    }

    return buildRedirectResponse(request, safePath, {
      connected: connectorId,
    });
  } catch (error) {
    return finishError(
      error instanceof Error ? error.message : "Google OAuth2 授权交换失败。",
    );
  }
}
