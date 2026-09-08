import { afterEach, describe, expect, it } from "vitest";

import {
  getExtensionRegistry,
  resetExtensionRegistryCache,
  resolveExtensionRouteComponent,
} from "@extensions/loader";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_FEATURE_PLATFORM_OPERATIONS_MODULE;
  resetExtensionRegistryCache();
});

describe("Platform Operations extension", () => {
  it("registers the overview and operational sub-routes", () => {
    const registry = getExtensionRegistry();

    expect(registry.getRoute("/panel/operations")?.enabled).toBe(true);
    expect(registry.getRoute("/panel/operations/releases")?.enabled).toBe(true);
    expect(registry.getRoute("/panel/operations/vault-access")?.guard).toEqual({
      requireLogin: true,
      tenantScoped: true,
      roles: ["admin", "operator"],
      permissions: ["platform.ops.read"],
      groups: ["platform-ops", "platform-operations"],
    });
  });

  it("loads the overview route without exposing credential inputs", async () => {
    await expect(
      resolveExtensionRouteComponent("/panel/operations"),
    ).resolves.toBeTypeOf("function");
  });
});
