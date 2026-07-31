import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  applyMfaCookie,
  applySessionCookie,
  clearMfaCookie,
  clearSessionCookie,
  deriveMaxAgeFromExpires,
  MFA_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@lib/authGateway";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

const ACCOUNT_API_BASE = getAccountServiceApiBaseUrl();

type VerifyPayload = {
  token?: string;
  code?: string;
  totp?: string;
};

type AccountVerifyResponse = {
  token?: string;
  expiresAt?: string;
  mfaToken?: string;
  mfaTicket?: string;
  error?: string;
  retryAt?: string;
  user?: Record<string, unknown> | null;
  mfa?: Record<string, unknown> | null;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(0, 6) : "";
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  let payload: VerifyPayload;
  try {
    payload = (await request.json()) as VerifyPayload;
  } catch (error) {
    console.error("Failed to decode MFA verification payload", error);
    return NextResponse.json(
      { success: false, error: "invalid_request", needMfa: true },
      { status: 400 },
    );
  }

  const cookieToken = cookieStore.get(MFA_COOKIE_NAME)?.value ?? "";
  const sessionToken = normalizeString(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
  );
  const token = normalizeString(payload?.token || cookieToken);
  const code = normalizeCode(payload?.code ?? payload?.totp);

  if (!token) {
    return NextResponse.json(
      { success: false, error: "mfa_token_required", needMfa: true },
      { status: 400 },
    );
  }

  if (!code) {
    return NextResponse.json(
      { success: false, error: "mfa_code_required", needMfa: true },
      { status: 400 },
    );
  }

  try {
    // 这条路由服务的是「绑定确认」——用户刚 provision 完一个新密钥、要用第一个
    // 动态码把它确认下来。对应的后端是 /mfa/totp/verify(它接受 `token` 字段,
    // 校验通过后置 MFAEnabled=true 并签发 session)。
    // 不是 /mfa/verify —— 那条是登录期的二次校验, 入参叫 mfa_ticket/mfaToken,
    // 且开头就断言 user.MFAEnabled 必须已经为 true, 对首次绑定必然返回
    // mfa_not_enabled。登录流程的 MFA 走 /api/auth/login 自带的 totp 字段,
    // 不经过这里。
    // /mfa/totp/verify 挂在 authProtected 组下, 走 AuthMiddleware —— 浏览器只有
    // cookie, 所以这里必须把 xc_session 翻成 Authorization 头。这正是 BFF 存在
    // 的理由, 也是当初 Caddy 把本前缀直接转给 Go 服务后 MFA 全废的原因之一。
    const upstreamHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sessionToken) {
      upstreamHeaders.Authorization = `Bearer ${sessionToken}`;
    }

    const response = await fetch(`${ACCOUNT_API_BASE}/mfa/totp/verify`, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify({ token, code }),
      cache: "no-store",
    });

    const data = (await response
      .json()
      .catch(() => ({}))) as AccountVerifyResponse;

    if (
      response.ok &&
      typeof data?.token === "string" &&
      data.token.length > 0
    ) {
      const result = NextResponse.json({
        success: true,
        error: null,
        needMfa: false,
        data,
      });
      applySessionCookie(
        result,
        data.token,
        deriveMaxAgeFromExpires(data?.expiresAt),
        request.headers.get("host") ?? undefined,
      );
      clearMfaCookie(result);
      return result;
    }

    const errorCode =
      typeof data?.error === "string" ? data.error : "mfa_verification_failed";
    const result = NextResponse.json(
      { success: false, error: errorCode, needMfa: true, data },
      { status: response.status || 400 },
    );

    const nextToken =
      typeof data?.mfaToken === "string" && data.mfaToken.trim()
        ? data.mfaToken
        : typeof data?.mfaTicket === "string" && data.mfaTicket.trim()
          ? data.mfaTicket
          : "";

    if (nextToken) {
      applyMfaCookie(result, nextToken);
    } else {
      applyMfaCookie(result, token);
    }

    clearSessionCookie(result, request.headers.get("host") ?? undefined);
    return result;
  } catch (error) {
    console.error("Account service MFA verification proxy failed", error);
    const result = NextResponse.json(
      { success: false, error: "account_service_unreachable", needMfa: true },
      { status: 502 },
    );
    applyMfaCookie(result, token);
    clearSessionCookie(result, request.headers.get("host") ?? undefined);
    return result;
  }
}

export function GET() {
  return NextResponse.json(
    { success: false, error: "method_not_allowed", needMfa: true },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}
