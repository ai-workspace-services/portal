import { describe, expect, it } from "vitest";
import { buildAuthHref, safeAuthDestination } from "./auth-navigation";
import { toConsoleHref } from "./consoleNavigation";

describe("referral authentication navigation", () => {
  it("retains the destination and code through registration, login and MFA links", () => {
    const register = new URL(
      toConsoleHref(buildAuthHref("/register", "/referrals", "ab12cd34")),
      "https://website.example",
    );
    expect(register.searchParams.get("returnTo")).toBe("/referrals");
    expect(register.searchParams.get("ref")).toBe("AB12CD34");
    const login = new URL(
      buildAuthHref(
        "/login",
        register.searchParams.get("returnTo"),
        register.searchParams.get("ref"),
        true,
      ),
      register,
    );
    expect(login.searchParams.get("redirect")).toBe("/referrals");
    expect(login.searchParams.get("ref")).toBe("AB12CD34");
    expect(login.searchParams.get("needMfa")).toBe("1");
  });
  it.each([
    "https://attacker.example",
    "//attacker.example",
    "/\\attacker.example",
    "/\n/attacker.example",
    "javascript:alert(1)",
  ])("rejects unsafe destination %j", (value) => {
    expect(safeAuthDestination(value)).toBeNull();
    expect(buildAuthHref("/login", value, "bad")).toBe("/login");
  });
  it("keeps safe local queries and hashes", () => {
    expect(safeAuthDestination("/referrals?tab=cash#history")).toBe(
      "/referrals?tab=cash#history",
    );
  });
});
