import { NextRequest, NextResponse } from "next/server";
import { getAccountSession } from "@server/account/session";
import { isOperationsUser } from "@server/account/adminAccess";
import { operationsRequestOrigin } from "@server/operations/requestOrigin";
import { snapshotCatalog } from "@/modules/extensions/builtin/platform-operations/lib/snapshot-plan";
import { GET as getCatalog } from "../catalog/route";
import { POST as createPlan } from "../plans/route";
import { GET as listReleases } from "../releases/route";

export const dynamic = "force-dynamic";
// initialize-based Streamable HTTP. No server streams or persistent sessions.
const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"];
const MAX_BODY_BYTES = 32 * 1024;
const headers = { "Cache-Control": "private, no-store" };
type RpcId = string | number | null;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const noArguments = {
  type: "object",
  properties: {},
  additionalProperties: false,
};
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const controlledInputs = [
  "deploy_env",
  "enable_migration",
  "adopt_accounts_baseline",
  "apply_accounts_schema_migration",
];
const planSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    environment: {
      type: "string",
      enum: ["sit", "uat", "prod"],
      default: "uat",
    },
    mode: {
      type: "string",
      enum: ["none", "preview", "import", "baseline", "schema"],
      default: "none",
    },
    inputs: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(
        Object.entries(snapshotCatalog.inputs)
          .filter(([name]) => !controlledInputs.includes(name))
          .map(([name, value]) => [
            name,
            { type: typeof value, default: value },
          ]),
      ),
    },
  },
};
const tools = [
  {
    name: "operations_get_catalog",
    description: "Read snapshot options. Execution is unsupported.",
    inputSchema: noArguments,
    annotations,
  },
  {
    name: "operations_create_plan",
    description:
      "Validate snapshot input and create a non-executable plan; never dispatches a workflow.",
    inputSchema: planSchema,
    annotations,
  },
  {
    name: "operations_list_releases",
    description:
      "Read the existing release catalog; source failures remain errors.",
    inputSchema: noArguments,
    annotations: { ...annotations, openWorldHint: true },
  },
];

async function authorize(request: NextRequest): Promise<NextResponse | null> {
  if (
    (request.headers.has("origin") &&
      request.headers.get("origin") !== operationsRequestOrigin(request)) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return NextResponse.json(
      { error: "invalid_origin" },
      { status: 403, headers },
    );
  try {
    const session = await getAccountSession(request);
    if (!session.user || !session.token)
      return NextResponse.json(
        { error: "unauthenticated" },
        { status: 401, headers },
      );
    if (!isOperationsUser(session.user))
      return NextResponse.json(
        { error: "forbidden" },
        { status: 403, headers },
      );
    return null;
  } catch {
    return NextResponse.json(
      { error: "session_unavailable" },
      { status: 503, headers },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await authorize(request);
  return (
    denied ??
    NextResponse.json(
      { error: "streaming_unsupported" },
      { status: 405, headers: { ...headers, Allow: "POST" } },
    )
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const denied = await authorize(request);
  if (denied) return denied;
  // Cookie-authenticated callers must supply Origin. Native clients can send
  // the same origin explicitly; authentication remains the existing session.
  if (request.headers.get("origin") !== operationsRequestOrigin(request))
    return NextResponse.json(
      { error: "invalid_origin" },
      { status: 403, headers },
    );
  let id: RpcId = null;
  const error = (code: number, message: string, status = 200) =>
    NextResponse.json(
      { jsonrpc: "2.0", id, error: { code, message } },
      { status, headers },
    );
  const result = (value: unknown) =>
    NextResponse.json({ jsonrpc: "2.0", id, result: value }, { headers });
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    return error(-32600, "Expected application/json", 415);
  const accept = request.headers.get("accept") ?? "";
  if (
    !accept.includes("application/json") ||
    !accept.includes("text/event-stream")
  )
    return error(
      -32600,
      "Accept must include application/json and text/event-stream",
      406,
    );
  const version = request.headers.get("mcp-protocol-version");
  if (version && !PROTOCOL_VERSIONS.includes(version))
    return error(-32600, "Unsupported MCP protocol version", 400);
  const length = request.headers.get("content-length");
  if (
    length !== null &&
    (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)
  )
    return error(-32600, "Request body exceeds limit", 413);
  const reader = request.body?.getReader();
  if (!reader) return error(-32700, "Parse error", 400);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "";
  let bytes = 0;
  let body: unknown;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return error(-32600, "Request body exceeds limit", 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    body = JSON.parse(text + decoder.decode());
  } catch {
    return error(-32700, "Parse error", 400);
  } finally {
    reader.releaseLock();
  }
  if (
    !record(body) ||
    body.jsonrpc !== "2.0" ||
    typeof body.method !== "string" ||
    (body.id !== undefined &&
      typeof body.id !== "string" &&
      typeof body.id !== "number")
  )
    return error(-32600, "Invalid request", 400);
  if (body.id === undefined) {
    if (body.method !== "notifications/initialized")
      return error(-32600, "Unsupported notification", 400);
    return new NextResponse(null, { status: 202, headers });
  }
  id = body.id as RpcId;
  if (body.params !== undefined && !record(body.params))
    return error(-32602, "Invalid params");
  const params = record(body.params) ? body.params : {};
  if (body.method === "initialize") {
    if (
      typeof params.protocolVersion !== "string" ||
      !record(params.capabilities) ||
      !record(params.clientInfo) ||
      typeof params.clientInfo.name !== "string" ||
      typeof params.clientInfo.version !== "string"
    )
      return error(-32602, "Invalid initialization parameters");
    return result({
      protocolVersion: PROTOCOL_VERSIONS.includes(params.protocolVersion)
        ? params.protocolVersion
        : PROTOCOL_VERSIONS[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "portal-operations", version: "1.0.0" },
      instructions:
        "Read and plan only. Workflow execution is unsupported: no Operations backend runtime is connected.",
    });
  }
  if (body.method === "ping") return result({});
  if (body.method === "tools/list") {
    if (Object.keys(params).length)
      return error(-32602, "Pagination is unsupported");
    return result({ tools });
  }
  if (body.method !== "tools/call")
    return error(-32601, "Method not found; execution is unsupported");
  const args = params.arguments ?? {};
  if (!record(args) || typeof params.name !== "string")
    return error(-32602, "Invalid tool arguments");
  if (!tools.some((tool) => tool.name === params.name))
    return error(-32602, "Unknown tool; execution is unsupported");
  if (params.name !== "operations_create_plan" && Object.keys(args).length)
    return error(-32602, "This tool accepts no arguments");
  try {
    const response =
      params.name === "operations_get_catalog"
        ? await getCatalog(request)
        : params.name === "operations_list_releases"
          ? await listReleases(request)
          : await createPlan(
              new NextRequest(request.url, {
                method: "POST",
                headers: (() => {
                  const forwarded = new Headers(request.headers);
                  forwarded.delete("content-length");
                  return forwarded;
                })(),
                body: JSON.stringify(args),
              }),
            );
    const payload: unknown = await response.json();
    return result({
      content: [{ type: "text", text: JSON.stringify(payload) }],
      isError: !response.ok,
    });
  } catch {
    return result({
      content: [{ type: "text", text: "Operations source unavailable" }],
      isError: true,
    });
  }
}
