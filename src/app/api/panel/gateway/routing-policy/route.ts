export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { isOperationsUser } from "@server/account/adminAccess";
import { getAccountSession } from "@server/account/session";
import { operationsRequestOrigin } from "@server/operations/requestOrigin";
import {
  DEFAULT_GITOPS_TARGET,
  DEFAULT_ROUTING_POLICY_YAML,
  parseAndValidateRoutingPolicy,
} from "@/modules/extensions/builtin/user-center/lib/routingPolicy";

const MAX_BODY_BYTES = 128 * 1024;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };
const REPO_NAME_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SAFE_BRANCH_RE = /^[A-Za-z0-9_./-]+$/;

function resolveDefaultTarget() {
  return {
    repository:
      process.env.GATEWAY_GITOPS_REPO?.trim() ||
      DEFAULT_GITOPS_TARGET.repository,
    branch:
      process.env.GATEWAY_GITOPS_BRANCH?.trim() || DEFAULT_GITOPS_TARGET.branch,
    path:
      process.env.GATEWAY_GITOPS_PATH?.trim() || DEFAULT_GITOPS_TARGET.path,
  };
}

function isSafeRepoPath(filePath: string): boolean {
  if (!filePath || filePath.startsWith("/") || filePath.includes("..")) {
    return false;
  }
  return /^[A-Za-z0-9_./-]+$/.test(filePath);
}

function getGitHubToken(): string {
  return (
    process.env.GATEWAY_GITOPS_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    ""
  );
}

function jsonError(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json(
    { error, ...extra },
    { status, headers: NO_STORE_HEADERS },
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getAccountSession(request);
    if (!session.user || !session.token) {
      return jsonError("unauthenticated", 401);
    }
    if (!isOperationsUser(session.user)) {
      return jsonError("forbidden", 403);
    }
  } catch {
    return jsonError("session_unavailable", 503);
  }

  const target = resolveDefaultTarget();
  const token = getGitHubToken();

  if (token) {
    try {
      const url = `https://api.github.com/repos/${target.repository}/contents/${target.path}?ref=${encodeURIComponent(target.branch)}`;
      const upstream = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "xworkmate-portal-gateway-gitops",
        },
      });
      if (upstream.ok) {
        const data = (await upstream.json()) as {
          content?: string;
          sha?: string;
        };
        if (typeof data.content === "string") {
          const decoded = Buffer.from(
            data.content.replace(/\n/g, ""),
            "base64",
          ).toString("utf8");
          const validation = parseAndValidateRoutingPolicy(decoded);
          return NextResponse.json(
            {
              source: "github",
              target,
              yaml: decoded,
              revision: validation.revision,
              sha: data.sha,
              fetchedAt: new Date().toISOString(),
            },
            { headers: NO_STORE_HEADERS },
          );
        }
      }
    } catch {
      // Fall back to canonical default when upstream GitHub is unreachable.
    }
  }

  const validation = parseAndValidateRoutingPolicy(DEFAULT_ROUTING_POLICY_YAML);
  return NextResponse.json(
    {
      source: "canonical_default",
      target,
      yaml: DEFAULT_ROUTING_POLICY_YAML,
      revision: validation.revision,
      fetchedAt: new Date().toISOString(),
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getAccountSession(request);
    if (!session.user || !session.token) {
      return jsonError("unauthenticated", 401);
    }
    if (!isOperationsUser(session.user)) {
      return jsonError("forbidden", 403);
    }
  } catch {
    return jsonError("session_unavailable", 503);
  }

  if (
    request.headers.get("origin") !== operationsRequestOrigin(request) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    return jsonError("invalid_origin", 403);
  }

  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    return jsonError("unsupported_media_type", 415);
  }

  const length = request.headers.get("content-length");
  if (
    length !== null &&
    (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)
  ) {
    return jsonError("body_too_large", 413);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return jsonError("body_too_large", 413);
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonError("invalid_json", 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError("invalid_json", 400);
  }

  const content =
    typeof body.content === "string"
      ? body.content
      : typeof body.yaml === "string"
        ? body.yaml
        : "";

  const validation = parseAndValidateRoutingPolicy(content);
  if (!validation.valid) {
    return jsonError("invalid_routing_policy", 400, { validation });
  }

  const defaults = resolveDefaultTarget();
  const repository =
    typeof body.repository === "string" && body.repository.trim()
      ? body.repository.trim()
      : defaults.repository;
  const branch =
    typeof body.branch === "string" && body.branch.trim()
      ? body.branch.trim()
      : defaults.branch;
  const filePath =
    typeof body.path === "string" && body.path.trim()
      ? body.path.trim()
      : defaults.path;
  const commitMessage =
    typeof body.commitMessage === "string" && body.commitMessage.trim()
      ? body.commitMessage.trim().slice(0, 200)
      : DEFAULT_GITOPS_TARGET.commitMessage;
  const dryRun = body.dryRun === true;

  if (
    !REPO_NAME_RE.test(repository) ||
    !SAFE_BRANCH_RE.test(branch) ||
    !isSafeRepoPath(filePath)
  ) {
    return jsonError("invalid_gitops_target", 400);
  }

  const target = { repository, branch, path: filePath, commitMessage };
  const token = getGitHubToken();

  if (dryRun) {
    return NextResponse.json(
      {
        synced: false,
        mode: "dry_run",
        target,
        message: "已完成客户端/服务端 YAML 校验与预览（Dry Run 未推送远端）。",
        validation,
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  if (!token) {
    return NextResponse.json(
      {
        synced: false,
        mode: "validation_only",
        target,
        message:
          "策略校验通过；当前环境未配置 GATEWAY_GITOPS_TOKEN / GITHUB_TOKEN，已生成规范 YAML 供离线 PR 提交。",
        validation,
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  const apiBase = `https://api.github.com/repos/${repository}/contents/${filePath}`;
  let existingSha: string | undefined;
  try {
    const headRes = await fetch(
      `${apiBase}?ref=${encodeURIComponent(branch)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "xworkmate-portal-gateway-gitops",
        },
      },
    );
    if (headRes.ok) {
      const existing = (await headRes.json()) as { sha?: string };
      existingSha = existing.sha;
    }
  } catch {
    return jsonError("gitops_upstream_unavailable", 503);
  }

  try {
    const putRes = await fetch(apiBase, {
      method: "PUT",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "xworkmate-portal-gateway-gitops",
      },
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(validation.normalizedYaml, "utf8").toString(
          "base64",
        ),
        branch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });

    if (!putRes.ok) {
      return jsonError("gitops_sync_rejected", 502);
    }

    const result = (await putRes.json()) as {
      commit?: { sha?: string; html_url?: string };
    };

    return NextResponse.json(
      {
        synced: true,
        mode: "github_commit",
        target,
        commitSha: result.commit?.sha,
        htmlUrl: result.commit?.html_url,
        message: `已将最新三层路由策略同步至 ${repository}@${branch}:${filePath}`,
        validation,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch {
    return jsonError("gitops_upstream_unavailable", 503);
  }
}
