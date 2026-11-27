import { NextRequest, NextResponse } from "next/server";

import { isOperationsUser } from "@server/account/adminAccess";
import { getAccountSession } from "@server/account/session";
import { fetchAccountsSubscriptionContext } from "@server/connectors/accountsClient";
import {
  readGoogleSheet,
  writeGoogleSheet,
} from "@server/connectors/googleDrive";
import { upsertConnectorRecord } from "@server/connectors/store";
import { buildMergedPushMatrix } from "@server/connectors/subscriptionSheetSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getAccountSession(request);
  if (!session.user || !session.token) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }
  if (!isOperationsUser(session.user)) {
    return NextResponse.json(
      { message: "需要管理员或运营权限" },
      { status: 403 },
    );
  }

  const userId = session.user.uuid || session.user.id;
  const body = (await request.json().catch(() => ({}))) as {
    mode?: "preview" | "apply";
    spreadsheetUrl?: string;
    emails?: string[];
  };
  const mode = body.mode === "apply" ? "apply" : "preview";

  try {
    const [sheet, accountsCtx] = await Promise.all([
      readGoogleSheet({
        userId,
        origin: request.nextUrl.origin,
        spreadsheetUrl: body.spreadsheetUrl,
      }),
      fetchAccountsSubscriptionContext(session),
    ]);

    const merged = buildMergedPushMatrix({
      headers: sheet.headers,
      rows: sheet.rows,
      systemItems: accountsCtx.items,
      targetEmails: body.emails,
    });

    if (mode === "preview") {
      return NextResponse.json({
        mode: "preview",
        writable: sheet.writable,
        authMode: sheet.authMode,
        sheetTitle: sheet.sheetTitle,
        spreadsheetId: sheet.spreadsheetId,
        gid: sheet.gid,
        updatedCount: merged.updatedCount,
        appendedCount: merged.appendedCount,
        preservedUnregisteredCount: merged.preservedUnregisteredCount,
        totalOutputRows: merged.matrix.length - 1,
        previewRows: merged.matrix.slice(1, 20),
      });
    }

    const writeResult = await writeGoogleSheet({
      userId,
      origin: request.nextUrl.origin,
      spreadsheetUrl: sheet.spreadsheetUrl,
      matrix: merged.matrix,
    });

    const syncedAt = new Date().toISOString();
    await upsertConnectorRecord(userId, "google-drive", {
      status: "connected",
      lastSyncedAt: syncedAt,
      spreadsheetUrl: sheet.spreadsheetUrl,
      spreadsheetId: writeResult.spreadsheetId,
      gid: writeResult.gid,
      sheetTitle: writeResult.sheetTitle,
      statusDetail: `已写回「${writeResult.sheetTitle}」：更新 ${merged.updatedCount} 行，新增 ${merged.appendedCount} 行`,
    });

    return NextResponse.json({
      mode: "apply",
      ...writeResult,
      updatedCount: merged.updatedCount,
      appendedCount: merged.appendedCount,
      preservedUnregisteredCount: merged.preservedUnregisteredCount,
      lastSyncedAt: syncedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "回写 Google Sheet 失败。",
      },
      { status: 502 },
    );
  }
}
