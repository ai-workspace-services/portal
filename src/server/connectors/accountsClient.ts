import type { AccountSessionResult } from "@server/account/session";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";
import type { SystemSubscriptionItem } from "./subscriptionSheetSync";

export type RegisteredAccountUser = {
  id: string;
  email?: string;
  username?: string;
  name?: string;
};

export async function fetchAccountsSubscriptionContext(
  session: AccountSessionResult,
): Promise<{
  items: SystemSubscriptionItem[];
  users: RegisteredAccountUser[];
}> {
  if (!session.user || !session.token) {
    throw new Error("未登录或会话已过期");
  }

  const baseUrl = getAccountServiceApiBaseUrl();
  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${session.token}`,
    "X-User-Role": session.user.role,
  });
  if (session.user.permissions.length > 0) {
    headers.set("X-User-Permissions", session.user.permissions.join(","));
  }
  const serviceToken = process.env.INTERNAL_SERVICE_TOKEN?.trim();
  if (serviceToken) {
    headers.set("X-Service-Token", serviceToken);
  }

  const [recordsResp, usersResp] = await Promise.all([
    fetch(`${baseUrl}/admin/users/subscription-records?includeHistory=true`, {
      method: "GET",
      headers,
      cache: "no-store",
    }),
    fetch(`${baseUrl}/users`, {
      method: "GET",
      headers,
      cache: "no-store",
    }),
  ]);

  if (!recordsResp.ok) {
    const errPayload = (await recordsResp.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
    };
    throw new Error(
      errPayload.message ||
        errPayload.error ||
        `读取 Accounts 订阅记录失败 (HTTP ${recordsResp.status})`,
    );
  }

  if (!usersResp.ok) {
    throw new Error(`读取 Accounts 用户列表失败 (HTTP ${usersResp.status})`);
  }

  const recordsPayload = (await recordsResp.json()) as {
    items?: SystemSubscriptionItem[];
    records?: Array<{
      userId: string;
      planCode?: string;
      subscriptionType?: string;
      monthlyQuotaBytes?: number;
      annualQuotaBytes?: number;
      feeMinor?: number;
      paymentStatus?: string;
      validFrom?: string | null;
      validUntil?: string | null;
      note?: string;
      updatedAt?: string;
    }>;
  };
  const usersPayload = (await usersResp.json()) as RegisteredAccountUser[];
  const users = Array.isArray(usersPayload) ? usersPayload : [];

  if (Array.isArray(recordsPayload.items)) {
    return { items: recordsPayload.items, users };
  }

  // Fallback mapping if an older Accounts binary only returned raw `records`.
  const userById = new Map<string, RegisteredAccountUser>();
  for (const user of users) {
    if (user.id) userById.set(user.id, user);
  }
  const fallbackItems: SystemSubscriptionItem[] = [];
  for (const record of recordsPayload.records ?? []) {
    const user = userById.get(record.userId);
    if (!user?.email) continue;
    fallbackItems.push({
      userId: record.userId,
      email: user.email,
      username: user.username || user.name || "",
      plan: record.planCode || "plus",
      subscriptionType: record.subscriptionType || "",
      monthlyQuotaBytes: record.monthlyQuotaBytes || 0,
      annualQuotaBytes: record.annualQuotaBytes || 0,
      feeMinor: record.feeMinor || 0,
      paymentStatus: record.paymentStatus || "",
      validFrom: record.validFrom ?? null,
      validUntil: record.validUntil ?? null,
      note: record.note || "",
      updatedAt: record.updatedAt,
    });
  }

  return { items: fallbackItems, users };
}
