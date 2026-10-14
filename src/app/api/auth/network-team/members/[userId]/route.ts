export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { proxyNetworkAccess } from "@server/account/networkAccessProxy";

type Params = { params: Promise<{ userId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { userId } = await params;
  return proxyNetworkAccess(
    request,
    `network-team/members/${encodeURIComponent(userId)}`,
  );
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { userId } = await params;
  return proxyNetworkAccess(
    request,
    `network-team/members/${encodeURIComponent(userId)}`,
  );
}
