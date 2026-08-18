import type { NextRequest } from "next/server";

import { getAccountSession } from "@server/account/session";
import {
  consumeTrialTask,
  getTrialState,
  trialResponseHeaders,
} from "@server/ai-workspace/trial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BRIDGE_SERVER_URL = "https://xworkmate-bridge.svc.plus";

function bridgeServerUrl(): string {
  return (
    process.env.BRIDGE_SERVER_URL?.trim().replace(/\/+$/, "") ||
    DEFAULT_BRIDGE_SERVER_URL
  );
}

function bridgeHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  const token = process.env.BRIDGE_AUTH_TOKEN?.trim();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (extra) {
    new Headers(extra).forEach((value, key) => headers.set(key, value));
  }
  return headers;
}

function jsonError(
  message: string,
  status: number,
  headers?: Headers,
  code?: string,
): Response {
  const responseHeaders = headers ?? new Headers();
  responseHeaders.set("Content-Type", "application/json");
  return new Response(
    JSON.stringify({ error: { code, message } }),
    { status, headers: responseHeaders },
  );
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const session = await getAccountSession(request);
  return Boolean(session.user);
}

async function pingBridge(): Promise<Response> {
  const response = await fetch(`${bridgeServerUrl()}/api/ping`, {
    cache: "no-store",
    headers: bridgeHeaders(),
  });
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}

async function scrubTrialArtifacts(body: string): Promise<string> {
  try {
    const payload = JSON.parse(body) as Record<string, unknown>;
    const result =
      payload.result && typeof payload.result === "object"
        ? (payload.result as Record<string, unknown>)
        : null;
    const artifacts = result?.artifacts;
    if (!Array.isArray(artifacts)) {
      return body;
    }

    return JSON.stringify({
      ...payload,
      result: {
        ...result,
        artifacts: artifacts.map((artifact) => {
          if (!artifact || typeof artifact !== "object") {
            return artifact;
          }
          const safeArtifact = { ...(artifact as Record<string, unknown>) };
          delete safeArtifact.url;
          delete safeArtifact.downloadUrl;
          delete safeArtifact.path;
          return safeArtifact;
        }),
      },
    });
  } catch {
    return body;
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  if (request.nextUrl.searchParams.get("action") === "ping") {
    return pingBridge();
  }

  if (await isAuthenticated(request)) {
    return Response.json({
      mode: "account",
      canPersist: true,
      canDownload: true,
      message: "已登录，可保存会话并下载制品。",
    });
  }

  const { state, cookieValue } = getTrialState(request);
  const headers = trialResponseHeaders(state, cookieValue);
  headers.set("Content-Type", "application/json");
  return new Response(
    JSON.stringify({
      mode: "trial",
      canPersist: false,
      canDownload: false,
      trial: state,
      registerHref: "/register?returnTo=%2Fai-workspace%3Fentry%3Dtrial",
      message: "访客试用不保存会话，注册后可保存会话并下载制品。",
    }),
    { headers },
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError("Invalid bridge request.", 400);
  }

  const body = payload as Record<string, unknown>;
  const method = typeof body.method === "string" ? body.method : "";
  if (method !== "session.start" && method !== "session.message") {
    return jsonError("Trial mode only supports task execution requests.", 400);
  }

  if (await isAuthenticated(request)) {
    const response = await fetch(`${bridgeServerUrl()}/acp/rpc`, {
      method: "POST",
      cache: "no-store",
      headers: bridgeHeaders(),
      body: JSON.stringify(payload),
    });
    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const consumed = consumeTrialTask(request);
  const responseHeaders = trialResponseHeaders(
    consumed.state,
    consumed.cookieValue,
  );
  if (!consumed.allowed) {
    return jsonError(
      "本次访客试用额度已用尽，注册后可继续使用并保存会话。",
      429,
      responseHeaders,
      "trial_limit_reached",
    );
  }

  const params =
    body.params && typeof body.params === "object" && !Array.isArray(body.params)
      ? (body.params as Record<string, unknown>)
      : {};
  const trialPayload = {
    ...body,
    params: {
      ...params,
      trial: {
        mode: "anonymous",
        trialId: consumed.state.id,
        persistence: "ephemeral",
        allowPersistence: false,
        allowArtifactDownload: false,
      },
    },
  };

  const response = await fetch(`${bridgeServerUrl()}/acp/rpc`, {
    method: "POST",
    cache: "no-store",
    headers: bridgeHeaders({
      "X-XWorkmate-Trial": "anonymous",
      "X-XWorkmate-Trial-Id": consumed.state.id,
      "X-XWorkmate-Trial-Remaining": String(consumed.state.remaining),
    }),
    body: JSON.stringify(trialPayload),
  });
  const responseBody = await scrubTrialArtifacts(await response.text());
  responseHeaders.set(
    "Content-Type",
    response.headers.get("content-type") ?? "application/json",
  );
  return new Response(responseBody, {
    status: response.status,
    headers: responseHeaders,
  });
}
