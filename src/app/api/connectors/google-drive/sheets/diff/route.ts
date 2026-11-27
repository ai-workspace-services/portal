import { NextRequest, NextResponse } from "next/server";

import { isOperationsUser } from "@server/account/adminAccess";
import { getAccountSession } from "@server/account/session";
import { fetchAccountsSubscriptionContext } from "@server/connectors/accountsClient";
import { readGoogleSheet } from "@server/connectors/googleDrive";
import { computeBidirectionalDiff } from "@server/connectors/subscriptionSheetSync";

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
    spreadsheetUrl?: string;
  };

  try {
    const [sheet, accountsCtx] = await Promise.all([
      readGoogleSheet({
        userId,
        origin: request.nextUrl.origin,
        spreadsheetUrl: body.spreadsheetUrl,
      }),
      fetchAccountsSubscriptionContext(session),
    ]);

    const diff = computeBidirectionalDiff({
      headers: sheet.headers,
      rows: sheet.rows,
      systemItems: accountsCtx.items,
      registeredUsers: accountsCtx.users,
    });

    return NextResponse.json({
      spreadsheetUrl: sheet.spreadsheetUrl,
      spreadsheetId: sheet.spreadsheetId,
      gid: sheet.gid,
      sheetTitle: sheet.sheetTitle,
      documentTitle: sheet.documentTitle,
      authMode: sheet.authMode,
      writable: sheet.writable,
      account: sheet.account,
      diff,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "对比 Google Sheets 与系统订阅记录失败。",
      },
      { status: 502 },
    );
  }
}
