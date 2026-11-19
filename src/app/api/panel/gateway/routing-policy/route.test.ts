// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  operations: vi.fn(),
}));

vi.mock("@server/account/session", () => ({
  getAccountSession: mocks.session,
}));
vi.mock("@server/account/adminAccess", () => ({
  isOperationsUser: mocks.operations,
}));

import { GET, POST } from "./route";
import { DEFAULT_ROUTING_POLICY_YAML } from "@/modules/extensions/builtin/user-center/lib/routingPolicy";

const origin = "https://console.example";

function postRequest(
  body: unknown,
  extraHeaders: Record<string, string> = {},
): NextRequest {
  return new NextRequest(`${origin}/api/panel/gateway/routing-policy`, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

describe("/api/panel/gateway/routing-policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue({
      user: { id: "operator-1", role: "operator" },
      token: "session-token",
    });
    mocks.operations.mockReturnValue(true);
  });

  it("enforces authentication and operator authorization", async () => {
    mocks.session.mockResolvedValueOnce({ user: null, token: null });
    expect(
      (await GET(new NextRequest(`${origin}/api/panel/gateway/routing-policy`)))
        .status,
    ).toBe(401);

    mocks.operations.mockReturnValueOnce(false);
    expect(
      (await GET(new NextRequest(`${origin}/api/panel/gateway/routing-policy`)))
        .status,
    ).toBe(403);
  });

  it("returns canonical baseline YAML when GitHub token is absent", async () => {
    const response = await GET(
      new NextRequest(`${origin}/api/panel/gateway/routing-policy`),
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.source).toBe("canonical_default");
    expect(payload.target).toEqual({
      repository: "ai-workspace-infra/playbooks",
      branch: "main",
      path: "config/xconnect-routing-policy.yaml",
    });
    expect(payload.yaml).toContain("Pro-EC2-Pool");
  });

  it("rejects cross-origin POST and invalid routing policy YAML", async () => {
    const crossOrigin = await POST(
      postRequest(
        { content: DEFAULT_ROUTING_POLICY_YAML },
        { origin: "https://evil.example" },
      ),
    );
    expect(crossOrigin.status).toBe(403);

    const invalidPolicy = await POST(
      postRequest({ content: "pools:\n  Media-Pool: {}" }),
    );
    expect(invalidPolicy.status).toBe(400);
    const payload = await invalidPolicy.json();
    expect(payload.error).toBe("invalid_routing_policy");
  });

  it("validates and commits to GitHub Contents API when token is configured", async () => {
    vi.stubEnv("GATEWAY_GITOPS_TOKEN", "ghp_test_token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sha: "old-sha-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          commit: {
            sha: "new-commit-sha",
            html_url: "https://github.com/ai-workspace-infra/playbooks/commit/new",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      postRequest({
        content: DEFAULT_ROUTING_POLICY_YAML,
        repository: "ai-workspace-infra/playbooks",
        branch: "main",
        path: "config/xconnect-routing-policy.yaml",
        commitMessage: "chore: update policy",
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      synced: true,
      mode: "github_commit",
      commitSha: "new-commit-sha",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/ai-workspace-infra/playbooks/contents/config/xconnect-routing-policy.yaml",
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
