import { describe, expect, it } from "vitest";

import {
  evaluateAccountAdminAccess,
  isPlatformRootEmail,
} from "@server/account/adminAccess";
import type { AccountSessionUser } from "@server/account/session";

function buildUser(overrides: Partial<AccountSessionUser> = {}): AccountSessionUser {
  return {
    id: "user-1",
    uuid: "user-1",
    proxyUuid: "proxy-1",
    email: "user@example.com",
    role: "user",
    groups: [],
    permissions: [],
    ...overrides,
  };
}

describe("adminAccess", () => {
  it("allows platform admin roles without an explicit permission", async () => {
    const decision = await evaluateAccountAdminAccess(buildUser({ role: "admin" }), {
      roles: ["admin", "operator"],
      permissions: ["admin.users.list.read"],
    });

    expect(decision).toEqual({ allowed: true });
  });

  it("allows permission-scoped operators without requiring the admin role", async () => {
    const decision = await evaluateAccountAdminAccess(buildUser({
      role: "operator",
      permissions: ["admin.users.pause.write"],
    }), {
      roles: ["admin", "operator"],
      permissions: ["admin.users.pause.write"],
    });

    expect(decision).toEqual({ allowed: true });
  });

  it("enforces root-only routes after role and permission checks pass", async () => {
    const decision = await evaluateAccountAdminAccess(buildUser({
      role: "admin",
      permissions: ["admin.settings.write"],
    }), {
      roles: ["admin"],
      permissions: ["admin.settings.write"],
      rootOnly: true,
    });

    expect(decision).toEqual({ allowed: false, reason: "root_only" });
  });

  it("recognizes the shared platform root email", () => {
    expect(isPlatformRootEmail("admin@svc.plus")).toBe(true);
    expect(isPlatformRootEmail("ADMIN@svc.plus")).toBe(true);
    expect(isPlatformRootEmail("user@example.com")).toBe(false);
  });
});
