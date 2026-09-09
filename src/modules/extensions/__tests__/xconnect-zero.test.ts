import { afterEach, describe, expect, it } from "vitest";

import {
  getExtensionRegistry,
  resetExtensionRegistryCache,
  resolveExtensionRouteComponent,
} from "@extensions/loader";

const FLAG = "NEXT_PUBLIC_FEATURE_XCONNECT_ZERO_MODULE";

afterEach(() => {
  delete process.env[FLAG];
  resetExtensionRegistryCache();
});

describe("XConnect Zero extension", () => {
  it("is visible by default for signed-in user accounts", () => {
    delete process.env[FLAG];
    resetExtensionRegistryCache();

    expect(
      getExtensionRegistry().getRoute("/panel/xconnect-zero")?.enabled,
    ).toBe(true);
  });

  it("loads the protected panel when explicitly enabled", async () => {
    process.env[FLAG] = "1";
    resetExtensionRegistryCache();

    const route = getExtensionRegistry().getRoute("/panel/xconnect-zero");
    expect(route?.enabled).toBe(true);
    expect(route?.guard).toEqual({
      requireLogin: true,
      roles: ["admin", "operator", "user"],
      permissions: ["xconnect.zero.read"],
    });
    await expect(
      resolveExtensionRouteComponent("/panel/xconnect-zero"),
    ).resolves.toBeTypeOf("function");
  });
});
