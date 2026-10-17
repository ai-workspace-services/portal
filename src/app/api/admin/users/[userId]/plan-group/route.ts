export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { proxyAdminPlanGroupRequest } from "@server/account/adminPlanGroupProxy";

type RouteContext = { params: Promise<{ userId: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { userId } = await context.params;
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return NextResponse.json({ error: "invalid_user" }, { status: 400 });
  }
  return proxyAdminPlanGroupRequest(
    request,
    `/admin/users/${encodeURIComponent(normalizedUserId)}/plan-group`,
  );
}
