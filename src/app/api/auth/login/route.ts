import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  applyMfaCookie,
  applySessionCookie,
  clearMfaCookie,
  clearSessionCookie,
  deriveMaxAgeFromExpires,
  MFA_COOKIE_NAME,
} from "@lib/authGateway";
import {
  getAccountServiceApiBaseUrl,
  isSelfReferentialServiceTarget,
} from "@server/serviceConfig";

const ACCOUNT_API_BASE = getAccountServiceApiBaseUrl();

type LoginPayload = {
  identifier?: string;
  email?: string;
  password?: string;
  remember?: boolean;
  totp?: string;
  totpCode?: string;
  code?: string;
  token?: string;
};

type AccountLoginResponse = {
  token?: string;
  expiresAt?: string;
  error?: string;
  mfaToken?: string;
  mfaTicket?: string;
  needMfa?: boolean;
  mfaRequired?: boolean;
  mfaEnabled?: boolean;
};

function normalizeIdentifier(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(0, 6) : "";
}

export async function POST(request: NextRequest) {
  let payload: LoginPayload;
  try {
    payload = (await request.json()) as LoginPayload;
  } catch (error) {
    console.error("Failed to decode login payload", error);
    return NextResponse.json(
      { success: false, error: "invalid_request", needMfa: false },
      { status: 400 },
    );
  }

  const identifier = normalizeIdentifier(payload?.identifier ?? payload?.email);
  const password =
    typeof payload?.password === "string" ? payload.password : "";
  const totpCode = normalizeCode(
    payload?.totpCode ?? payload?.totp ?? payload?.code,
  );
  const remember = Boolean(payload?.remember);

  if (!identifier || !password) {
    return NextResponse.json(
      { success: false, error: "missing_credentials", needMfa: false },
      { status: 400 },
    );
  }

  const requestHost = request.headers.get("host");
  const accountApiBase = getAccountServiceApiBaseUrl(requestHost);

  if (
    isSelfReferentialServiceTarget(
      accountApiBase,
      requestHost,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "account_service_misconfigured",
        needMfa: false,
      },
      { status: 502 },
    );
  }

  try {
    const loginBody: Record<string, string> = { identifier, password };
    if (totpCode) {
      loginBody.totpCode = totpCode;
    }

    const response = await fetch(`${accountApiBase}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginBody),
      cache: "no-store",
    });

    const data = (await response
      .json()
      .catch(() => ({}))) as AccountLoginResponse;

    if (
      response.ok &&
      typeof data?.token === "string" &&
      data.token.length > 0
    ) {
      const maxAgeFromBackend = deriveMaxAgeFromExpires(data?.expiresAt);
      const effectiveMaxAge = remember
        ? Math.max(maxAgeFromBackend, 60 * 60 * 24 * 30)
        : maxAgeFromBackend;
      const result = NextResponse.json({
        success: true,
        error: null,
        needMfa: false,
      });
      applySessionCookie(
        result,
        data.token,
        effectiveMaxAge,
        request.headers.get("host") ?? undefined,
      );
      clearMfaCookie(result);
      return result;
    }

    const errorCode =
      typeof data?.error === "string"
        ? data.error
        : data?.mfaRequired
          ? "mfa_required"
          : "authentication_failed";
    const needsMfa = Boolean(
      data?.needMfa ||
      data?.mfaRequired ||
      errorCode === "mfa_required" ||
      errorCode === "mfa_setup_required",
    );
    const mfaToken =
      typeof data?.mfaToken === "string" && data.mfaToken.trim().length > 0
        ? data.mfaToken
        : typeof data?.mfaTicket === "string" && data.mfaTicket.trim().length > 0
          ? data.mfaTicket
          : undefined;

    if (
      (response.status === 401 || response.status === 403 || response.ok || needsMfa) &&
      typeof mfaToken === "string"
    ) {
      const result = NextResponse.json(
        { success: false, error: errorCode, needMfa: true },
        { status: 401 },
      );
      applyMfaCookie(result, mfaToken);
      clearSessionCookie(result, request.headers.get("host") ?? undefined);
      return result;
    }

    const statusCode = response.status || 401;
    const result = NextResponse.json(
      { success: false, error: errorCode, needMfa: false },
      { status: statusCode },
    );
    clearSessionCookie(result, request.headers.get("host") ?? undefined);
    clearMfaCookie(result);
    return result;
  } catch (error) {
    console.error("Account service login proxy failed", error);
    const result = NextResponse.json(
      { success: false, error: "account_service_unreachable", needMfa: false },
      { status: 502 },
    );
    clearSessionCookie(result, request.headers.get("host") ?? undefined);
    clearMfaCookie(result);
    return result;
  }
}

export function GET() {
  return NextResponse.json(
    { success: false, error: "method_not_allowed", needMfa: false },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}

export async function DELETE() {
  const cookieStore = await cookies();
  const response = NextResponse.json({
    success: true,
    error: null,
    needMfa: false,
  });
  if (cookieStore.has(MFA_COOKIE_NAME)) {
    clearMfaCookie(response);
  }
  clearSessionCookie(response);
  return response;
}
