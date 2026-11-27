import { serializeCsvMatrix } from "./googleDrive";

export const CANONICAL_SHEET_HEADERS = [
  "邮箱",
  "用户名",
  "订阅开始",
  "订阅结束",
  "套餐",
  "订阅类型",
  "月配额",
  "年配额",
  "费用",
  "付费状态",
  "备注",
] as const;

export type SystemSubscriptionItem = {
  userId: string;
  email: string;
  username?: string;
  plan: string;
  subscriptionType: string;
  monthlyQuotaBytes: number;
  annualQuotaBytes: number;
  feeMinor: number;
  paymentStatus: string;
  validFrom?: string | null;
  validUntil?: string | null;
  note?: string;
  temporaryUnlimited?: boolean;
  updatedAt?: string;
};

export type NormalizedSubscriptionView = {
  email: string;
  username: string;
  validFrom: string;
  validUntil: string;
  plan: string;
  subscriptionType: string;
  monthlyQuotaBytes: number;
  annualQuotaBytes: number;
  feeMinor: number;
  paymentStatus: string;
  note: string;
};

export type DiffStatus =
  | "in_sync"
  | "pull_candidate"
  | "push_candidate"
  | "conflict"
  | "unregistered";

export type FieldDifference = {
  field: string;
  label: string;
  sheetValue: string;
  systemValue: string;
};

export type SubscriptionDiffRow = {
  email: string;
  status: DiffStatus;
  sheetRowNumber?: number;
  userId?: string;
  sheet?: NormalizedSubscriptionView;
  system?: NormalizedSubscriptionView;
  differences: FieldDifference[];
};

export type BidirectionalDiffSummary = {
  totalSheetRows: number;
  totalSystemRecords: number;
  inSyncCount: number;
  pullCandidateCount: number;
  pushCandidateCount: number;
  conflictCount: number;
  unregisteredCount: number;
  rows: SubscriptionDiffRow[];
  pullCsv: string;
};

const TIB = 1024 ** 4;
const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

export function normalizeDateCell(raw?: string | null): string {
  const value = raw?.trim() ?? "";
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const match = value.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return value;
}

export function parseQuotaCellBytes(raw?: string | null): number {
  const value = raw?.trim().toUpperCase() ?? "";
  if (!value) return 0;
  const units: Array<[string, number]> = [
    ["TIB", TIB],
    ["TB", TIB],
    ["GIB", GIB],
    ["GB", GIB],
    ["MIB", MIB],
    ["MB", MIB],
    ["B", 1],
  ];
  for (const [suffix, factor] of units) {
    if (value.endsWith(suffix)) {
      const numeric = Number(value.slice(0, -suffix.length).trim());
      return Number.isFinite(numeric) && numeric >= 0
        ? Math.round(numeric * factor)
        : 0;
    }
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : 0;
}

export function formatQuotaCellBytes(bytes?: number | null): string {
  const value = typeof bytes === "number" && Number.isFinite(bytes) ? bytes : 0;
  if (value <= 0) return "";
  if (value >= TIB && value % TIB === 0) return `${value / TIB}TB`;
  if (value >= GIB && value % GIB === 0) return `${value / GIB}GB`;
  if (value >= MIB && value % MIB === 0) return `${value / MIB}MB`;
  if (value >= GIB) return `${Number((value / GIB).toFixed(2))}GB`;
  return String(value);
}

export function parseFeeCellMinor(raw?: string | null): number {
  const cleaned = (raw ?? "")
    .trim()
    .replace(/^¥/, "")
    .replace(/元$/, "")
    .trim();
  if (!cleaned) return 0;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) && numeric >= 0
    ? Math.round(numeric * 100)
    : 0;
}

export function formatFeeCellMinor(feeMinor?: number | null): string {
  const value =
    typeof feeMinor === "number" && Number.isFinite(feeMinor) ? feeMinor : 0;
  if (value <= 0) return "";
  if (value % 100 === 0) return `${value / 100}元`;
  return `${(value / 100).toFixed(2)}元`;
}

export function normalizePaymentStatus(raw?: string | null): string {
  const value = raw?.trim().toLowerCase() ?? "";
  if (value === "paid" || value === "已付费" || value === "已支付") {
    return "已付费";
  }
  if (value === "unpaid" || value === "未付费") {
    return "未付费";
  }
  if (value === "refunded" || value === "已退款") {
    return "已退款";
  }
  return raw?.trim() ?? "";
}

export function normalizePlanCode(raw?: string | null): string {
  return (raw ?? "").trim().toLowerCase();
}

export function normalizeSubscriptionType(raw?: string | null): string {
  return (raw ?? "").trim().toLowerCase();
}

function unescapeFormulaCell(raw?: string): string {
  const value = raw?.trim() ?? "";
  if (
    value.startsWith("'") &&
    value.length > 1 &&
    "=+-@".includes(value[1])
  ) {
    return value.slice(1);
  }
  return value;
}

function resolveColumnMap(headers: string[]): Record<string, number> {
  const normalizedHeaders = headers.map((header, index) => {
    const trimmed = header.trim();
    if (trimmed === "" && index > 0 && headers[index - 1]?.trim() === "订阅结束") {
      return "套餐";
    }
    return trimmed.toLowerCase();
  });

  const aliases: Record<string, string[]> = {
    email: ["邮箱", "email"],
    username: ["用户名", "username"],
    validFrom: ["订阅开始", "subscription start", "valid_from"],
    validUntil: ["订阅结束", "subscription end", "valid_until"],
    plan: ["套餐", "plan"],
    subscriptionType: [
      "订阅类型",
      "订阅周期",
      "subscription type",
      "subscription_type",
    ],
    monthlyQuota: ["月配额", "monthly quota", "monthly_quota_bytes"],
    annualQuota: ["年配额", "annual quota", "annual_quota_bytes"],
    fee: ["费用", "fee", "fee_minor"],
    paymentStatus: ["付费状态", "paid status", "payment_status"],
    note: ["备注", "note"],
  };

  const map: Record<string, number> = {};
  for (const [key, candidates] of Object.entries(aliases)) {
    const idx = normalizedHeaders.findIndex((h) => candidates.includes(h));
    if (idx >= 0) {
      map[key] = idx;
    }
  }
  return map;
}

export function parseSheetRow(
  row: string[],
  headers: string[],
): NormalizedSubscriptionView | null {
  const col = resolveColumnMap(headers);
  const emailIdx = col.email ?? 0;
  const email = unescapeFormulaCell(row[emailIdx]).toLowerCase();
  if (!email) return null;

  const get = (key: string) => {
    const idx = col[key];
    return idx !== undefined && idx < row.length
      ? unescapeFormulaCell(row[idx])
      : "";
  };

  const feeRaw = get("fee");
  const isMinor = headers.some(
    (h) => h.trim().toLowerCase() === "fee_minor",
  );
  const feeMinor = isMinor
    ? Math.max(0, Math.round(Number(feeRaw) || 0))
    : parseFeeCellMinor(feeRaw);

  return {
    email,
    username: get("username"),
    validFrom: normalizeDateCell(get("validFrom")),
    validUntil: normalizeDateCell(get("validUntil")),
    plan: normalizePlanCode(get("plan")),
    subscriptionType: normalizeSubscriptionType(get("subscriptionType")),
    monthlyQuotaBytes: parseQuotaCellBytes(get("monthlyQuota")),
    annualQuotaBytes: parseQuotaCellBytes(get("annualQuota")),
    feeMinor,
    paymentStatus: normalizePaymentStatus(get("paymentStatus")),
    note: get("note"),
  };
}

export function normalizeSystemItem(
  item: SystemSubscriptionItem,
): NormalizedSubscriptionView {
  return {
    email: item.email.trim().toLowerCase(),
    username: item.username?.trim() ?? "",
    validFrom: normalizeDateCell(item.validFrom),
    validUntil: normalizeDateCell(item.validUntil),
    plan: normalizePlanCode(item.plan),
    subscriptionType: normalizeSubscriptionType(item.subscriptionType),
    monthlyQuotaBytes: item.monthlyQuotaBytes || 0,
    annualQuotaBytes: item.annualQuotaBytes || 0,
    feeMinor: item.feeMinor || 0,
    paymentStatus: normalizePaymentStatus(item.paymentStatus),
    note: item.note?.trim() ?? "",
  };
}

function compareViews(
  sheet: NormalizedSubscriptionView,
  system: NormalizedSubscriptionView,
): FieldDifference[] {
  const diffs: FieldDifference[] = [];
  const check = (
    field: string,
    label: string,
    sheetValue: string,
    systemValue: string,
  ) => {
    if (sheetValue !== systemValue) {
      diffs.push({ field, label, sheetValue, systemValue });
    }
  };

  check("plan", "套餐", sheet.plan, system.plan);
  check(
    "subscriptionType",
    "订阅类型",
    sheet.subscriptionType,
    system.subscriptionType,
  );
  check(
    "monthlyQuotaBytes",
    "月配额",
    formatQuotaCellBytes(sheet.monthlyQuotaBytes) || "0",
    formatQuotaCellBytes(system.monthlyQuotaBytes) || "0",
  );
  check(
    "annualQuotaBytes",
    "年配额",
    formatQuotaCellBytes(sheet.annualQuotaBytes) || "0",
    formatQuotaCellBytes(system.annualQuotaBytes) || "0",
  );
  check(
    "feeMinor",
    "费用",
    formatFeeCellMinor(sheet.feeMinor) || "0元",
    formatFeeCellMinor(system.feeMinor) || "0元",
  );
  check(
    "paymentStatus",
    "付费状态",
    sheet.paymentStatus,
    system.paymentStatus,
  );
  check("validFrom", "订阅开始", sheet.validFrom, system.validFrom);
  check("validUntil", "订阅结束", sheet.validUntil, system.validUntil);
  check("note", "备注", sheet.note, system.note);
  return diffs;
}

export function viewToSheetRow(
  view: NormalizedSubscriptionView,
  headers: string[] = [...CANONICAL_SHEET_HEADERS],
): string[] {
  return headers.map((header, idx) => {
    const h = header.trim().toLowerCase();
    if (h === "邮箱" || h === "email") return view.email;
    if (h === "用户名" || h === "username") return view.username;
    if (h === "订阅开始" || h === "subscription start" || h === "valid_from") {
      return view.validFrom;
    }
    if (h === "订阅结束" || h === "subscription end" || h === "valid_until") {
      return view.validUntil;
    }
    if (
      h === "套餐" ||
      h === "plan" ||
      (h === "" && idx > 0 && headers[idx - 1]?.trim() === "订阅结束")
    ) {
      return view.plan;
    }
    if (
      h === "订阅类型" ||
      h === "订阅周期" ||
      h === "subscription type" ||
      h === "subscription_type"
    ) {
      return view.subscriptionType;
    }
    if (h === "月配额" || h === "monthly quota" || h === "monthly_quota_bytes") {
      return formatQuotaCellBytes(view.monthlyQuotaBytes);
    }
    if (h === "年配额" || h === "annual quota" || h === "annual_quota_bytes") {
      return formatQuotaCellBytes(view.annualQuotaBytes);
    }
    if (h === "费用" || h === "fee" || h === "fee_minor") {
      return formatFeeCellMinor(view.feeMinor);
    }
    if (h === "付费状态" || h === "paid status" || h === "payment_status") {
      return view.paymentStatus;
    }
    if (h === "备注" || h === "note") {
      return view.note;
    }
    return "";
  });
}

export function computeBidirectionalDiff(params: {
  headers: string[];
  rows: string[][];
  systemItems: SystemSubscriptionItem[];
  registeredUsers: Array<{ id: string; email?: string; username?: string; name?: string }>;
}): BidirectionalDiffSummary {
  const userByEmail = new Map<
    string,
    { id: string; email: string; username?: string }
  >();
  for (const user of params.registeredUsers) {
    const email = user.email?.trim().toLowerCase();
    if (!email) continue;
    userByEmail.set(email, {
      id: user.id,
      email,
      username: user.username?.trim() || user.name?.trim(),
    });
  }

  const systemByEmail = new Map<string, { item: SystemSubscriptionItem; view: NormalizedSubscriptionView }>();
  for (const item of params.systemItems) {
    const view = normalizeSystemItem(item);
    if (!view.email) continue;
    systemByEmail.set(view.email, { item, view });
  }

  const sheetByEmail = new Map<
    string,
    { rowNumber: number; view: NormalizedSubscriptionView }
  >();
  params.rows.forEach((row, index) => {
    const view = parseSheetRow(row, params.headers);
    if (!view) return;
    sheetByEmail.set(view.email, { rowNumber: index + 2, view });
  });

  const diffRows: SubscriptionDiffRow[] = [];
  const pullMatrix: string[][] = [[...CANONICAL_SHEET_HEADERS]];

  for (const [email, sheetEntry] of sheetByEmail.entries()) {
    const registered = userByEmail.get(email);
    const systemEntry = systemByEmail.get(email);

    if (!registered) {
      diffRows.push({
        email,
        status: "unregistered",
        sheetRowNumber: sheetEntry.rowNumber,
        sheet: sheetEntry.view,
        differences: [],
      });
      continue;
    }

    pullMatrix.push(viewToSheetRow(sheetEntry.view, [...CANONICAL_SHEET_HEADERS]));

    if (!systemEntry) {
      diffRows.push({
        email,
        status: "pull_candidate",
        sheetRowNumber: sheetEntry.rowNumber,
        userId: registered.id,
        sheet: sheetEntry.view,
        differences: [],
      });
      continue;
    }

    const differences = compareViews(sheetEntry.view, systemEntry.view);
    diffRows.push({
      email,
      status: differences.length === 0 ? "in_sync" : "conflict",
      sheetRowNumber: sheetEntry.rowNumber,
      userId: systemEntry.item.userId || registered.id,
      sheet: sheetEntry.view,
      system: systemEntry.view,
      differences,
    });
  }

  for (const [email, systemEntry] of systemByEmail.entries()) {
    if (sheetByEmail.has(email)) continue;
    diffRows.push({
      email,
      status: "push_candidate",
      userId: systemEntry.item.userId,
      system: systemEntry.view,
      differences: [],
    });
  }

  return {
    totalSheetRows: sheetByEmail.size,
    totalSystemRecords: systemByEmail.size,
    inSyncCount: diffRows.filter((r) => r.status === "in_sync").length,
    pullCandidateCount: diffRows.filter((r) => r.status === "pull_candidate")
      .length,
    pushCandidateCount: diffRows.filter((r) => r.status === "push_candidate")
      .length,
    conflictCount: diffRows.filter((r) => r.status === "conflict").length,
    unregisteredCount: diffRows.filter((r) => r.status === "unregistered")
      .length,
    rows: diffRows,
    pullCsv: serializeCsvMatrix(pullMatrix),
  };
}

export function buildMergedPushMatrix(params: {
  headers: string[];
  rows: string[][];
  systemItems: SystemSubscriptionItem[];
  targetEmails?: string[];
}): {
  matrix: string[][];
  updatedCount: number;
  appendedCount: number;
  preservedUnregisteredCount: number;
} {
  const activeHeaders =
    params.headers.length > 0
      ? [...params.headers]
      : [...CANONICAL_SHEET_HEADERS];
  const col = resolveColumnMap(activeHeaders);
  const emailCol = col.email ?? 0;

  const allowedSet =
    params.targetEmails && params.targetEmails.length > 0
      ? new Set(params.targetEmails.map((e) => e.trim().toLowerCase()))
      : null;

  const systemByEmail = new Map<string, NormalizedSubscriptionView>();
  for (const item of params.systemItems) {
    const view = normalizeSystemItem(item);
    if (!view.email) continue;
    if (allowedSet && !allowedSet.has(view.email)) continue;
    systemByEmail.set(view.email, view);
  }

  const seenEmails = new Set<string>();
  let updatedCount = 0;
  let preservedUnregisteredCount = 0;

  const nextRows = params.rows.map((existingRow) => {
    const parsed = parseSheetRow(existingRow, activeHeaders);
    const email =
      parsed?.email || unescapeFormulaCell(existingRow[emailCol]).toLowerCase();
    if (!email) return existingRow;

    const systemView = systemByEmail.get(email);
    if (!systemView) {
      if (!allowedSet || !allowedSet.has(email)) {
        preservedUnregisteredCount++;
      }
      return existingRow;
    }

    seenEmails.add(email);
    const mergedView: NormalizedSubscriptionView = {
      ...systemView,
      username: systemView.username || parsed?.username || "",
    };
    const nextRow = viewToSheetRow(mergedView, activeHeaders);
    if (parsed && compareViews(parsed, mergedView).length > 0) {
      updatedCount++;
    }
    return nextRow;
  });

  let appendedCount = 0;
  for (const [email, view] of systemByEmail.entries()) {
    if (seenEmails.has(email)) continue;
    nextRows.push(viewToSheetRow(view, activeHeaders));
    appendedCount++;
  }

  return {
    matrix: [activeHeaders, ...nextRows],
    updatedCount,
    appendedCount,
    preservedUnregisteredCount,
  };
}
