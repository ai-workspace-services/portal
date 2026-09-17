import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const session = vi.hoisted(() => ({ token: "account-token" as string | undefined }));
vi.mock("@/server/account/session", () => ({
  getAccountSession: vi.fn(async () => ({ token: session.token })),
}));

import { GET } from "./route";

describe("GET /api/ai-workspace/tasks/catalog", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    session.token = "account-token";
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("BRIDGE_SERVER_URL", "https://bridge.test");
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("forwards the account token and allowlisted query to the bridge", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, catalog: { pinnedTasks: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const response = await GET(
      new NextRequest("http://localhost/api/ai-workspace/tasks/catalog?limit=20&offset=0&scope=s&token=leak"),
    );

    expect(response.status).toBe(200);
    const [target, init] = fetchMock.mock.calls[0]!;
    expect(String(target)).toBe("https://bridge.test/api/v1/agent/catalog?scope=s&limit=20&offset=0");
    expect(init.headers.Authorization).toBe("Bearer account-token");
  });

  it("requires authentication outside development", async () => {
    session.token = undefined;
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_WORKSPACE_AUTH_TOKEN", "server-token");

    const response = await GET(new NextRequest("http://localhost/api/ai-workspace/tasks/catalog"));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the environment token only in development", async () => {
    session.token = undefined;
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AI_WORKSPACE_AUTH_TOKEN", "dev-token");
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await GET(new NextRequest("http://localhost/api/ai-workspace/tasks/catalog"));

    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe("Bearer dev-token");
  });

  it("reports an unreachable bridge as 502 instead of an empty catalog", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await GET(new NextRequest("http://localhost/api/ai-workspace/tasks/catalog"));

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body).not.toHaveProperty("catalog");
  });

  it("passes upstream errors through", async () => {
    fetchMock.mockResolvedValue(new Response('{"error":{"code":"unauthorized"}}', { status: 401 }));

    const response = await GET(new NextRequest("http://localhost/api/ai-workspace/tasks/catalog"));

    expect(response.status).toBe(401);
  });
});
