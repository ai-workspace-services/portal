import { NextRequest, NextResponse } from "next/server";

import { getAccountSession } from "@server/account/session";
import {
  addCustomMcpConnector,
  listSanitizedConnectors,
  sanitizeConnectorRecord,
} from "@server/connectors/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAccountSession(request);
  if (!session.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const userId = session.user.uuid || session.user.id;
  const connectors = await listSanitizedConnectors(userId);
  return NextResponse.json(connectors, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  const session = await getAccountSession(request);
  if (!session.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    description?: string;
    endpoint?: string;
    token?: string;
  } | null;

  const name = body?.name?.trim();
  const endpoint = body?.endpoint?.trim();
  if (!name || !endpoint) {
    return NextResponse.json(
      { message: "请填写自定义 MCP 名称与服务地址。" },
      { status: 400 },
    );
  }

  const userId = session.user.uuid || session.user.id;
  const record = await addCustomMcpConnector(userId, {
    name,
    description: body?.description,
    endpoint,
    token: body?.token,
  });

  return NextResponse.json(
    {
      connector: sanitizeConnectorRecord(record),
      message: "已添加自定义 MCP 连接器。",
    },
    { status: 201 },
  );
}
