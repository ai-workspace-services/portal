import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { bffBoundaryForRoute } from "./ssr-bff-boundaries.mjs";

test("Zero catch-all is bundled in Console, not auth/public or excluded", async () => {
  const route = "api/xconnect-zero/[...segments]/route.ts";
  assert.equal(bffBoundaryForRoute(route), "console");
  const source = await readFile(
    new URL(`../src/app/${route}`, import.meta.url),
    "utf8",
  );
  for (const endpoint of [
    "GET overview",
    "GET networks",
    "GET devices",
    "GET invites",
    "POST invites",
    "POST networks/bootstrap",
  ]) {
    assert.ok(source.includes(endpoint), endpoint);
  }
  const builder = await readFile(
    new URL("./build-open-next-boundary.mjs", import.meta.url),
    "utf8",
  );
  assert.match(builder, /bffBoundaryForRoute\(relativePath\)/);
  assert.match(builder, /return id === bffBoundary/);
});

test("existing auth and Console BFF boundaries are preserved", () => {
  for (const path of [
    "api/auth/session/route.ts",
    "api/auth/token/exchange/route.ts",
    "api/auth/mfa/verify/route.ts",
  ]) {
    assert.equal(bffBoundaryForRoute(path), "auth");
  }
  for (const prefix of ["agent", "agent-server", "account"]) {
    assert.equal(
      bffBoundaryForRoute(`api/${prefix}/[...segments]/route.ts`),
      "console",
    );
  }
});

test("no generic API or similar prefix gains a BFF handler", () => {
  for (const path of [
    "api/xconnect-zero-evil/[...segments]/route.ts",
    "api/overlay/v1/route.ts",
    "api/auth/login/route.ts",
    "panel/xconnect-zero/page.tsx",
  ]) {
    assert.equal(bffBoundaryForRoute(path), undefined);
  }
});
