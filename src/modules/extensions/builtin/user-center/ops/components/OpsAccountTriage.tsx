"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  Ban,
  Check,
  ClipboardCheck,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Download,
  FileClock,
  Gift,
  Gauge,
  LineChart,
  Loader2,
  ListFilter,
  Package,
  ReceiptText,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UserCircle2,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useUserStore } from "@lib/userStore";
import OpsAuditConsole from "./OpsAuditConsole";
import OpsPlanCatalog from "./OpsPlanCatalog";

type ManagedUser = {
  id: string;
  email: string;
  username?: string;
  name?: string;
  role?: string;
  groups?: string[];
  active?: boolean;
  created_at?: string;
};

type BillingSummary = {
  planId?: string;
  packageName?: string;
  currentBalance?: number;
  arrears?: boolean;
  arrearsSince?: string;
  suspendState?: string;
  remainingIncludedQuota?: number;
  includedQuotaBytes?: number;
  trialEndsAt?: string;
};

type BillingAccountResponse = {
  user?: ManagedUser;
  billingProfile?: {
    planId?: string;
    packageName?: string;
    includedQuotaBytes?: number;
  };
  quotaState?: {
    currentBalance?: number;
    arrears?: boolean;
    arrearsSince?: string;
    suspendState?: string;
    remainingIncludedQuota?: number;
  };
  subscriptions?: Array<{
    id?: string;
    planId?: string;
    status?: string;
    externalId?: string;
    currentPeriodEnd?: string;
  }>;
  ledger?: Array<{
    id?: string;
    entryType?: string;
    amountDelta?: number;
    balanceAfter?: number;
    createdAt?: string;
  }>;
};

type OperationsOverviewResponse = {
  mrr?: number;
  activeSubscriptions?: number;
  arrearsAmount?: number;
  pendingActions?: number;
  usageTopN?: Array<{ label?: string; value?: number }>;
  trend?: Array<{ date?: string; active?: number; newAccounts?: number; churned?: number }>;
};

type BillingLedgerItem = {
  paymentReference?: string;
  accountEmail?: string;
  exceptionType?: string;
  amount?: number;
  ledgerStatus?: string;
  processingStatus?: string;
  updatedAt?: string;
};

type BillingLedgerResponse = {
  items?: BillingLedgerItem[];
  cashflow?: {
    collected?: number;
    credited?: number;
    refunded?: number;
    chargedOut?: number;
    unposted?: number;
    reconciliationRate?: number;
  };
  pendingApprovals?: Array<{ title?: string; target?: string; requestedBy?: string; createdAt?: string }>;
  updatedAt?: string;
};

type ActionName = "plan" | "grant-trial" | "quota" | "balance" | "clear-arrears";

type AttentionState = "normal" | "arrears" | "suspended" | "payg-low" | "trial-ending" | "syncing";

type AttentionRow = ManagedUser & {
  displayName: string;
  state: AttentionState;
  planLabel: string;
  balance?: number;
  lastActivity: string;
  billing?: BillingSummary;
};

const surface =
  "rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)]";

const navItems = [
  { href: "/panel/ops", label: "运营工作台", icon: Settings2 },
  { href: "/panel/ops/accounts", label: "账号", icon: UserCircle2 },
  { href: "/panel/ops/billing/plans", label: "套餐与订阅", icon: Package },
  { href: "/panel/ops/billing/ledger", label: "账单与对账", icon: CreditCard },
  { href: "/panel/ops/audit", label: "审计与系统", icon: FileClock },
];

async function jsonFetcher<T>(input: RequestInfo): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (payload as { error?: string } | null)?.error ?? response.statusText,
    );
  }
  return payload as T;
}

function displayName(user: ManagedUser) {
  return user.username?.trim() || user.name?.trim() || user.email;
}

function normalizeBilling(
  profile?: BillingAccountResponse["billingProfile"],
  quota?: BillingAccountResponse["quotaState"],
): BillingSummary | undefined {
  if (!profile && !quota) return undefined;
  return {
    planId: profile?.planId,
    packageName: profile?.packageName,
    includedQuotaBytes: profile?.includedQuotaBytes,
    currentBalance: quota?.currentBalance,
    arrears: quota?.arrears,
    arrearsSince: quota?.arrearsSince,
    suspendState: quota?.suspendState,
    remainingIncludedQuota: quota?.remainingIncludedQuota,
  };
}

function stateFor(user: ManagedUser, billing?: BillingSummary): AttentionState {
  if (!billing) return user.active === false ? "suspended" : "syncing";
  if (billing.suspendState === "suspended" || user.active === false) return "suspended";
  if (billing.arrears) return "arrears";
  if (billing.planId?.toLowerCase().startsWith("payg") && (billing.currentBalance ?? 0) < 10) {
    return "payg-low";
  }
  if (billing.trialEndsAt) {
    const days = (new Date(billing.trialEndsAt).getTime() - Date.now()) / 86_400_000;
    if (days >= 0 && days < 3) return "trial-ending";
  }
  return "normal";
}

function stateLabel(state: AttentionState) {
  return {
    normal: "正常",
    arrears: "欠费",
    suspended: "停机",
    "payg-low": "PAYG 余额异常",
    "trial-ending": "试用将到期",
    syncing: "计费待同步",
  }[state];
}

function stateClass(state: AttentionState) {
  return {
    normal: "border-emerald-200 bg-emerald-50 text-emerald-700",
    arrears: "border-red-200 bg-red-50 text-red-700",
    suspended: "border-red-200 bg-red-50 text-red-700",
    "payg-low": "border-orange-200 bg-orange-50 text-orange-700",
    "trial-ending": "border-amber-200 bg-amber-50 text-amber-700",
    syncing: "border-slate-200 bg-slate-50 text-slate-600",
  }[state];
}

function formatMoney(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatMoneyOrPending(value?: number) {
  return value === undefined || Number.isNaN(value) ? "待同步" : formatMoney(value);
}

function formatBytes(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "—";
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export default function OpsAccountTriage() {
  const user = useUserStore((state) => state.user);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAccountsRoute = pathname === "/panel/ops" || pathname === "/panel/ops/accounts";
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AttentionState>("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(searchParams.get("uuid") ?? undefined);
  const [action, setAction] = useState<ActionName | null>(null);
  const [reason, setReason] = useState("");
  const [actionValue, setActionValue] = useState("");
  const [actionStatus, setActionStatus] = useState<string | undefined>();
  const [actionError, setActionError] = useState<string | undefined>();

  const canAccess = Boolean(user);
  const usersSWR = useSWR<ManagedUser[]>(canAccess ? "/api/admin/billing/accounts" : null, jsonFetcher, {
    revalidateOnFocus: false,
  });
  const selected = selectedId ?? usersSWR.data?.[0]?.id;
  const billingSWR = useSWR<BillingAccountResponse>(
    selected ? `/api/admin/billing/accounts/${encodeURIComponent(selected)}` : null,
    jsonFetcher,
    { revalidateOnFocus: false },
  );

  const attentionRows = useMemo<AttentionRow[]>(() => {
    return (usersSWR.data ?? []).map((item) => {
      const isSelected = item.id === selected;
      const billing = isSelected
        ? normalizeBilling(billingSWR.data?.billingProfile, billingSWR.data?.quotaState)
        : undefined;
      return {
        ...item,
        displayName: displayName(item),
        billing,
        state: stateFor(item, billing),
        planLabel: billing?.packageName ?? billing?.planId ?? "计费待同步",
        balance: billing?.currentBalance,
        lastActivity: item.created_at ? formatDate(item.created_at) : "—",
      };
    });
  }, [billingSWR.data, selected, usersSWR.data]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return attentionRows
      .filter((row) => {
        if (!normalized) return true;
        return [row.email, row.id, row.displayName].some((value) =>
          value.toLowerCase().includes(normalized),
        );
      })
      .filter((row) => statusFilter === "all" || row.state === statusFilter)
      .filter((row) => planFilter === "all" || row.planLabel === planFilter)
      .sort((a, b) => {
        const rank: Record<AttentionState, number> = {
          arrears: 0,
          suspended: 1,
          "payg-low": 2,
          "trial-ending": 3,
          syncing: 4,
          normal: 5,
        };
        return rank[a.state] - rank[b.state];
      });
  }, [attentionRows, planFilter, query, statusFilter]);

  const selectedUser = attentionRows.find((row) => row.id === selected);
  const detailUser = billingSWR.data?.user ?? selectedUser;
  const billing = normalizeBilling(billingSWR.data?.billingProfile, billingSWR.data?.quotaState) ?? selectedUser?.billing;
  const subscription = billingSWR.data?.subscriptions?.[0];

  const planOptions = Array.from(
    new Set(attentionRows.map((row) => row.planLabel).filter((value) => value !== "计费待同步")),
  );

  const openAction = (nextAction: ActionName) => {
    setAction(nextAction);
    setActionValue("");
    setReason("");
    setActionStatus(undefined);
    setActionError(undefined);
  };

  const submitAction = async () => {
    if (!selected || !action) return;
    if (!reason.trim()) {
      setActionError("请填写操作原因，变更会写入审计流水。");
      return;
    }

    const payload: Record<string, unknown> = { reason: reason.trim() };
    if (action === "plan") payload.planId = actionValue.trim();
    if (action === "grant-trial") {
      payload.planId = actionValue.trim() || "TRIAL-7D";
      payload.days = 7;
    }
    if (action === "quota") payload.remainingIncludedQuota = Number(actionValue);
    if (action === "balance") payload.delta = Number(actionValue);

    if (["plan", "quota", "balance"].includes(action) && !actionValue.trim()) {
      setActionError("请填写变更值。");
      return;
    }

    setActionStatus("提交中…");
    setActionError(undefined);
    try {
      const response = await fetch(`/api/admin/billing/accounts/${encodeURIComponent(selected)}/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((responsePayload as { error?: string } | null)?.error ?? "操作失败");
      }
      setActionStatus("操作已提交，审计记录已写入。");
      await billingSWR.mutate();
      setTimeout(() => setAction(null), 800);
    } catch (error) {
      setActionStatus(undefined);
      setActionError(error instanceof Error ? error.message : "操作失败");
    }
  };

  if (!canAccess) return null;

  if (pathname === "/panel/ops") {
    return <OpsWorkbench users={usersSWR.data ?? []} loading={usersSWR.isLoading} />;
  }

  if (!isAccountsRoute) {
    if (pathname === "/panel/ops/billing/plans") {
      return <OpsPlanCatalog />;
    }
    if (pathname === "/panel/ops/audit") {
      return <OpsAuditConsole />;
    }
    if (pathname === "/panel/ops/billing/ledger") {
      return <BillingOperationsOverview />;
    }
    const title = pathname.includes("billing/plans")
      ? "套餐与订阅"
      : pathname.includes("billing/ledger")
        ? "账单与对账"
        : pathname.includes("audit")
          ? "审计与系统"
          : "系统管理";
    return <OpsModulePlaceholder title={title} />;
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">Operations / account triage</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">账号处置台</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">快速定位异常账号，完成权益、配额和账务处置。</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-success)]" /> 操作全程留痕
          </span>
          <span>数据更新于 {new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(new Date())}</span>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] p-1" aria-label="运营模块">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/panel/ops/accounts";
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-heading)]"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <section className={`${surface} p-4 sm:p-5`} aria-labelledby="account-search-heading">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <label id="account-search-heading" htmlFor="ops-account-search" className="sr-only">搜索账号</label>
            <div className="flex items-center gap-3 rounded-xl border border-[color:var(--color-primary-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[color:var(--color-primary-muted)]">
              <Search className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />
              <input
                id="ops-account-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="输入邮箱、UUID 或订阅编号"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-heading)] outline-none placeholder:text-[var(--color-text-subtle)]"
              />
              {query ? <button type="button" onClick={() => setQuery("")} aria-label="清除搜索"><X className="h-4 w-4 text-[var(--color-text-subtle)]" /></button> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAdvancedOpen((value) => !value)}
            aria-expanded={advancedOpen}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-muted)] transition hover:border-[color:var(--color-primary-border)] hover:text-[var(--color-primary)]"
          >
            <SlidersHorizontal className="h-4 w-4" /> 高级筛选 <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
        {advancedOpen ? (
          <div className="mt-4 grid gap-3 border-t border-[color:var(--color-surface-border)] pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-xs font-medium text-[var(--color-text-muted)]">状态
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="w-full rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-heading)] outline-none focus:border-[color:var(--color-primary)]">
                <option value="all">全部状态</option>
                <option value="arrears">欠费</option>
                <option value="suspended">停机</option>
                <option value="payg-low">PAYG 余额异常</option>
                <option value="trial-ending">试用将到期</option>
                <option value="syncing">计费待同步</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-[var(--color-text-muted)]">套餐
              <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} className="w-full rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-heading)] outline-none focus:border-[color:var(--color-primary)]">
                <option value="all">全部套餐</option>
                {planOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
              </select>
            </label>
            <div className="flex items-end sm:col-span-2">
              <button type="button" onClick={() => { setStatusFilter("all"); setPlanFilter("all"); setQuery(""); }} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-muted)]"><RefreshCw className="h-4 w-4" /> 重置筛选</button>
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className={`${surface} overflow-hidden`} aria-labelledby="attention-heading">
          <div className="flex items-center justify-between border-b border-[color:var(--color-surface-border)] px-4 py-4 sm:px-5">
            <div>
              <h2 id="attention-heading" className="text-base font-semibold text-[var(--color-heading)]">需要关注的账号</h2>
              <p className="mt-1 text-xs text-[var(--color-text-subtle)]">优先显示欠费、停机和余额异常账号</p>
            </div>
            <button type="button" onClick={() => usersSWR.mutate()} className="rounded-lg p-2 text-[var(--color-text-subtle)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]" aria-label="刷新账号列表"><RefreshCw className={`h-4 w-4 ${usersSWR.isLoading ? "animate-spin" : ""}`} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <caption className="sr-only">需要关注的账号列表</caption>
              <thead className="bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-muted)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium sm:px-5">状态</th>
                  <th scope="col" className="px-3 py-3 font-medium">用户（邮箱）</th>
                  <th scope="col" className="px-3 py-3 font-medium">套餐</th>
                  <th scope="col" className="px-3 py-3 font-medium">余额</th>
                  <th scope="col" className="px-3 py-3 font-medium">最近活动</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-surface-border)]">
                {usersSWR.isLoading ? Array.from({ length: 6 }).map((_, index) => <tr key={index} className="animate-pulse"><td colSpan={6} className="px-4 py-5"><div className="h-4 rounded bg-[var(--color-surface-muted)]" /></td></tr>) : null}
                {!usersSWR.isLoading && filteredRows.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]">未找到匹配的账号</td></tr> : null}
                {!usersSWR.isLoading ? filteredRows.slice(0, 10).map((row) => {
                  const isSelected = row.id === selected;
                  return <tr key={row.id} className={`cursor-pointer transition hover:bg-[var(--color-surface-hover)] ${isSelected ? "bg-[var(--color-primary-muted)]/45" : ""}`} onClick={() => setSelectedId(row.id)}>
                    <td className="px-4 py-3 sm:px-5"><span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-medium ${stateClass(row.state)}`}>{stateLabel(row.state)}</span></td>
                    <td className="max-w-[220px] px-3 py-3"><div className="truncate font-medium text-[var(--color-heading)]" title={row.displayName}>{row.displayName}</div><div className="truncate text-xs text-[var(--color-text-subtle)]" title={row.email}>{row.email}</div></td>
                    <td className="px-3 py-3 text-[var(--color-text-muted)]">{row.planLabel}</td>
                    <td className={`px-3 py-3 font-medium ${row.balance !== undefined && row.balance < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-heading)]"}`}>{formatMoneyOrPending(row.balance)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-[var(--color-text-subtle)]">{row.lastActivity}</td>
                    <td className="px-4 py-3 text-right sm:px-5"><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedId(row.id); }} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">打开处置台 <ArrowRight className="h-3.5 w-3.5" /></button></td>
                  </tr>;
                }) : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[color:var(--color-surface-border)] px-4 py-3 text-xs text-[var(--color-text-subtle)] sm:px-5"><span>共 {filteredRows.length} 个账号</span><span>默认显示前 10 条</span></div>
        </section>

        <aside className={`${surface} p-4 sm:p-5`} aria-labelledby="account-preview-heading">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-muted)] text-sm font-semibold text-[var(--color-primary)]">{detailUser?.email?.slice(0, 1).toUpperCase() ?? "?"}</div>
              <div className="min-w-0"><h2 id="account-preview-heading" className="truncate text-base font-semibold text-[var(--color-heading)]">{detailUser ? displayName(detailUser) : "选择一个账号"}</h2><p className="truncate text-xs text-[var(--color-text-subtle)]">{detailUser?.email ?? "从左侧列表选择账号"}</p><p className="mt-1 truncate font-mono text-[11px] text-[var(--color-text-subtle)]">UUID: {detailUser?.id ?? "—"}</p></div>
            </div>
            {detailUser ? <Link href={`/panel/ops/accounts?uuid=${encodeURIComponent(detailUser.id)}`} className="shrink-0 rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] hover:border-[color:var(--color-primary-border)] hover:text-[var(--color-primary)]">查看详情 <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link> : null}
          </div>

          <div className="mt-5 border-t border-[color:var(--color-surface-border)] pt-4">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-[var(--color-heading)]">订阅与套餐</h3><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${stateClass(selectedUser?.state ?? "syncing")}`}>{stateLabel(selectedUser?.state ?? "syncing")}</span></div>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-sm"><div><dt className="text-xs text-[var(--color-text-subtle)]">当前套餐</dt><dd className="mt-1 font-medium text-[var(--color-heading)]">{billing?.packageName ?? billing?.planId ?? "计费待同步"}</dd></div><div><dt className="text-xs text-[var(--color-text-subtle)]">订阅状态</dt><dd className="mt-1 font-medium text-[var(--color-heading)]">{subscription?.status ?? "—"}</dd></div><div><dt className="text-xs text-[var(--color-text-subtle)]">订阅编号</dt><dd className="mt-1 truncate font-mono text-xs text-[var(--color-text-muted)]" title={subscription?.externalId}>{subscription?.externalId ?? "—"}</dd></div><div><dt className="text-xs text-[var(--color-text-subtle)]">有效期</dt><dd className="mt-1 font-medium text-[var(--color-heading)]">{formatDate(subscription?.currentPeriodEnd)}</dd></div></dl>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="rounded-xl border border-[color:var(--color-surface-border)] p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-[var(--color-heading)]">账户概览</h3><WalletCards className="h-4 w-4 text-[var(--color-primary)]" /></div><dl className="mt-3 space-y-3 text-sm"><div className="flex items-center justify-between"><dt className="text-[var(--color-text-muted)]">账户余额</dt><dd className={`font-semibold ${billing?.currentBalance !== undefined && billing.currentBalance < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-heading)]"}`}>{formatMoneyOrPending(billing?.currentBalance)}</dd></div><div className="flex items-center justify-between"><dt className="text-[var(--color-text-muted)]">剩余配额</dt><dd className="font-medium text-[var(--color-heading)]">{formatBytes(billing?.remainingIncludedQuota)}</dd></div><div className="flex items-center justify-between"><dt className="text-[var(--color-text-muted)]">停机状态</dt><dd className="font-medium text-[var(--color-heading)]">{billing?.suspendState ?? "—"}</dd></div></dl></div>
            <div className="rounded-xl border border-[color:var(--color-warning-muted)] bg-[var(--color-warning-muted)]/20 p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-[var(--color-heading)]">账号操作</h3><Settings2 className="h-4 w-4 text-[var(--color-warning)]" /></div><div className="mt-3 grid gap-2"><ActionButton icon={Package} label="指派套餐" onClick={() => openAction("plan")} primary /><ActionButton icon={Gift} label="发放试用" onClick={() => openAction("grant-trial")} /><ActionButton icon={Gauge} label="调整配额" onClick={() => openAction("quota")} /><div className="mt-1 border-t border-[color:var(--color-warning-muted)] pt-2"><ActionButton icon={CircleDollarSign} label="调整余额" onClick={() => openAction("balance")} /><ActionButton icon={Ban} label="清欠费" onClick={() => openAction("clear-arrears")} /></div><p className="pt-1 text-center text-[11px] text-[var(--color-warning-foreground)]">所有变更必须填写原因</p></div></div>
          </div>

          <div className="mt-4 rounded-xl bg-[var(--color-surface-muted)] p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-[var(--color-heading)]">最近操作审计</h3><Link href={`/panel/ops/audit?target=${encodeURIComponent(detailUser?.id ?? "")}`} className="text-xs font-semibold text-[var(--color-primary)]">查看全部</Link></div>{billingSWR.data?.ledger?.slice(0, 3).map((entry) => <div key={entry.id ?? `${entry.entryType}-${entry.createdAt}`} className="mt-3 flex items-center justify-between gap-3 text-xs"><span className="truncate text-[var(--color-text-muted)]">{entry.entryType ?? "账务变更"}</span><span className="font-medium text-[var(--color-heading)]">{entry.amountDelta !== undefined ? formatMoneyOrPending(entry.amountDelta) : "待同步"}</span><span className="shrink-0 text-[var(--color-text-subtle)]">{formatDate(entry.createdAt)}</span></div>)}{!billingSWR.data?.ledger?.length ? <p className="mt-3 text-xs text-[var(--color-text-subtle)]">暂无账号级操作记录</p> : null}</div>
        </aside>
      </div>

      {action ? <ActionDialog action={action} value={actionValue} reason={reason} status={actionStatus} error={actionError} onValueChange={setActionValue} onReasonChange={setReason} onClose={() => setAction(null)} onSubmit={submitAction} /> : null}
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, primary = false }: { icon: LucideIcon; label: string; onClick: () => void; primary?: boolean }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${primary ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]" : "border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[color:var(--color-primary-border)] hover:text-[var(--color-primary)]"}`}><Icon className="h-4 w-4" />{label}</button>;
}

function OpsModulePlaceholder({ title }: { title: string }) {
  return <div className="space-y-5 pb-8"><section className={`${surface} flex min-h-[420px] flex-col items-center justify-center p-8 text-center`}><Settings2 className="h-8 w-8 text-[var(--color-primary)]" /><h1 className="mt-4 text-2xl font-semibold text-[var(--color-heading)]">{title}</h1><p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">页面骨架已接入运营导航，后续接入对应的分页查询、写操作和审计详情。</p><Link href="/panel/ops/accounts" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">返回账号处置台 <ArrowRight className="h-4 w-4" /></Link></section></div>;
}

function OpsNavigation({ active }: { active: string }) {
  return <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] p-1" aria-label="运营模块">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${active === href ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-heading)]"}`}><Icon className="h-4 w-4" />{label}</Link>)}</nav>;
}

function OpsWorkbench({ users, loading }: { users: ManagedUser[]; loading: boolean }) {
  const overviewSWR = useSWR<OperationsOverviewResponse>("/api/admin/billing/overview", jsonFetcher, { revalidateOnFocus: false });
  const overview = overviewSWR.data;
  const activeUsers = users.filter((item) => item.active !== false).length;
  return <div className="space-y-5 pb-8">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">Operations / signal tower</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">运营工作台</h1><p className="mt-1 text-sm text-[var(--color-text-muted)]">先看经营状态，再处理最需要关注的账号和账务异常。</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]"><ShieldCheck className="h-3.5 w-3.5 text-[var(--color-success)]" />运营角色可见 · 变更全量审计</span></div>
    <OpsNavigation active="/panel/ops" />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><OverviewMetric icon={TrendingUp} label="MRR" value={overview?.mrr !== undefined ? formatMoney(overview.mrr) : "待同步"} hint="计费聚合数据" tone="blue" /><OverviewMetric icon={Users} label="活跃订阅" value={loading ? "加载中" : overview?.activeSubscriptions !== undefined ? String(overview.activeSubscriptions) : String(activeUsers)} hint="订阅与账号活跃状态" tone="green" /><OverviewMetric icon={CircleDollarSign} label="欠费金额" value={overview?.arrearsAmount !== undefined ? formatMoney(overview.arrearsAmount) : "待同步"} hint="账本欠费汇总" tone="red" /><OverviewMetric icon={ClipboardCheck} label="待处理事项" value={overview?.pendingActions !== undefined ? String(overview.pendingActions) : "待同步"} hint="账单异常与审批队列" tone="orange" /></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]"><section className={`${surface} p-5`}><div className="flex items-start justify-between"><div><h2 className="text-base font-semibold text-[var(--color-heading)]">经营趋势</h2><p className="mt-1 text-xs text-[var(--color-text-subtle)]">活跃账号、新增账号与流失账号 · 数据待同步</p></div><LineChart className="h-5 w-5 text-[var(--color-primary)]" /></div><div className="mt-6 flex h-56 items-center justify-center rounded-xl border border-dashed border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] text-sm text-[var(--color-text-subtle)]">趋势聚合接口接入后展示近 7 天曲线</div></section><section className={`${surface} p-5`}><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold text-[var(--color-heading)]">快捷处置</h2><p className="mt-1 text-xs text-[var(--color-text-subtle)]">从异常直接进入账号工作流</p></div><Activity className="h-5 w-5 text-[var(--color-primary)]" /></div><div className="mt-5 space-y-3"><QuickAction href="/panel/ops/accounts" label="检索并处置账号" detail={`${users.length} 个账号可检索`} icon={Search} /><QuickAction href="/panel/ops/billing/ledger" label="检查账单异常" detail="打开计费运营总览" icon={ReceiptText} /><QuickAction href="/panel/ops/audit" label="查看变更审计" detail="按操作者和目标账号筛选" icon={FileClock} /></div></section></div>
    <div className="grid gap-5 xl:grid-cols-2"><section className={`${surface} p-5`}><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold text-[var(--color-heading)]">近期审计记录</h2><p className="mt-1 text-xs text-[var(--color-text-subtle)]">所有金额和权益变更都必须可追溯</p></div><Link href="/panel/ops/audit" className="text-xs font-semibold text-[var(--color-primary)]">查看全部 <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></div><EmptyPanel icon={FileClock} label="暂无可展示的审计记录" /></section><section className={`${surface} p-5`}><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold text-[var(--color-heading)]">用量 TopN</h2><p className="mt-1 text-xs text-[var(--color-text-subtle)]">按账号或租户查看资源消耗</p></div><BarChart3 className="h-5 w-5 text-[var(--color-primary)]" /></div><EmptyPanel icon={BarChart3} label="用量聚合接口接入后展示" /></section></div>
  </div>;
}

function BillingOperationsOverview() {
  const ledgerSWR = useSWR<BillingLedgerResponse>("/api/admin/billing/ledger", jsonFetcher, { revalidateOnFocus: false });
  const cashflow = ledgerSWR.data?.cashflow;
  const rows = ledgerSWR.data?.items ?? [];
  return <div className="space-y-5 pb-8"><div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">Operations / billing control</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">计费运营总览</h1><p className="mt-1 text-sm text-[var(--color-text-muted)]">以对账可信度为起点，快速定位异常与影响范围。</p></div><button type="button" className="inline-flex w-fit items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"><Download className="h-4 w-4" />对账导出</button></div><OpsNavigation active="/panel/ops/billing/ledger" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><OverviewMetric icon={WalletCards} label="今日收款" value={cashflow?.collected !== undefined ? formatMoneyOrPending(cashflow.collected) : "待同步"} hint="支付服务汇总" tone="green" /><OverviewMetric icon={AlertTriangle} label="待入账异常" value={cashflow?.unposted !== undefined ? String(cashflow.unposted) : "待同步"} hint="充值入账状态" tone="red" /><OverviewMetric icon={CircleDollarSign} label="欠费金额" value={cashflow?.chargedOut !== undefined ? formatMoneyOrPending(cashflow.chargedOut) : "待同步"} hint="账本欠费汇总" tone="red" /><OverviewMetric icon={Users} label="需人工复核" value={ledgerSWR.data?.pendingApprovals ? String(ledgerSWR.data.pendingApprovals.length) : "待同步"} hint="审批队列" tone="orange" /></div><div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]"><section className={`${surface} overflow-hidden`}><div className="flex items-center justify-between border-b border-[color:var(--color-surface-border)] px-5 py-4"><div><h2 className="text-base font-semibold text-[var(--color-heading)]">账单例外</h2><p className="mt-1 text-xs text-[var(--color-text-subtle)]">优先处理支付成功但账本状态未闭环的记录</p></div><button type="button" onClick={() => ledgerSWR.mutate()} className="rounded-lg p-2 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)]" aria-label="刷新账单"><RefreshCw className={`h-4 w-4 ${ledgerSWR.isLoading ? "animate-spin" : ""}`} /></button></div><div className="flex items-center gap-2 border-b border-[color:var(--color-surface-border)] px-5 py-3 text-xs text-[var(--color-text-muted)]"><ListFilter className="h-4 w-4" />日期、异常类型、账务状态、处理状态和金额区间</div><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><caption className="sr-only">账单例外列表</caption><thead className="bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-muted)]"><tr><th className="px-5 py-3 font-medium">支付参考号</th><th className="px-3 py-3 font-medium">账户</th><th className="px-3 py-3 font-medium">异常类型</th><th className="px-3 py-3 font-medium">金额</th><th className="px-3 py-3 font-medium">账务状态</th><th className="px-5 py-3 text-right font-medium">处理</th></tr></thead><tbody className="divide-y divide-[color:var(--color-surface-border)]">{rows.length ? rows.slice(0, 10).map((row) => <tr key={`${row.paymentReference}-${row.updatedAt}`}><td className="px-5 py-3 font-mono text-xs text-[var(--color-heading)]">{row.paymentReference ?? "—"}</td><td className="px-3 py-3 text-xs text-[var(--color-text-muted)]">{row.accountEmail ?? "—"}</td><td className="px-3 py-3"><span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] text-orange-700">{row.exceptionType ?? "待确认"}</span></td><td className="px-3 py-3 font-medium text-[var(--color-heading)]">{row.amount !== undefined ? formatMoneyOrPending(row.amount) : "待同步"}</td><td className="px-3 py-3 text-xs text-[var(--color-text-muted)]">{row.ledgerStatus ?? "—"}</td><td className="px-5 py-3 text-right"><button type="button" className="rounded-lg border border-[color:var(--color-surface-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)]">核对</button></td></tr>) : <tr><td colSpan={6}><EmptyPanel icon={ReceiptText} label={ledgerSWR.isLoading ? "账单数据加载中" : "暂无账单例外，或账单接口待接入"} /></td></tr>}</tbody></table></div></section><aside className="space-y-5"><section className={`${surface} p-5`}><div className="flex items-center justify-between"><h2 className="text-base font-semibold text-[var(--color-heading)]">本日资金流</h2><WalletCards className="h-5 w-5 text-[var(--color-success)]" /></div><div className="mt-4 space-y-3 text-sm"><CashflowRow label="收款总额" value={cashflow?.collected !== undefined ? formatMoneyOrPending(cashflow.collected) : "待同步"} /><CashflowRow label="已入账金额" value={cashflow?.credited !== undefined ? formatMoneyOrPending(cashflow.credited) : "待同步"} /><CashflowRow label="退款金额" value={cashflow?.refunded !== undefined ? formatMoneyOrPending(cashflow.refunded) : "待同步"} danger /><CashflowRow label="未入账金额" value={cashflow?.unposted !== undefined ? formatMoneyOrPending(cashflow.unposted) : "待同步"} danger /></div><div className="mt-4 flex items-center justify-between border-t border-[color:var(--color-surface-border)] pt-4 text-sm"><span className="text-[var(--color-text-muted)]">对账可信度</span><strong className="text-[var(--color-success)]">{cashflow?.reconciliationRate !== undefined ? `${cashflow.reconciliationRate.toFixed(2)}%` : "待同步"}</strong></div></section><section className={`${surface} p-5`}><div className="flex items-center justify-between"><h2 className="text-base font-semibold text-[var(--color-heading)]">需审批的变更</h2><span className="rounded-full bg-[var(--color-primary-muted)] px-2 py-1 text-[11px] font-semibold text-[var(--color-primary)]">{ledgerSWR.data?.pendingApprovals?.length ?? "—"}</span></div>{ledgerSWR.data?.pendingApprovals?.length ? ledgerSWR.data.pendingApprovals.slice(0, 3).map((item) => <div key={`${item.title}-${item.createdAt}`} className="mt-3 rounded-lg border border-[color:var(--color-surface-border)] p-3 text-xs"><p className="font-semibold text-[var(--color-heading)]">{item.title ?? "待审批变更"}</p><p className="mt-1 text-[var(--color-text-muted)]">{item.target ?? "—"} · {item.requestedBy ?? "—"}</p></div>) : <EmptyPanel icon={ClipboardCheck} label="暂无待审批变更" compact />}</section></aside></div><section className={`${surface} flex items-center gap-3 p-4 text-sm`}><AlertTriangle className="h-5 w-5 shrink-0 text-[var(--color-warning)]" /><p className="text-[var(--color-text-muted)]">PAYG 充值入账、余额更新和对账必须形成闭环；链路未通过前，任何“已入账”状态均以账本事实为准。</p></section></div>;
}

function OverviewMetric({ icon: Icon, label, value, hint, tone }: { icon: LucideIcon; label: string; value: string; hint: string; tone: "blue" | "green" | "red" | "orange" }) {
  const toneClass = { blue: "text-blue-600 bg-blue-50", green: "text-emerald-600 bg-emerald-50", red: "text-red-600 bg-red-50", orange: "text-orange-600 bg-orange-50" }[tone];
  return <section className={`${surface} p-4`}><div className="flex items-start justify-between"><div><p className="text-xs text-[var(--color-text-muted)]">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-heading)]">{value}</p><p className="mt-2 text-[11px] text-[var(--color-text-subtle)]">{hint}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-5 w-5" /></span></div></section>;
}

function QuickAction({ href, label, detail, icon: Icon }: { href: string; label: string; detail: string; icon: LucideIcon }) {
  return <Link href={href} className="flex items-center gap-3 rounded-xl border border-[color:var(--color-surface-border)] p-3 transition hover:border-[color:var(--color-primary-border)] hover:bg-[var(--color-primary-muted)]/30"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-muted)] text-[var(--color-primary)]"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[var(--color-heading)]">{label}</span><span className="mt-0.5 block truncate text-xs text-[var(--color-text-subtle)]">{detail}</span></span><ArrowRight className="h-4 w-4 text-[var(--color-text-subtle)]" /></Link>;
}

function EmptyPanel({ icon: Icon, label, compact = false }: { icon: LucideIcon; label: string; compact?: boolean }) {
  return <div className={`${compact ? "py-5" : "py-12"} flex flex-col items-center justify-center text-center`}><Icon className="h-6 w-6 text-[var(--color-text-subtle)]" /><p className="mt-2 text-xs text-[var(--color-text-subtle)]">{label}</p></div>;
}

function CashflowRow({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-[var(--color-text-muted)]">{label}</span><span className={`font-medium ${danger ? "text-[var(--color-danger)]" : "text-[var(--color-heading)]"}`}>{value}</span></div>;
}

function ActionDialog({ action, value, reason, status, error, onValueChange, onReasonChange, onClose, onSubmit }: { action: ActionName; value: string; reason: string; status?: string; error?: string; onValueChange: (value: string) => void; onReasonChange: (value: string) => void; onClose: () => void; onSubmit: () => void }) {
  const copy: Record<ActionName, { title: string; description: string; placeholder: string }> = {
    plan: { title: "指派套餐", description: "为当前账号应用目录中的套餐权益。", placeholder: "例如 PRO-MONTHLY" },
    "grant-trial": { title: "发放试用", description: "默认发放 7 天试用权益，可在后端按套餐策略校验。", placeholder: "可选：试用套餐 ID" },
    quota: { title: "调整配额", description: "请输入新的剩余配额，单位为字节。", placeholder: "例如 21474836480" },
    balance: { title: "调整余额", description: "正数为入账，负数为扣减；该操作需要资金权限。", placeholder: "例如 50 或 -20" },
    "clear-arrears": { title: "清欠费", description: "确认账号已完成付款或获得人工豁免。", placeholder: "无需填写变更值" },
  };
  const current = copy[action];
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="w-full max-w-lg rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="ops-action-title"><div className="flex items-start justify-between gap-4"><div><h2 id="ops-action-title" className="text-lg font-semibold text-[var(--color-heading)]">{current.title}</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">{current.description}</p></div><button type="button" onClick={onClose} aria-label="关闭" className="rounded-lg p-2 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)]"><X className="h-4 w-4" /></button></div>{action !== "clear-arrears" ? <label className="mt-5 block space-y-1 text-sm font-medium text-[var(--color-text-muted)]">变更值<input value={value} onChange={(event) => onValueChange(event.target.value)} placeholder={current.placeholder} className="mt-1 w-full rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-heading)] outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary-muted)]" /></label> : null}<label className="mt-4 block space-y-1 text-sm font-medium text-[var(--color-text-muted)]">操作原因<span className="text-[var(--color-danger)]"> *</span><textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} rows={4} placeholder="说明这次变更的业务原因或工单号" className="mt-1 w-full resize-none rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-heading)] outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary-muted)]" /></label>{error ? <p className="mt-3 rounded-lg bg-[var(--color-danger-muted)] px-3 py-2 text-sm text-[var(--color-danger-foreground)]" role="alert">{error}</p> : null}{status ? <p className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--color-success-muted)] px-3 py-2 text-sm text-[var(--color-success-foreground)]" aria-live="polite"><Check className="h-4 w-4" />{status}</p> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-[color:var(--color-surface-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]">取消</button><button type="button" disabled={Boolean(status)} onClick={onSubmit} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60">{status === "提交中…" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{status === "提交中…" ? "提交中…" : "确认变更"}</button></div></section></div>;
}
