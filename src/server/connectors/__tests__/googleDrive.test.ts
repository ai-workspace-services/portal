import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildGoogleOAuthAuthorizeUrl,
  parseCsvMatrix,
  signOAuthStateCookie,
  verifyOAuthStateCookie,
} from "../googleDrive";
import {
  addCustomMcpConnector,
  getSanitizedConfigDocument,
  listSanitizedConnectors,
  parseSpreadsheetLocation,
  resetConnectorsMemoryCache,
  upsertConnectorRecord,
} from "../store";
import {
  buildMergedPushMatrix,
  CANONICAL_SHEET_HEADERS,
  computeBidirectionalDiff,
  formatFeeCellMinor,
  formatQuotaCellBytes,
} from "../subscriptionSheetSync";

describe("Google Drive & Sheets bidirectional sync helpers", () => {
  it("parses spreadsheetId and gid from Google Sheets edit URL", () => {
    const loc = parseSpreadsheetLocation(
      "https://docs.google.com/spreadsheets/d/1V4u9b6MFIJgVuVAb056jidZLSFMiyhJJj9eDSGud1_I/edit?gid=1136257492#gid=1136257492",
    );
    expect(loc.spreadsheetId).toBe(
      "1V4u9b6MFIJgVuVAb056jidZLSFMiyhJJj9eDSGud1_I",
    );
    expect(loc.gid).toBe("1136257492");
  });

  it("builds Google OAuth2 authorization URL with offline access and sheets scopes", () => {
    const url = buildGoogleOAuthAuthorizeUrl(
      {
        clientId: "client-123",
        clientSecret: "secret-xyz",
        redirectUri: "https://console.svc.plus/api/connectors/google-drive/callback",
      },
      "state-abc",
    );
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://accounts.google.com");
    expect(parsed.searchParams.get("client_id")).toBe("client-123");
    expect(parsed.searchParams.get("access_type")).toBe("offline");
    expect(parsed.searchParams.get("scope")).toContain(
      "https://www.googleapis.com/auth/spreadsheets",
    );
    expect(parsed.searchParams.get("state")).toBe("state-abc");
  });

  it("parses RFC-4180 CSV with quoted commas and newlines", () => {
    const matrix = parseCsvMatrix(
      '\uFEFF邮箱,用户名,备注\nalice@example.com,alice,"第一行,含逗号\n第二行"\n',
    );
    expect(matrix).toEqual([
      ["邮箱", "用户名", "备注"],
      ["alice@example.com", "alice", "第一行,含逗号\n第二行"],
    ]);
  });

  it("classifies in_sync, pull_candidate, push_candidate, conflict, and unregistered rows", () => {
    const gib = 1024 ** 3;
    const tib = 1024 ** 4;
    const diff = computeBidirectionalDiff({
      headers: [...CANONICAL_SHEET_HEADERS],
      rows: [
        [
          "synced@example.com",
          "synced",
          "2026-08-01",
          "2027-07-30",
          "plus",
          "year",
          "30GB",
          "360GB",
          "200元",
          "已付费",
          "",
        ],
        [
          "pro-user@example.com",
          "prouser",
          "2026-09-01",
          "2027-08-30",
          "pro",
          "month",
          "30GB",
          "600GB",
          "200元",
          "已付费",
          "12+1赠送一个月",
        ],
        [
          "pull-only@example.com",
          "pulluser",
          "2026-11-02",
          "2026-12-01",
          "custom",
          "month",
          "1TB",
          "",
          "50元",
          "已付费",
          "US 节点专属用户",
        ],
        [
          "unknown@example.com",
          "ghost",
          "2026-01-01",
          "2026-12-31",
          "plus",
          "year",
          "30GB",
          "360GB",
          "200元",
          "已付费",
          "保留未注册行",
        ],
      ],
      registeredUsers: [
        { id: "u1", email: "synced@example.com" },
        { id: "u2", email: "pro-user@example.com" },
        { id: "u3", email: "pull-only@example.com" },
        { id: "u4", email: "push-only@example.com" },
      ],
      systemItems: [
        {
          userId: "u1",
          email: "synced@example.com",
          username: "synced",
          plan: "plus",
          subscriptionType: "year",
          monthlyQuotaBytes: 30 * gib,
          annualQuotaBytes: 360 * gib,
          feeMinor: 20000,
          paymentStatus: "paid",
          validFrom: "2026-08-01T00:00:00Z",
          validUntil: "2027-07-30T00:00:00Z",
          note: "",
        },
        {
          userId: "u2",
          email: "pro-user@example.com",
          username: "prouser",
          plan: "plus",
          subscriptionType: "month",
          monthlyQuotaBytes: 20 * gib,
          annualQuotaBytes: 0,
          feeMinor: 4000,
          paymentStatus: "paid",
          validFrom: "2026-09-01",
          validUntil: "2027-08-30",
          note: "",
        },
        {
          userId: "u4",
          email: "push-only@example.com",
          username: "pushuser",
          plan: "custom",
          subscriptionType: "month",
          monthlyQuotaBytes: tib,
          annualQuotaBytes: 0,
          feeMinor: 8000,
          paymentStatus: "paid",
          validFrom: "2026-11-04",
          validUntil: "2026-12-03",
          note: "",
        },
      ],
    });

    expect(diff.inSyncCount).toBe(1);
    expect(diff.conflictCount).toBe(1);
    expect(diff.pullCandidateCount).toBe(1);
    expect(diff.pushCandidateCount).toBe(1);
    expect(diff.unregisteredCount).toBe(1);
    expect(diff.pullCsv).toContain("pro-user@example.com");
    expect(diff.pullCsv).not.toContain("unknown@example.com");
  });

  it("merges system updates back to sheet matrix while preserving unregistered rows", () => {
    const gib = 1024 ** 3;
    const tib = 1024 ** 4;
    expect(formatQuotaCellBytes(30 * gib)).toBe("30GB");
    expect(formatQuotaCellBytes(tib)).toBe("1TB");
    expect(formatFeeCellMinor(20000)).toBe("200元");

    const merged = buildMergedPushMatrix({
      headers: [...CANONICAL_SHEET_HEADERS],
      rows: [
        [
          "pro-user@example.com",
          "prouser",
          "2026-09-01",
          "2027-08-30",
          "plus",
          "month",
          "20GB",
          "",
          "40元",
          "已付费",
          "",
        ],
        [
          "unregistered@example.com",
          "manual",
          "2026-05-01",
          "2027-05-30",
          "plus",
          "year",
          "30GB",
          "360GB",
          "200元",
          "已付费",
          "keep me",
        ],
      ],
      systemItems: [
        {
          userId: "u2",
          email: "pro-user@example.com",
          username: "prouser",
          plan: "pro",
          subscriptionType: "month",
          monthlyQuotaBytes: 30 * gib,
          annualQuotaBytes: 600 * gib,
          feeMinor: 20000,
          paymentStatus: "paid",
          validFrom: "2026-09-01",
          validUntil: "2027-08-30",
          note: "updated",
        },
        {
          userId: "u4",
          email: "new-db@example.com",
          username: "newdb",
          plan: "custom",
          subscriptionType: "month",
          monthlyQuotaBytes: tib,
          annualQuotaBytes: 0,
          feeMinor: 8000,
          paymentStatus: "paid",
          validFrom: "2026-11-04",
          validUntil: "2026-12-03",
          note: "new row",
        },
      ],
    });

    expect(merged.updatedCount).toBe(1);
    expect(merged.appendedCount).toBe(1);
    expect(merged.preservedUnregisteredCount).toBe(1);
    expect(merged.matrix).toHaveLength(4);
    expect(merged.matrix[1][4]).toBe("pro");
    expect(merged.matrix[1][6]).toBe("30GB");
    expect(merged.matrix[2][0]).toBe("unregistered@example.com");
    expect(merged.matrix[3][0]).toBe("new-db@example.com");
    expect(merged.matrix[3][6]).toBe("1TB");
  });

  it("isolates connector credentials and custom MCPs strictly per user", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "connectors-iso-"));
    const prevPath = process.env.CONNECTORS_STORE_PATH;
    process.env.CONNECTORS_STORE_PATH = path.join(tmpDir, "connectors.json");
    resetConnectorsMemoryCache();

    try {
      await upsertConnectorRecord("user-alice", "google-drive", {
        status: "connected",
        authMode: "oauth2",
        account: "alice@gmail.com",
        accessToken: "alice-secret-token",
        refreshToken: "alice-refresh-token",
      });
      await addCustomMcpConnector("user-alice", {
        name: "Alice Private MCP",
        endpoint: "https://alice-mcp.internal",
        token: "mcp-secret",
      });

      const aliceConnectors = await listSanitizedConnectors("user-alice");
      expect(aliceConnectors["google-drive"]?.status).toBe("connected");
      expect(aliceConnectors["google-drive"]?.account).toBe("alice@gmail.com");
      expect(aliceConnectors["custom-mcp-alice-private-mcp"]?.endpoint).toBe(
        "https://alice-mcp.internal",
      );

      const bobConnectors = await listSanitizedConnectors("user-bob");
      expect(bobConnectors["google-drive"]?.status).toBe("available");
      expect(bobConnectors["google-drive"]?.credentialConfigured).toBe(false);
      expect(bobConnectors["google-drive"]?.account).toBeUndefined();
      expect(bobConnectors["custom-mcp-alice-private-mcp"]).toBeUndefined();

      const bobConfig = await getSanitizedConfigDocument("user-bob");
      expect(bobConfig.ownerId).toBe("user-bob");
      expect(JSON.stringify(bobConfig)).not.toContain("alice-secret-token");
      expect(JSON.stringify(bobConfig)).not.toContain("alice@gmail.com");
    } finally {
      resetConnectorsMemoryCache();
      if (prevPath === undefined) {
        delete process.env.CONNECTORS_STORE_PATH;
      } else {
        process.env.CONNECTORS_STORE_PATH = prevPath;
      }
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("signs and verifies popup OAuth2 state cookies and rejects tampering", () => {
    const signed = signOAuthStateCookie({
      state: "nonce-1",
      userId: "user-alice",
      connectorId: "google-drive",
      returnTo: "/panel/connector",
      mode: "popup",
      issuedAt: Date.now(),
    });
    const verified = verifyOAuthStateCookie(signed);
    expect(verified?.userId).toBe("user-alice");
    expect(verified?.mode).toBe("popup");

    const tampered = `${signed.slice(0, -2)}xx`;
    expect(verifyOAuthStateCookie(tampered)).toBeNull();
  });
});

afterEach(() => {
  resetConnectorsMemoryCache();
});
