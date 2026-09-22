import { describe, expect, it } from "vitest";

import { buildDownloadCatalog } from "./catalog";
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
        .find((product) => product.id === "xconnect")
        ?.platforms.find((platform) => platform.id === "windows")?.asset?.href,
    ).toBe(
      "https://dl.svc.plus/releases/xconnect/windows/xconnect-windows-x64.msi",
    );
    expect(
      catalog
        .find((product) => product.id === "ai-workspace-offline")
        ?.platforms.find((platform) => platform.id === "linux")?.asset?.name,
    ).toBe("ai-workspace-all-in-one-offline-ubuntu-24.04-arm64.tar.gz");
    expect(
      catalog
        .find((product) => product.id === "open-platform-offline")
        ?.platforms.find((platform) => platform.id === "linux")?.asset?.name,
    ).toBe("sealos-offline-package-amd64.tar.gz");
  });

  it("does not manufacture a package for an unsupported platform", () => {
    const catalog = buildDownloadCatalog([]);
    const aiWorkspace = catalog.find(
      (product) => product.id === "ai-workspace-offline",
    );

    expect(
      aiWorkspace?.platforms.find((platform) => platform.id === "windows"),
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
        .find((product) => product.id === "xworkmate")
        ?.platforms.find((platform) => platform.id === "macos")?.asset,
    ).toMatchObject({
      name: "XWorkmate-1.2.0.dmg",
      href: "https://github.com/ai-workspace-lab/xworkmate-app/releases/download/v1.2.0-build.851/XWorkmate-1.2.0.dmg",
      source: "github-release",
    });
  });
});
