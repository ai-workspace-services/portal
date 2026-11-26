import { NextRequest, NextResponse } from "next/server";

import { resolveEffectiveRole } from "@lib/accessControl";
import type { UserRole } from "@lib/userStore";
import { getAccountSession, type AccountSessionUser } from "@server/account/session";

export type OpsWafAuthResult =
  | {
      ok: true;
      user: AccountSessionUser;
      effectiveRole: "admin" | "operator";
    }
  | {
      ok: false;
      response: NextResponse;
    };

/**
 * Verifies that the caller is authenticated and has Root, Admin, or Operator
 * (`运营组` / `operator`) privileges before accessing WAF provider settings or
 * publishing rules.
 */
export async function requireOpsWafAccess(request?: NextRequest): Promise<OpsWafAuthResult> {
  const session = await getAccountSession(request);
  if (!session.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  const effectiveRole = resolveEffectiveRole(
    session.user.role as UserRole,
    session.user.groups,
  );

  if (effectiveRole !== "admin" && effectiveRole !== "operator") {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    user: session.user,
    effectiveRole,
  };
}
