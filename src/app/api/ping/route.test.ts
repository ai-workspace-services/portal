// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@server/runtime-loader", () => ({
  loadRuntimeConfig: () => ({ environment: "uat" }),
}));

describe("digest-pinned runtime release identity", () => {
  const source = "ad300746da5e4c0cdc0e2b3c1f550919500405f2";
  afterEach(() => vi.unstubAllEnvs());

  it("reports the source tag and commit while retaining the immutable digest", async () => {
    const ref = `ghcr.io/ai-workspace-services/console:sha-${source}@sha256:${"a".repeat(64)}`;
    vi.stubEnv("FRONTEND_IMAGE", ref);
    const { GET } = await import("./route");
    const response = await GET(new Request("https://console-selfhost-uat.onwalk.net/api/ping"));
    expect(await response.json()).toMatchObject({ releaseImageRef:ref, releaseImageTag:`sha-${source}`, releaseCommit:source });
  });

  it("does not mistake a bare digest for a source tag", async () => {
    vi.stubEnv("FRONTEND_IMAGE", `ghcr.io/ai-workspace-services/console@sha256:${"a".repeat(64)}`);
    const { GET } = await import("./route");
    const response = await GET(new Request("https://console-selfhost-uat.onwalk.net/api/ping"));
    expect(await response.json()).toMatchObject({ releaseImageTag:null, releaseCommit:null });
  });
});
