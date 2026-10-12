export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { proxyNetworkAccess } from "@server/account/networkAccessProxy";
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await context.params;
  return proxyNetworkAccess(
    request,
    `admin/network-teams/${encodeURIComponent(teamId)}`,
    "admin.settings.write",
  );
}
