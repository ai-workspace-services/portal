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
  /** Any matching group grants the rule, after tenant claims are resolved. */
  groups?: string[];
  /** Require an active tenant membership when the session carries tenant data. */
  tenantScoped?: boolean;
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

function normalizeGroups(groups?: string[]): string[] | undefined {
  if (!groups || groups.length === 0) {
    return undefined;
  }
  const known = new Set<string>();
  for (const group of groups) {
    const trimmed = group.trim().toLowerCase();
    if (trimmed.length > 0) {
      known.add(trimmed);
    }
  }
  return known.size ? Array.from(known) : undefined;
}

function hasMatchingGroup(userGroups: string[], allowedGroups?: string[]) {
  if (!allowedGroups) {
    return undefined;
  }
  const normalizedUserGroups = new Set(
    userGroups.map((group) => group.trim().toLowerCase()),
  );
  return allowedGroups.some((group) => normalizedUserGroups.has(group));
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
  const normalizedGroups = normalizeGroups(normalizedRule.groups);

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
  const tenantContextPresent = Boolean(user.tenantId || user.tenants?.length);
  const activeTenant = normalizedRule.tenantScoped && tenantContextPresent
    ? user.tenantId
      ? user.tenants?.find((tenant) => tenant.id === user.tenantId)
      : undefined
    : undefined;

  if (normalizedRule.tenantScoped && tenantContextPresent && !activeTenant) {
    return { allowed: false, reason: "forbidden", userRole: role };
  }

  const scopedGroups = [
    ...(user.groups ?? []),
    ...(activeTenant?.groups ?? []),
  ];
  const scopedPermissions = [
    ...(user.permissions ?? []),
    ...(activeTenant?.permissions ?? []),
  ];
  const scopedRole = activeTenant?.role
    ? resolveEffectiveRole(activeTenant.role, scopedGroups)
    : role;
  const effectiveRole = ROLE_RANK[scopedRole] >= ROLE_RANK[role] ? scopedRole : role;
  const userPermissions = new Set(scopedPermissions);
  const roleAllowed = normalizedRoles
    ? normalizedRoles.includes(effectiveRole)
    : undefined;
  const permissionAllowed = normalizedPermissions
    ? normalizedPermissions.every(
        (permission) =>
          userPermissions.has(permission) || userPermissions.has("*"),
      )
    : undefined;
  const groupAllowed = hasMatchingGroup(scopedGroups, normalizedGroups);

  if (
    (normalizedRoles || normalizedPermissions || normalizedGroups) &&
    !roleAllowed &&
    !permissionAllowed &&
    !groupAllowed
  ) {
    return {
      allowed: false,
      reason: "forbidden",
      userRole: effectiveRole,
    };
  }

  return {
    allowed: true,
    userRole: effectiveRole,
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
