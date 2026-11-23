import { describe, expect, it, vi } from "vitest";

import { DEFAULT_DOWNLOAD_CHANNELS_CONFIG } from "./channels-types";
import {
  fetchProductReleaseMatrix,
  parseReleaseMatrixDocument,
} from "./release-matrix";

const SAMPLE_MATRIX = {
  schemaVersion: 1,
  product: "xconnect",
  generatedAt: "2026-11-23T07:35:00Z",
  defaultChannel: "latest",
  channels: {
    stable: null,
    latest: {
      tag: "latest-43702841981-33947f3",
      version: "1.0.0",
      buildNumber: "1",
      msiVersion: "1.0.1",
      channel: "latest",
      commitSha: "33947f3",
      publishedAt: "2026-11-15T10:29:28Z",
      mirrors: { cn: { synced: true }, global: { synced: true } },
      platforms: [
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
              sha256: "abc123",
              primary: true,
              audience: "end_user",
            },
          ],
        },
      ],
    },
  },
  history: [
    {
      tag: "latest-43702841981-33947f3",
      version: "1.0.0",
      channel: "latest",
      matrixPath: "/releases/xconnect/latest-43702841981-33947f3/matrix.json",
    },
  ],
};

describe("release-matrix loader", () => {
  it("parses valid matrix and rejects malformed documents", () => {
    expect(parseReleaseMatrixDocument(SAMPLE_MATRIX)?.product).toBe("xconnect");
    expect(parseReleaseMatrixDocument({ schemaVersion: 2 })).toBeUndefined();
    expect(
      parseReleaseMatrixDocument({
        schemaVersion: 1,
        product: "xconnect",
        channels: { stable: null, latest: null },
      }),
    ).toBeUndefined();
  });

  it("fetches preferred mirror first and fails over to peer mirror", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("cn timeout"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(SAMPLE_MATRIX), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    const result = await fetchProductReleaseMatrix(
      "xconnect",
      DEFAULT_DOWNLOAD_CHANNELS_CONFIG,
      "cn",
      fetchMock,
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://cn-dl.svc.plus/releases/xconnect/release-matrix.json",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://dl.svc.plus/releases/xconnect/release-matrix.json",
      expect.any(Object),
    );
    expect(result?.fetchedFrom).toBe("global");
    expect(result?.matrix.channels.latest?.tag).toBe(
      "latest-43702841981-33947f3",
    );
  });

  it("returns undefined when all mirrors fail", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("not found", { status: 404 }));

    const result = await fetchProductReleaseMatrix(
      "xconnect",
      DEFAULT_DOWNLOAD_CHANNELS_CONFIG,
      "global",
      fetchMock,
    );

    expect(result).toBeUndefined();
  });
});
