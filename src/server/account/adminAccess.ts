import type {
  AccountSessionUser,
  AccountUserRole,
} from "@server/account/session";

export const PLATFORM_ROOT_EMAIL = "admin@svc.plus";

type AccountAdminAccessRule = {
  roles?: AccountUserRole[];
  permissions?: string[];
  rootOnly?: boolean;
};

type AccountAdminAccessDecision = {
  allowed: boolean;
  reason?: "forbidden" | "root_only";
};

export function isPlatformRootEmail(email?: string): boolean {
  return email?.trim().toLowerCase() === PLATFORM_ROOT_EMAIL;
}

/**
 * Operations pages are role-gated. A permission string alone must not grant
 * access to the operational console or its account APIs.
 */
export function isOperationsUser(user: AccountSessionUser | null): boolean {
  if (!user) {
    return false;
  }
  if (user.role === "admin" || user.role === "operator") {
    return true;
  }
  return user.groups.some((group) =>
    ["root", "admin", "administrator", "operator", "ops"].includes(
      group.trim().toLowerCase(),
    ),
  );
}

function hasRole(
  user: AccountSessionUser,
  roles: AccountUserRole[],
): boolean {
  return roles.includes(user.role);
}

function hasPermission(
  user: AccountSessionUser,
  permissions: string[],
): boolean {
  if (permissions.length === 0) {
    return false;
  }
  const normalizedPermissions = new Set(
    user.permissions.map((permission) => permission.trim()),
  );
  if (normalizedPermissions.has("*")) {
    return true;
  }
  return permissions.every((permission) =>
    normalizedPermissions.has(permission.trim()),
  );
}

export async function evaluateAccountAdminAccess(
  user: AccountSessionUser | null,
  rule: AccountAdminAccessRule,
): Promise<AccountAdminAccessDecision> {
  if (!user) {
    return { allowed: false, reason: "forbidden" };
  }

  const roles = rule.roles ?? [];
  const permissions = rule.permissions ?? [];

  let allowed = false;
  if (roles.length > 0 && permissions.length > 0) {
    allowed = hasRole(user, roles) || hasPermission(user, permissions);
  } else if (roles.length > 0) {
    allowed = hasRole(user, roles);
  } else if (permissions.length > 0) {
    allowed = hasPermission(user, permissions);
  }

  if (!allowed) {
    return { allowed: false, reason: "forbidden" };
  }

  if (rule.rootOnly && !isPlatformRootEmail(user.email)) {
    return { allowed: false, reason: "root_only" };
  }

  return { allowed: true };
}
