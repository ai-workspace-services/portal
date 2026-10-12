export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { proxyNetworkAccess } from "@server/account/networkAccessProxy";
type Context = { params: Promise<{ userId: string }> };
export async function PUT(request: NextRequest, context: Context) {
  const { userId } = await context.params;
  return proxyNetworkAccess(
    request,
    `admin/users/${encodeURIComponent(userId)}/network-access`,
    "admin.users.role.write",
  );
}
export async function GET(request: NextRequest, context: Context) {
  const { userId } = await context.params;
  return proxyNetworkAccess(
    request,
    `admin/users/${encodeURIComponent(userId)}/network-access`,
    "admin.users.role.write",
  );
}
