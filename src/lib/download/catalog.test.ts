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
});
