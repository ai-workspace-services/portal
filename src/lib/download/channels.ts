import "server-only";

import { readFile } from "node:fs/promises";

import {
  DEFAULT_DOWNLOAD_CHANNELS_CONFIG,
  mergeDownloadChannelsConfig,
  type DownloadChannelsConfig,
  type MirrorConfig,
} from "./channels-types";

export async function loadDownloadChannelsConfig(): Promise<DownloadChannelsConfig> {
  const inlineJson = process.env.DOWNLOAD_CHANNELS_CONFIG_JSON?.trim();
  if (inlineJson) {
    try {
      return mergeDownloadChannelsConfig(JSON.parse(inlineJson));
    } catch (error) {
      console.warn(
        "Failed to parse DOWNLOAD_CHANNELS_CONFIG_JSON, using defaults:",
        error,
      );
      return DEFAULT_DOWNLOAD_CHANNELS_CONFIG;
    }
  }

  const configPath = process.env.DOWNLOAD_CHANNELS_CONFIG_PATH?.trim();
  if (!configPath) {
    return DEFAULT_DOWNLOAD_CHANNELS_CONFIG;
  }

  try {
    const content = await readFile(configPath, "utf8");
    return mergeDownloadChannelsConfig(JSON.parse(content));
  } catch (error) {
    console.warn(
      `Unable to load DOWNLOAD_CHANNELS_CONFIG_PATH (${configPath}), using defaults:`,
      error,
    );
    return DEFAULT_DOWNLOAD_CHANNELS_CONFIG;
  }
}

/**
 * Reserved extension point for future Aliyun CDN Type-A short-lived URL signing.
 * Phase 1 uses public-read + CDN bandwidth cap, so URLs pass through unchanged.
 */
export function signMirrorUrl(url: string, _mirror: MirrorConfig): string {
  return url;
}
