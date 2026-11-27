import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GoogleSheetsSyncCard } from "../components/GoogleSheetsSyncCard";

describe("GoogleSheetsSyncCard", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("diffs sheet vs Accounts and triggers Pull import preview & Push apply", async () => {
    const diffResponse = {
      spreadsheetUrl:
        "https://docs.google.com/spreadsheets/d/1V4u9b6MFIJgVuVAb056jidZLSFMiyhJJj9eDSGud1_I/edit?gid=1136257492#gid=1136257492",
      spreadsheetId: "1V4u9b6MFIJgVuVAb056jidZLSFMiyhJJj9eDSGud1_I",
      gid: "1136257492",
      sheetTitle: "订阅用户",
      authMode: "oauth2",
      writable: true,
      account: "ops@svc.plus",
      diff: {
        totalSheetRows: 14,
        totalSystemRecords: 13,
        inSyncCount: 11,
        pullCandidateCount: 1,
        pushCandidateCount: 1,
        conflictCount: 1,
        unregisteredCount: 0,
        pullCsv: "邮箱,套餐\nmember@example.com,pro",
        rows: [
          {
            email: "member@example.com",
            status: "conflict",
            sheetRowNumber: 12,
            differences: [
              {
                field: "plan",
                label: "套餐",
                sheetValue: "pro",
                systemValue: "plus",
              },
            ],
          },
        ],
      },
    };

    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/connectors") {
        return new Response(
          JSON.stringify({
            "google-drive": {
              status: "connected",
              writable: true,
              account: "ops@svc.plus",
              spreadsheetUrl: diffResponse.spreadsheetUrl,
            },
          }),
          { status: 200 },
        );
      }
      if (url === "/api/connectors/google-drive/sheets/diff") {
        return new Response(JSON.stringify(diffResponse), { status: 200 });
      }
      if (url === "/api/connectors/google-drive/sheets/push") {
        const body = JSON.parse(String(init?.body || "{}"));
        if (body.mode === "preview") {
          return new Response(
            JSON.stringify({
              mode: "preview",
              writable: true,
              sheetTitle: "订阅用户",
              updatedCount: 1,
              appendedCount: 1,
              preservedUnregisteredCount: 0,
              totalOutputRows: 14,
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            mode: "apply",
            sheetTitle: "订阅用户",
            updatedCount: 1,
            appendedCount: 1,
            preservedUnregisteredCount: 0,
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const onImport = vi.fn(async () => ({
      requestId: "req-1",
      previewToken: "tok-1",
      expiresAt: "2030-01-01",
      changes: [],
    }));
    const onShowPreview = vi.fn();

    render(
      <GoogleSheetsSyncCard
        onSubscriptionRecordsImport={onImport}
        onShowImportPreview={onShowPreview}
      />,
    );

    expect(
      await screen.findByText(/Google OAuth2 可读写/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "双向比对" }));
    expect(await screen.findByText("member@example.com")).toBeInTheDocument();
    expect(screen.getByText(/套餐: 表\(pro\) vs 库\(plus\)/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /从表格拉取/ }));
    await waitFor(() =>
      expect(onImport).toHaveBeenCalledWith(
        "邮箱,套餐\nmember@example.com,pro",
        expect.stringContaining("Google Sheets"),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: /回写到表格/ }));
    expect(await screen.findByText(/回写预览/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认写回表格" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/connectors/google-drive/sheets/push",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"apply"'),
        }),
      ),
    );
  });
});
