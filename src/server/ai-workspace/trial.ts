import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

export const AI_WORKSPACE_TRIAL_COOKIE = "xworkmate_trial";
export const AI_WORKSPACE_TRIAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export type AiWorkspaceTrialState = {
  id: string;
  issuedAt: number;
  used: number;
  limit: number;
  remaining: number;
};

type StoredTrialState = Pick<AiWorkspaceTrialState, "id" | "issuedAt" | "used"> & {
  version: 1;
};

type IpUsage = {
  used: number;
  expiresAt: number;
};

// This is a local single-process guard for the first slice. Production should
// move this map to the shared entitlement/rate-limit service described in the
// implementation plan so multiple instances share the same IP bucket.
const ipUsage = new Map<string, IpUsage>();

function trialLimit(): number {
  const configured = Number.parseInt(
    process.env.AI_WORKSPACE_TRIAL_TASK_LIMIT ?? "5",
    10,
  );
  if (!Number.isFinite(configured)) {
    return 5;
  }
  return Math.min(5, Math.max(3, configured));
}

function trialSecret(): string {
  // Configure AI_WORKSPACE_TRIAL_SECRET in every deployed environment. The
  // bridge token fallback keeps local development usable without another env.
  return (
    process.env.AI_WORKSPACE_TRIAL_SECRET?.trim() ||
    process.env.BRIDGE_AUTH_TOKEN?.trim() ||
    "local-development-trial-secret"
  );
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function sign(payload: string): string {
  return createHmac("sha256", trialSecret()).update(payload).digest("base64url");
}

function serializeState(state: StoredTrialState): string {
  const payload = encode(JSON.stringify(state));
  return `${payload}.${sign(payload)}`;
}

function parseState(value: string | undefined): StoredTrialState | null {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  const decoded = decode(payload);
  if (!decoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decoded) as Partial<StoredTrialState>;
    if (
      parsed.version !== 1 ||
      typeof parsed.id !== "string" ||
      parsed.id.length < 8 ||
      typeof parsed.issuedAt !== "number" ||
      !Number.isFinite(parsed.issuedAt) ||
      typeof parsed.used !== "number" ||
      !Number.isInteger(parsed.used) ||
      parsed.used < 0 ||
      parsed.used > trialLimit()
    ) {
      return null;
    }

    return {
      version: 1,
      id: parsed.id,
      issuedAt: parsed.issuedAt,
      used: parsed.used,
    };
  } catch {
    return null;
  }
}

function createState(): StoredTrialState {
  return {
    version: 1,
    id: randomUUID(),
    issuedAt: Date.now(),
    used: 0,
  };
}

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const candidate =
    forwarded?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim();
  return candidate || null;
}

function ipUsed(request: NextRequest): number {
  const ip = clientIp(request);
  if (!ip) {
    return 0;
  }
  const usage = ipUsage.get(ip);
  if (!usage || usage.expiresAt <= Date.now()) {
    ipUsage.delete(ip);
    return 0;
  }
  return usage.used;
}

function recordIpUsage(request: NextRequest, used: number): void {
  const ip = clientIp(request);
  if (!ip) {
    return;
  }
  ipUsage.set(ip, {
    used,
    expiresAt: Date.now() + AI_WORKSPACE_TRIAL_COOKIE_MAX_AGE * 1000,
  });
}

function toPublicState(state: StoredTrialState): AiWorkspaceTrialState {
  const limit = trialLimit();
  return {
    id: state.id,
    issuedAt: state.issuedAt,
    used: state.used,
    limit,
    remaining: Math.max(0, limit - state.used),
  };
}

export function getTrialState(request: NextRequest): {
  state: AiWorkspaceTrialState;
  cookieValue: string;
} {
  const existing = parseState(
    request.cookies.get(AI_WORKSPACE_TRIAL_COOKIE)?.value,
  );
  const state = existing ?? createState();
  const used = Math.max(state.used, ipUsed(request));
  const effectiveState = { ...state, used };

  return {
    state: toPublicState(effectiveState),
    cookieValue: serializeState(effectiveState),
  };
}

export function consumeTrialTask(request: NextRequest): {
  allowed: boolean;
  state: AiWorkspaceTrialState;
  cookieValue: string;
} {
  const existing = parseState(
    request.cookies.get(AI_WORKSPACE_TRIAL_COOKIE)?.value,
  );
  const current = existing ?? createState();
  current.used = Math.max(current.used, ipUsed(request));
  const limit = trialLimit();

  if (current.used >= limit) {
    return {
      allowed: false,
      state: toPublicState(current),
      cookieValue: serializeState(current),
    };
  }

  const next = { ...current, used: current.used + 1 };
  recordIpUsage(request, next.used);
  return {
    allowed: true,
    state: toPublicState(next),
    cookieValue: serializeState(next),
  };
}

export function trialCookieHeader(value: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${AI_WORKSPACE_TRIAL_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${AI_WORKSPACE_TRIAL_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
}

export function trialResponseHeaders(
  state: AiWorkspaceTrialState,
  cookieValue: string,
  mode: "trial" | "account" = "trial",
): Headers {
  const headers = new Headers();
  headers.set("Set-Cookie", trialCookieHeader(cookieValue));
  headers.set("X-XWorkmate-Trial-Mode", mode);
  headers.set("X-XWorkmate-Trial-Limit", String(state.limit));
  headers.set("X-XWorkmate-Trial-Remaining", String(state.remaining));
  return headers;
}
