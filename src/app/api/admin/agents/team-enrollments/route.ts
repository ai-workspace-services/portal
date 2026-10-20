export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { proxyNetworkAccess } from "@server/account/networkAccessProxy";
export function GET(request: NextRequest) {
  return proxyNetworkAccess(
    request,
    "admin/agents/team-enrollments",
    "admin.agents.status.read",
  );
}
export function PUT(request: NextRequest) {
  return proxyNetworkAccess(
    request,
    "admin/agents/team-enrollments",
    "admin.settings.write",
  );
}
