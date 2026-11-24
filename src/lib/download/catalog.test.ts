import { describe, expect, it } from "vitest";

import { buildDownloadCatalog } from "./catalog";
import { DEFAULT_DOWNLOAD_CHANNELS_CONFIG } from "./channels-types";
import type { DirListing } from "./types";

describe("buildDownloadCatalog", () => {
  it("maps mirrored packages to their product and platform cards", () => {
    const listings: DirListing[] = [
      {
        path: "releases/xconnect/windows/",
        entries: [
          {
            name: "xconnect-windows-x64.msi",
            href: "/releases/xconnect/windows/xconnect-windows-x64.msi",
            type: "file",
            lastModified: "2026-08-10T00:00:00.000Z",
          },
        ],
      },
      {
        path: "offline-package/ai-workspace/offline-ai-workspace-42/",
        entries: [
          {
            name: "ai-workspace-all-in-one-offline-ubuntu-24.04-arm64.tar.gz",
            href: "/offline-package/ai-workspace/offline-ai-workspace-42/ai-workspace-all-in-one-offline-ubuntu-24.04-arm64.tar.gz",
            type: "file",
            lastModified: "2026-08-11T00:00:00.000Z",
          },
        ],
      },
      {
        path: "offline-package/sealos/offline-sealos-7/",
        entries: [
          {
            name: "sealos-offline-package-amd64.tar.gz",
            href: "/offline-package/sealos/offline-sealos-7/sealos-offline-package-amd64.tar.gz",
            type: "file",
            lastModified: "2026-08-09T00:00:00.000Z",
          },
        ],
      },
    ];

    const catalog = buildDownloadCatalog(listings);

    expect(
      catalog
        .find((product) => product.id === "xconnect-app")
        ?.platforms.find((platform) => platform.id === "windows")?.asset?.href,
    ).toBe(
      "https://dl.svc.plus/releases/xconnect/windows/xconnect-windows-x64.msi",
    );
    expect(
      catalog
        .find((product) => product.id === "open-platform-solutions")
        ?.docsUrl,
    ).toBe("https://console.svc.plus/docs/");
    expect(
      catalog
        .find((product) => product.id === "open-platform-solutions")
        ?.platforms.find((platform) => platform.id === "linux")?.asset?.name,
    ).toBe("sealos-offline-package-amd64.tar.gz");
  });

  it("does not manufacture a package for an unsupported platform", () => {
    const catalog = buildDownloadCatalog([]);
    const openPlatform = catalog.find(
      (product) => product.id === "open-platform-solutions",
    );

    expect(
      openPlatform?.platforms.find((platform) => platform.id === "windows"),
    ).toMatchObject({ supported: false, asset: undefined });
  });

  it("prefers the direct GitHub Release asset over the mirror", () => {
    const catalog = buildDownloadCatalog([
      {
        path: "github-release/xworkmate/v1.2.0-build.851/",
        entries: [
          {
            name: "XWorkmate-1.2.0.dmg",
            href: "https://github.com/ai-workspace-lab/xworkmate-app/releases/download/v1.2.0-build.851/XWorkmate-1.2.0.dmg",
            type: "file",
            lastModified: "2026-08-12T01:08:34.000Z",
          },
        ],
      },
      {
        path: "releases/xworkmate/macos/",
        entries: [
          {
            name: "XWorkmate-1.1.0.dmg",
            href: "/releases/xworkmate/macos/XWorkmate-1.1.0.dmg",
            type: "file",
            lastModified: "2026-09-01T00:00:00.000Z",
          },
        ],
      },
    ]);

    expect(
      catalog
        .find((product) => product.id === "xworkmate-app")
        ?.platforms.find((platform) => platform.id === "macos")?.asset,
    ).toMatchObject({
      name: "XWorkmate-1.2.0.dmg",
      href: "https://github.com/ai-workspace-lab/xworkmate-app/releases/download/v1.2.0-build.851/XWorkmate-1.2.0.dmg",
      source: "github-release",
    });
  });

  it("excludes internal/store artifacts and prevents cross-OS zip collisions", () => {
    const catalog = buildDownloadCatalog([
      {
        path: "github-release/xconnect/latest-43702841981-33947f3/",
        entries: [
          {
            name: "app-release.aab",
            href: "https://github.com/ai-workspace-xstream/xconnect-app/releases/download/latest-43702841981-33947f3/app-release.aab",
            type: "file",
            lastModified: "2026-11-15T10:29:28Z",
          },
          {
            name: "xconnect.app.zip",
            href: "https://github.com/ai-workspace-xstream/xconnect-app/releases/download/latest-43702841981-33947f3/xconnect.app.zip",
            type: "file",
            lastModified: "2026-11-15T10:29:28Z",
          },
          {
            name: "xconnect-linux.zip",
            href: "https://github.com/ai-workspace-xstream/xconnect-app/releases/download/latest-43702841981-33947f3/xconnect-linux.zip",
            type: "file",
            lastModified: "2026-11-15T10:29:28Z",
          },
          {
            name: "xconnect-latest-33947f3.dmg",
            href: "https://github.com/ai-workspace-xstream/xconnect-app/releases/download/latest-43702841981-33947f3/xconnect-latest-33947f3.dmg",
            type: "file",
            lastModified: "2026-11-15T10:29:28Z",
          },
          {
            name: "xconnect.dmg",
            href: "https://github.com/ai-workspace-xstream/xconnect-app/releases/download/latest-43702841981-33947f3/xconnect.dmg",
            type: "file",
            lastModified: "2026-11-15T10:29:28Z",
          },
        ],
      },
    ]);

    const xconnect = catalog.find((product) => product.id === "xconnect-app");
    expect(
      xconnect?.platforms.find((platform) => platform.id === "windows")?.asset,
    ).toBeUndefined();
    expect(
      xconnect?.platforms.find((platform) => platform.id === "android")?.asset,
    ).toBeUndefined();
    expect(
      xconnect?.platforms.find((platform) => platform.id === "ios")?.asset,
    ).toBeUndefined();
    expect(
      xconnect?.platforms.find((platform) => platform.id === "macos")?.asset
        ?.name,
    ).toBe("xconnect.dmg");
    expect(
      xconnect?.platforms.find((platform) => platform.id === "linux")?.asset
        ?.name,
    ).toBe("xconnect-linux.zip");
  });

  it("attaches CI releaseMatrix and GitOps store slots onto xconnect", () => {
    const catalog = buildDownloadCatalog([], {
      channelsConfig: DEFAULT_DOWNLOAD_CHANNELS_CONFIG,
      releaseMatrices: {
        xconnect: {
          fetchedFrom: "cn",
          matrix: {
            schemaVersion: 1,
            product: "xconnect",
            defaultChannel: "latest",
            channels: {
              latest: {
                tag: "latest-1-abc",
                version: "1.0.0",
                channel: "latest",
                platforms: [],
              },
            },
            history: [],
          },
        },
      },
    });

    const xconnect = catalog.find((product) => product.id === "xconnect-app");
    expect(xconnect?.matrixFetchedFrom).toBe("cn");
    expect(xconnect?.releaseMatrix?.channels.latest?.tag).toBe("latest-1-abc");
    expect(xconnect?.stores?.ios?.map((s) => s.id)).toEqual([
      "app-store",
      "testflight",
    ]);
  });
});
