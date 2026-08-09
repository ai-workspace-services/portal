import { useMemo } from "react";

import { useUserStore } from "./userStore";
import type { SessionUser, TenantMembership, UserRole } from "./userStore";

type AccessReason = "unauthenticated" | "forbidden";

export type AccessDecision = {
  allowed: boolean;
  reason?: AccessReason;
  userRole: UserRole | null;
  userTenants?: TenantMembership[];
  tenantId?: string;
};

export type AccessRule = {
  requireLogin?: boolean;
  allowGuests?: boolean;
  roles?: UserRole[];
  permissions?: string[];
};

const KNOWN_ROLES: UserRole[] = ["user", "operator", "admin"];

// 组名 → 角色。用户加入这些组即继承对应角色的访问权，与 role 字段是"或"
// 关系（取两者中更高的一个）。
//
// 键必须小写：比较前会把组名 trim + toLowerCase，所以 "Admin"、"ADMIN"、
// " admin " 都能命中。root 与 admin 同级，与 userStore 的 KNOWN_ROLE_MAP
// 保持一致——那里也把 root 归一化成 admin。
const GROUP_ROLE_MAP: Record<string, UserRole> = {
  root: "admin",
  admin: "admin",
  administrator: "admin",
  operator: "operator",
  ops: "operator",
};

// 角色强弱顺序，用于在 role 字段与组继承之间取较高者。
const ROLE_RANK: Record<UserRole, number> = {
  user: 0,
  operator: 1,
  admin: 2,
};

// 用户的有效角色 = max(role 字段, 组继承出来的最高角色)。
// 组只能提升权限、不能降低——降权要改 role 字段本身。
export function resolveEffectiveRole(
  role: UserRole,
  groups?: string[],
): UserRole {
  let effective = role;
  for (const group of groups ?? []) {
    const mapped = GROUP_ROLE_MAP[group.trim().toLowerCase()];
    if (mapped && ROLE_RANK[mapped] > ROLE_RANK[effective]) {
      effective = mapped;
    }
  }
  return effective;
}

function normalizeRoles(roles?: UserRole[]): UserRole[] | undefined {
  if (!roles || roles.length === 0) {
    return undefined;
  }
  const known = new Set<UserRole>();
  for (const role of roles) {
    if (KNOWN_ROLES.includes(role)) {
      known.add(role);
    }
  }
  return known.size ? Array.from(known) : undefined;
}

function normalizePermissions(permissions?: string[]): string[] | undefined {
  if (!permissions || permissions.length === 0) {
    return undefined;
  }
  const known = new Set<string>();
  for (const permission of permissions) {
    const trimmed = permission.trim();
    if (trimmed.length > 0) {
      known.add(trimmed);
    }
  }
  return known.size ? Array.from(known) : undefined;
}

export function resolveAccess(
  user: SessionUser,
  rule?: AccessRule,
): AccessDecision {
  const normalizedRule = rule ?? {};
  const normalizedRoles = normalizeRoles(normalizedRule.roles);
  const normalizedPermissions = normalizePermissions(
    normalizedRule.permissions,
  );

  const allowGuests =
    normalizedRule.allowGuests ??
    (!normalizedRule.requireLogin &&
      !normalizedRoles &&
      !normalizedPermissions);
  const requiresLogin = Boolean(normalizedRule.requireLogin);

  if (!user) {
    if (
      requiresLogin ||
      !allowGuests ||
      Boolean(normalizedRoles?.length) ||
      Boolean(normalizedPermissions?.length)
    ) {
      return { allowed: false, reason: "unauthenticated", userRole: null };
    }

    return { allowed: true, userRole: null };
  }

  // 组继承：加入 root/admin/operator 组的用户拿到对应角色的访问权，
  // 不需要改他们的 role 字段。
  const role: UserRole = resolveEffectiveRole(user.role, user.groups);
  const userPermissions = new Set(user?.permissions ?? []);
  const roleAllowed = normalizedRoles
    ? normalizedRoles.includes(role)
    : undefined;
  const permissionAllowed = normalizedPermissions
    ? normalizedPermissions.every(
        (permission) =>
          userPermissions.has(permission) || userPermissions.has("*"),
      )
    : undefined;

  if (
    normalizedRoles &&
    normalizedPermissions &&
    normalizedRoles.length > 0 &&
    normalizedPermissions.length > 0
  ) {
    if (!roleAllowed && !permissionAllowed) {
      return {
        allowed: false,
        reason: "forbidden",
        userRole: role,
      };
    }
  } else if (normalizedRoles && !roleAllowed) {
    return {
      allowed: false,
      reason: "forbidden",
      userRole: role,
    };
  }

  if (
    !normalizedRoles &&
    normalizedPermissions &&
    normalizedPermissions.length > 0
  ) {
    const userPermissions = new Set(user?.permissions ?? []);
    const missing = normalizedPermissions.some(
      (permission) =>
        !userPermissions.has(permission) && !userPermissions.has("*"),
    );
    if (missing) {
      return {
        allowed: false,
        reason: "forbidden",
        userRole: role,
      };
    }
  }

  return {
    allowed: true,
    userRole: role,
    userTenants: user?.tenants,
    tenantId: user?.tenantId,
  };
}

export function useAccess(rule?: AccessRule) {
  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.isLoading);

  const decision = useMemo(() => resolveAccess(user, rule), [user, rule]);

  return {
    ...decision,
    isLoading,
  };
}
