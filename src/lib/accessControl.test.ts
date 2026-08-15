import { describe, expect, it } from "vitest";

import { resolveAccess, resolveEffectiveRole } from "@lib/accessControl";
import type { User, UserRole } from "@lib/userStore";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u-1",
    uuid: "u-1",
    proxyUuid: "proxy-u-1",
    email: "someone@example.com",
    username: "someone",
    mfaEnabled: false,
    mfaPending: false,
    emailVerified: true,
    passwordSet: true,
    role: "user" as UserRole,
    groups: [],
    permissions: [],
    isUser: true,
    isOperator: false,
    isAdmin: false,
    isReadOnly: false,
    ...overrides,
  };
}

// 管理台路由的实际门禁，见
// modules/extensions/builtin/user-center/index.ts 的 /panel/management。
const MANAGEMENT_RULE = {
  requireLogin: true,
  roles: ["admin", "operator"] as UserRole[],
  permissions: [
    "admin.settings.read",
    "admin.users.metrics.read",
    "admin.users.list.read",
    "admin.agents.status.read",
    "admin.blacklist.read",
  ],
};

const OPS_RULE = {
  requireLogin: true,
  roles: ["admin", "operator"] as UserRole[],
};

describe("accessControl", () => {
  it("blocks unauthenticated access when login is required", () => {
    expect(
      resolveAccess(null, {
        requireLogin: true,
      }),
    ).toMatchObject({
      allowed: false,
      reason: "unauthenticated",
    });
  });

  it("allows anonymous access only when guests are explicitly allowed", () => {
    expect(
      resolveAccess(null, {
        allowGuests: true,
      }),
    ).toMatchObject({
      allowed: true,
    });
  });

  describe("group-based role inheritance", () => {
    it("promotes a plain user in the admin group", () => {
      expect(resolveEffectiveRole("user", ["Admin"])).toBe("admin");
    });

    it("matches group names case- and whitespace-insensitively", () => {
      expect(resolveEffectiveRole("user", ["  OPERATOR  "])).toBe("operator");
    });

    it("treats root as admin, consistent with userStore normalization", () => {
      expect(resolveEffectiveRole("user", ["root"])).toBe("admin");
    });

    it("keeps the strongest role when several apply", () => {
      expect(resolveEffectiveRole("user", ["operator", "admin"])).toBe("admin");
    });

    it("never demotes: an admin stays admin in an operator group", () => {
      expect(resolveEffectiveRole("admin", ["operator"])).toBe("admin");
    });

    it("ignores unrelated groups", () => {
      expect(resolveEffectiveRole("user", ["segment:beta", "readonly"])).toBe(
        "user",
      );
    });
  });

  describe("/panel/management gate", () => {
    it("admits an operator by role alone, without any permissions", () => {
      expect(
        resolveAccess(makeUser({ role: "operator" }), MANAGEMENT_RULE),
      ).toMatchObject({ allowed: true });
    });

    it("admits a user who only inherits admin via group membership", () => {
      expect(
        resolveAccess(
          makeUser({ role: "user", groups: ["admin"] }),
          MANAGEMENT_RULE,
        ),
      ).toMatchObject({ allowed: true });
    });

    // 这是 admin@svc.plus 的真实形态：后端 role 是 root，userStore 归一化
    // 成 admin，permissions 是 ["*"]。两条路各自都足以放行。
    it("admits the root account (normalized to admin, wildcard permission)", () => {
      expect(
        resolveAccess(
          makeUser({ role: "admin", permissions: ["*"] }),
          MANAGEMENT_RULE,
        ),
      ).toMatchObject({ allowed: true });
    });

    it("rejects a plain user with no role, group or permission", () => {
      expect(resolveAccess(makeUser(), MANAGEMENT_RULE)).toMatchObject({
        allowed: false,
        reason: "forbidden",
      });
    });

    it("rejects a user whose groups carry no privilege", () => {
      expect(
        resolveAccess(
          makeUser({ groups: ["segment:subscribed"] }),
          MANAGEMENT_RULE,
        ),
      ).toMatchObject({ allowed: false, reason: "forbidden" });
    });
  });

  describe("/panel/ops gate", () => {
    it("admits root, admin, and operator roles", () => {
      expect(
        resolveAccess(makeUser({ role: "admin" }), OPS_RULE),
      ).toMatchObject({
        allowed: true,
      });
      expect(
        resolveAccess(makeUser({ role: "operator" }), OPS_RULE),
      ).toMatchObject({
        allowed: true,
      });
    });

    it("admits a root group inherited by the session user", () => {
      expect(
        resolveAccess(makeUser({ groups: ["root"] }), OPS_RULE),
      ).toMatchObject({ allowed: true });
    });

    it("rejects ordinary users", () => {
      expect(resolveAccess(makeUser(), OPS_RULE)).toMatchObject({
        allowed: false,
        reason: "forbidden",
      });
    });
  });
});
