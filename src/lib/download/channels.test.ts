import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadDownloadChannelsConfig, signMirrorUrl } from "./channels";
import {
  DEFAULT_DOWNLOAD_CHANNELS_CONFIG,
  inferRegionFromHeaders,
  parseChannelPreference,
  parseMirrorRegion,
  parseReleaseTrack,
  resolvePackageDownloadUrl,
} from "./channels-types";

describe("download channels config & resolution", () => {
  const tempDirs: string[] = [];
  const originalPath = process.env.DOWNLOAD_CHANNELS_CONFIG_PATH;
  const originalJson = process.env.DOWNLOAD_CHANNELS_CONFIG_JSON;

  afterEach(() => {
    process.env.DOWNLOAD_CHANNELS_CONFIG_PATH = originalPath;
    process.env.DOWNLOAD_CHANNELS_CONFIG_JSON = originalJson;
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it("infers cn vs global from CF-IPCountry and Accept-Language", () => {
    expect(inferRegionFromHeaders("CN", "en-US")).toBe("cn");
    expect(inferRegionFromHeaders("US", "zh-CN,zh;q=0.9")).toBe("global");
    expect(inferRegionFromHeaders(undefined, "zh-CN,zh;q=0.9")).toBe("cn");
    expect(inferRegionFromHeaders(undefined, "en-US,en;q=0.9")).toBe("global");
  });

  it("parses query parameter overrides safely", () => {
    expect(parseMirrorRegion("cn")).toBe("cn");
    expect(parseMirrorRegion(["global", "cn"])).toBe("global");
    expect(parseMirrorRegion("jp")).toBeUndefined();
    expect(parseChannelPreference("store")).toBe("store");
    expect(parseChannelPreference("direct")).toBe("direct");
    expect(parseReleaseTrack("stable")).toBe("stable");
    expect(parseReleaseTrack("invalid")).toBeUndefined();
  });

  it("resolves preferred mirror, peer fallback, and GitHub fallback", () => {
    const pkg = {
      path: "/releases/xconnect/v1.0.0/xconnect-windows.msi",
      githubUrl:
        "https://github.com/ai-workspace-xstream/xconnect-app/releases/download/v1.0.0/xconnect-windows.msi",
    };

    expect(
      resolvePackageDownloadUrl(
        pkg,
        "cn",
        DEFAULT_DOWNLOAD_CHANNELS_CONFIG.mirrors,
        { cn: { synced: true }, global: { synced: true } },
      ),
    ).toMatchObject({
      href: "https://cn-dl.svc.plus/releases/xconnect/v1.0.0/xconnect-windows.msi",
      sourceRegion: "cn",
      fallback: false,
    });

    expect(
      resolvePackageDownloadUrl(
        pkg,
        "cn",
        DEFAULT_DOWNLOAD_CHANNELS_CONFIG.mirrors,
        { cn: { synced: false }, global: { synced: true } },
      ),
    ).toMatchObject({
      href: "https://dl.svc.plus/releases/xconnect/v1.0.0/xconnect-windows.msi",
      sourceRegion: "global",
      fallback: true,
    });

    expect(
      resolvePackageDownloadUrl(
        pkg,
        "cn",
        DEFAULT_DOWNLOAD_CHANNELS_CONFIG.mirrors,
        { cn: { synced: false }, global: { synced: false } },
      ),
    ).toMatchObject({
      href: pkg.githubUrl,
      sourceRegion: "github",
      fallback: true,
    });
  });

  it("loads mounted GitOps JSON config and falls back safely when missing", async () => {
    delete process.env.DOWNLOAD_CHANNELS_CONFIG_JSON;
    delete process.env.DOWNLOAD_CHANNELS_CONFIG_PATH;
    expect(await loadDownloadChannelsConfig()).toEqual(
      DEFAULT_DOWNLOAD_CHANNELS_CONFIG,
    );

    const dir = mkdtempSync(path.join(os.tmpdir(), "dl-channels-"));
    tempDirs.push(dir);
    const configPath = path.join(dir, "download-channels.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        schemaVersion: 1,
        mirrors: {
          cn: { baseUrl: "https://cn-dl.svc.plus/", enabled: true },
          global: { baseUrl: "https://dl.svc.plus/", enabled: true },
        },
        products: {
          xconnect: {
            stores: {
              ios: [
                {
                  id: "testflight",
                  name: "TestFlight",
                  nameZh: "TestFlight",
                  status: "testflight",
                  url: "https://testflight.apple.com/join/example",
                  availableInCn: true,
                },
              ],
            },
          },
        },
      }),
      "utf8",
    );

    process.env.DOWNLOAD_CHANNELS_CONFIG_PATH = configPath;
    const loaded = await loadDownloadChannelsConfig();
    expect(loaded.mirrors.cn.baseUrl).toBe("https://cn-dl.svc.plus");
    expect(loaded.products.xconnect.matrixPath).toBe(
      "/releases/xconnect/release-matrix.json",
    );
    expect(loaded.products.xconnect.stores?.ios?.[0]).toMatchObject({
      status: "testflight",
      url: "https://testflight.apple.com/join/example",
    });

    expect(
      signMirrorUrl(
        "https://cn-dl.svc.plus/releases/xconnect/v1/x.dmg",
        loaded.mirrors.cn,
      ),
    ).toBe("https://cn-dl.svc.plus/releases/xconnect/v1/x.dmg");
  });
});
