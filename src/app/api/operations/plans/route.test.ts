// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  operations: vi.fn(),
  releases: vi.fn(),
}));
vi.mock("@server/account/session", () => ({
  getAccountSession: mocks.session,
}));
vi.mock("@server/account/adminAccess", () => ({
  isOperationsUser: mocks.operations,
}));
vi.mock("../releases/route", () => ({ GET: mocks.releases }));

import { POST as plan } from "./route";
import { GET as catalog } from "../catalog/route";
import { POST as mcp, GET as stream } from "../mcp/route";

const origin = "https://console.example";
function request(
  body: unknown = {},
  extra: Record<string, string> = {},
): NextRequest {
  return new NextRequest(`${origin}/api/operations/plans`, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...extra,
    },
    body: JSON.stringify(body),
  });
}
const rpc = (method: string, params?: unknown, extra = {}) =>
  request(
    {
      jsonrpc: "2.0",
      id: 7,
      method,
      ...(params === undefined ? {} : { params }),
    },
    extra,
  );

describe("Operations API and read-only MCP", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue({
      user: { id: "operator" },
      token: "session-token",
    });
    mocks.operations.mockReturnValue(true);
  });

  it("accepts the configured public origin behind an internal Worker URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONSOLE_HOST", "console.example");
    const behindWorker = (
      body: unknown,
      headers: Record<string, string> = {},
    ) =>
      new NextRequest("http://localhost:3000/api/operations/plans", {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          ...headers,
        },
        body: JSON.stringify(body),
      });
    expect(
      (await plan(behindWorker({ environment: "uat", mode: "none" }))).status,
    ).toBe(200);
    expect(
      (await mcp(behindWorker({ jsonrpc: "2.0", id: 1, method: "tools/list" })))
        .status,
    ).toBe(200);
    for (const handler of [plan, mcp]) {
      expect(
        (
          await handler(
            behindWorker(
              {},
              {
                origin: "https://attacker.example",
                "x-forwarded-host": "attacker.example",
              },
            ),
          )
        ).status,
      ).toBe(403);
      expect(
        (await handler(behindWorker({}, { "sec-fetch-site": "cross-site" })))
          .status,
      ).toBe(403);
    }
  });

  it("authenticates and role-gates every route with private responses", async () => {
    for (const handler of [catalog, plan, mcp, stream]) {
      mocks.session.mockResolvedValue({ user: null });
      const anonymous = await handler(request());
      expect(anonymous.status).toBe(401);
      expect(anonymous.headers.get("cache-control")).toBe("private, no-store");
      mocks.session.mockResolvedValue({ user: { id: "viewer" }, token: "t" });
      mocks.operations.mockReturnValue(false);
      expect((await handler(request())).status).toBe(403);
      mocks.operations.mockReturnValue(true);
    }
    expect(mocks.releases).not.toHaveBeenCalled();
  });

  it("returns catalog and explicit non-executable UAT/PROD plans", async () => {
    expect((await (await catalog(request())).json()).executionAvailable).toBe(
      false,
    );
    for (const environment of ["uat", "prod"]) {
      const response = await plan(request({ environment, mode: "none" }));
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      const payload = await response.json();
      expect(payload.executable).toBe(false);
      expect(payload.blocker).toBe(
        environment === "prod"
          ? "protected_release_not_connected"
          : "execution_backend_not_connected",
      );
      if (environment === "prod") expect(payload.workflow).toBeNull();
    }
  });

  it.each([plan, mcp])(
    "rejects missing/foreign origins and cross-site POST",
    async (handler) => {
      expect(
        (await handler(request({}, { origin: "https://attacker.example" })))
          .status,
      ).toBe(403);
      expect((await handler(request({}, { origin: "" }))).status).toBe(403);
      expect(
        (await handler(request({}, { "sec-fetch-site": "cross-site" }))).status,
      ).toBe(403);
      expect(
        (await handler(request({}, { "content-type": "text/plain" }))).status,
      ).toBe(415);
      expect(
        (await handler(request({}, { "content-length": "999999" }))).status,
      ).toBe(413);
      expect((await handler(request({ text: "x".repeat(32768) }))).status).toBe(
        413,
      );
    },
  );

  it.each([plan, mcp])(
    "bounds chunked UTF-8 bytes without Content-Length",
    async (handler) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"text":"'));
          controller.enqueue(new TextEncoder().encode("界".repeat(12000)));
          controller.close();
        },
      });
      const streamed = new NextRequest(`${origin}/api/operations/mcp`, {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body,
        // Node's Request requires duplex for streaming uploads.
        duplex: "half",
      } as ConstructorParameters<typeof NextRequest>[1]);
      expect((await handler(streamed)).status).toBe(413);
    },
  );

  it("rejects invalid modes, controlled flags, and preview writes", async () => {
    for (const input of [
      [],
      null,
      { mode: "execute" },
      { inputs: { enable_migration: true } },
      {
        mode: "preview",
        inputs: { migration_config_json: '{"dry_run":false}' },
      },
    ]) {
      expect((await plan(request(input))).status).toBe(400);
    }
    const response = await plan(request({ mode: "preview" }));
    expect((await response.json()).previewOnly).toBe(true);
  });

  it("negotiates allowed initialize versions and fallback", async () => {
    for (const version of [
      "2025-11-25",
      "2025-06-18",
      "2025-03-26",
      "unknown",
    ]) {
      const response = await mcp(
        rpc("initialize", {
          protocolVersion: version,
          capabilities: {},
          clientInfo: { name: "test", version: "1" },
        }),
      );
      expect((await response.json()).result.protocolVersion).toBe(
        version === "unknown" ? "2025-11-25" : version,
      );
    }
    await expect(
      (await mcp(rpc("initialize", {}))).json(),
    ).resolves.toMatchObject({
      error: { code: -32602 },
    });
    expect(
      (await mcp(rpc("tools/list", {}, { "mcp-protocol-version": "invalid" })))
        .status,
    ).toBe(400);
  });

  it("lists exactly three read-only tools with controlled flags excluded", async () => {
    const payload = await (await mcp(rpc("tools/list"))).json();
    expect(
      payload.result.tools.map((tool: { name: string }) => tool.name),
    ).toEqual([
      "operations_get_catalog",
      "operations_create_plan",
      "operations_list_releases",
    ]);
    const schema = payload.result.tools[1].inputSchema;
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.inputs.properties).not.toHaveProperty(
      "enable_migration",
    );
    expect(
      payload.result.tools.every(
        (tool: { annotations: { readOnlyHint: boolean } }) =>
          tool.annotations.readOnlyHint,
      ),
    ).toBe(true);
  });

  it("calls the shared plan validator and existing release GET, retaining failures", async () => {
    const planned = await (
      await mcp(
        rpc("tools/call", {
          name: "operations_create_plan",
          arguments: { environment: "uat", mode: "preview" },
        }),
      )
    ).json();
    expect(JSON.parse(planned.result.content[0].text)).toMatchObject({
      executable: false,
      previewOnly: true,
    });
    const invalid = await (
      await mcp(
        rpc("tools/call", {
          name: "operations_create_plan",
          arguments: { inputs: { enable_migration: true } },
        }),
      )
    ).json();
    expect(invalid.result.isError).toBe(true);
    mocks.releases.mockResolvedValue(
      Response.json({ error: "release_source_unavailable" }, { status: 503 }),
    );
    const failed = await (
      await mcp(rpc("tools/call", { name: "operations_list_releases" }))
    ).json();
    expect(mocks.releases).toHaveBeenCalledOnce();
    expect(failed.result.isError).toBe(true);
    expect(JSON.parse(failed.result.content[0].text).error).toBe(
      "release_source_unavailable",
    );
  });

  it("rejects execute, unknown methods, batches, malformed JSON and invalid arguments", async () => {
    expect(
      (
        await (
          await mcp(rpc("tools/call", { name: "operations_execute" }))
        ).json()
      ).error.code,
    ).toBe(-32602);
    expect((await (await mcp(rpc("execute"))).json()).error.code).toBe(-32601);
    expect(
      (
        await (
          await mcp(
            rpc("tools/call", {
              name: "operations_get_catalog",
              arguments: { source: "evil" },
            }),
          )
        ).json()
      ).error.code,
    ).toBe(-32602);
    expect(
      (await mcp(request([{ jsonrpc: "2.0", method: "tools/list", id: 1 }])))
        .status,
    ).toBe(400);
    const malformed = new NextRequest(`${origin}/api/operations/mcp`, {
      method: "POST",
      headers: request().headers,
      body: "{",
    });
    expect((await (await mcp(malformed)).json()).error.code).toBe(-32700);
  });

  it("accepts initialized notification and declines streaming", async () => {
    const initialized = await mcp(
      request({ jsonrpc: "2.0", method: "notifications/initialized" }),
    );
    expect(initialized.status).toBe(202);
    expect(await initialized.text()).toBe("");
    expect((await stream(request())).status).toBe(405);
    expect(
      (await mcp(rpc("tools/list", {}, { accept: "application/json" }))).status,
    ).toBe(406);
  });
});
