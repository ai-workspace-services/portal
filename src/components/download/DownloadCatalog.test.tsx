import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));

import { buildDownloadCatalog } from "@lib/download/catalog";
import { DEFAULT_DOWNLOAD_CHANNELS_CONFIG } from "@lib/download/channels-types";
import DownloadCatalog from "./DownloadCatalog";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/download?product=xconnect");
});

function buildSampleCatalog() {
  return buildDownloadCatalog([], {
    channelsConfig: DEFAULT_DOWNLOAD_CHANNELS_CONFIG,
    releaseMatrices: {
      xconnect: {
        fetchedFrom: "cn",
        matrix: {
          schemaVersion: 1,
          product: "xconnect",
          defaultChannel: "latest",
          channels: {
            stable: {
              tag: "v1.0.0",
              version: "1.0.0",
              channel: "stable",
              commitSha: "aaaa111",
              publishedAt: "2026-11-20T00:00:00Z",
              mirrors: { cn: { synced: true }, global: { synced: true } },
              platforms: [
                {
                  id: "macos",
                  label: "macOS",
                  labelZh: "macOS",
                  arch: "arm64",
                  supportStatus: "supported",
                  packages: [
                    {
                      name: "xconnect.dmg",
                      format: "dmg",
                      arch: "arm64",
                      path: "/releases/xconnect/v1.0.0/xconnect.dmg",
                      size: 36801009,
                      sha256: "stable-dmg-sha",
                      primary: true,
                      audience: "end_user",
                    },
                  ],
                },
              ],
            },
            latest: {
              tag: "latest-43702841981-33947f3",
              version: "1.0.0",
              channel: "latest",
              commitSha: "33947f3",
              publishedAt: "2026-11-15T10:29:28Z",
              mirrors: { cn: { synced: true }, global: { synced: true } },
              platforms: [
                {
                  id: "macos",
                  label: "macOS",
                  labelZh: "macOS",
                  arch: "arm64",
                  supportStatus: "supported",
                  packages: [
                    {
                      name: "xconnect.dmg",
                      format: "dmg",
                      arch: "arm64",
                      path: "/releases/xconnect/latest-43702841981-33947f3/xconnect.dmg",
                      size: 36801009,
                      sha256: "latest-dmg-sha",
                      primary: true,
                      audience: "end_user",
                    },
                  ],
                },
                {
                  id: "windows",
                  label: "Windows",
                  labelZh: "Windows",
                  arch: "x64",
                  supportStatus: "supported",
                  packages: [
                    {
                      name: "xconnect-windows.msi",
                      format: "msi",
                      arch: "x64",
                      path: "/releases/xconnect/latest-43702841981-33947f3/xconnect-windows.msi",
                      size: 91004928,
                      sha256: "win-msi-sha",
                      primary: true,
                      audience: "end_user",
                    },
                    {
                      name: "xconnect-windows.zip",
                      format: "zip",
                      arch: "x64",
                      path: "/releases/xconnect/latest-43702841981-33947f3/xconnect-windows.zip",
                      size: 49922449,
                      sha256: "win-zip-sha",
                      primary: false,
                      audience: "end_user",
                    },
                  ],
                },
                {
                  id: "ios",
                  label: "iOS",
                  labelZh: "iOS",
                  arch: "arm64",
                  supportStatus: "supported",
                  packages: [
                    {
                      name: "xconnect.ipa",
                      format: "ipa",
                      arch: "arm64",
                      path: "/releases/xconnect/latest-43702841981-33947f3/xconnect.ipa",
                      size: 22107195,
                      sha256: "ios-ipa-sha",
                      primary: false,
                      audience: "sideload",
                    },
                  ],
                },
              ],
            },
          },
          history: [
            {
              tag: "v1.0.0",
              version: "1.0.0",
              channel: "stable",
              matrixPath: "/releases/xconnect/v1.0.0/matrix.json",
            },
            {
              tag: "latest-43702841981-33947f3",
              version: "1.0.0",
              channel: "latest",
              matrixPath: "/releases/xconnect/latest-43702841981-33947f3/matrix.json",
            },
          ],
        },
      },
    },
  }).filter((p) => p.id === "xconnect");
}

describe("DownloadCatalog pure-presentation UI", () => {
  it("switches CN OSS vs Global R2 mirrors, format pills, store slots, and track channels", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
    );
    const catalog = buildSampleCatalog();

    render(
      <DownloadCatalog
        catalog={catalog}
        mirrors={DEFAULT_DOWNLOAD_CHANNELS_CONFIG.mirrors}
        initialRegion="cn"
        initialChannel="direct"
        initialTrack="latest"
      />,
    );

    const primaryDownload = screen.getByRole("link", {
      name: /下载 macOS 安装包/,
    });
    expect(primaryDownload).toHaveAttribute(
      "href",
      "https://cn-dl.svc.plus/releases/xconnect/latest-43702841981-33947f3/xconnect.dmg",
    );

    // Switch Windows format from .msi to .zip
    fireEvent.click(screen.getByRole("button", { name: ".zip" }));
    const windowsLinks = screen.getAllByRole("link", { name: "下载" });
    expect(windowsLinks[0]).toHaveAttribute(
      "href",
      "https://cn-dl.svc.plus/releases/xconnect/latest-43702841981-33947f3/xconnect-windows.zip",
    );

    // Switch to Global R2 mirror
    fireEvent.click(screen.getByRole("button", { name: /全球 \/ 海外 · R2/ }));
    expect(primaryDownload).toHaveAttribute(
      "href",
      "https://dl.svc.plus/releases/xconnect/latest-43702841981-33947f3/xconnect.dmg",
    );

    // Switch to App Store channel -> shows coming_soon slots without removing mirror fallback
    fireEvent.click(screen.getByRole("button", { name: /可使用应用商店/ }));
    expect(screen.getAllByText(/暂未上架 · 敬请期待/).length).toBeGreaterThan(0);

    // Switch to Stable track
    fireEvent.click(screen.getByRole("button", { name: "稳定版" }));
    expect(
      screen.getByRole("link", { name: /先用镜像直装/ }),
    ).toHaveAttribute(
      "href",
      "https://dl.svc.plus/releases/xconnect/v1.0.0/xconnect.dmg",
    );

    // Back to Latest track and verify iOS .ipa is folded into advanced sideload section
    fireEvent.click(screen.getByRole("button", { name: "最新构建" }));
    expect(screen.getByText(/高级用户：下载侧载包/)).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
