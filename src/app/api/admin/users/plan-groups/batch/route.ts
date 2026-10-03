export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";

import { proxyAdminPlanGroupRequest } from "@server/account/adminPlanGroupProxy";

export function PUT(request: NextRequest) {
  return proxyAdminPlanGroupRequest(request, "/admin/users/plan-groups/batch");
}
