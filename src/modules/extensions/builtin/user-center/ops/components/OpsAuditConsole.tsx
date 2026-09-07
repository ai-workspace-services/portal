"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import useSWR from "swr";
import {
  ChevronDown,
  ChevronRight,
  FileClock,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import { ADMIN_API_BASE } from "../../lib/adminApi";

type AuditEntry = {
  uuid: string;
  action: string;
  actorUuid?: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

type AuditResponse = { entries?: AuditEntry[] };

type Filters = {
  action: string;
  actor: string;
  target: string;
  from: string;
  to: string;
};

const surface =
  "rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)]";

async function fetcher<T>(input: RequestInfo): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error ?? "加载失败");
  }
  return payload as T;
}

const initialFilters: Filters = {
  action: "",
  actor: "",
  target: "",
  from: "",
  to: "",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(date);
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    "billing.balance.adjust": "余额调整",
    "billing.entitlement.grant": "权益发放",
    "billing.quota.adjust": "配额调整",
    "billing.trial.grant": "试用发放",
    "billing.arrears.clear": "清理欠费",
    "billing.plan.upsert": "套餐变更",
    "billing.plan.delete": "套餐删除",
    "account.role.update": "角色变更",
    "account.segment.update": "账号分组变更",
  };
  return labels[action] ?? action;
}

function toQuery(filters: Filters) {
  const params = new URLSearchParams({ limit: "100" });
  if (filters.action.trim()) params.set("action", filters.action.trim());
  if (filters.actor.trim()) params.set("actor", filters.actor.trim());
  if (filters.target.trim()) params.set("target", filters.target.trim());
  return `${ADMIN_API_BASE}/audit?${params.toString()}`;
}

export default function OpsAuditConsole() {
  const [draft, setDraft] = useState<Filters>(initialFilters);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const query = useMemo(() => toQuery(filters), [filters]);
  const auditSWR = useSWR<AuditResponse>(query, fetcher, {
    revalidateOnFocus: false,
  });

  const entries = useMemo(() => {
    const from = filters.from ? new Date(`${filters.from}T00:00:00`) : undefined;
    const to = filters.to ? new Date(`${filters.to}T23:59:59.999`) : undefined;
    return (auditSWR.data?.entries ?? []).filter((entry) => {
      const created = new Date(entry.createdAt);
      return (!from || created >= from) && (!to || created <= to);
    });
  }, [auditSWR.data?.entries, filters.from, filters.to]);

  const updateDraft = (key: keyof Filters, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setExpanded(new Set());
    setFilters({ ...draft });
  };

  const resetFilters = () => {
    setDraft(initialFilters);
    setFilters(initialFilters);
    setExpanded(new Set());
  };

  const toggleExpanded = (uuid: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-eyebrow font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Operations / audit trail
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">
            审计与系统
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            只读查看运营变更、操作者和目标，详情保留原始 before / after 快照。
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--color-surface-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-success)]" />
          只读 · root / 管理员 / 运营者
        </div>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] p-1"
        aria-label="运营模块"
      >
        <Link href="/panel/ops" className="shrink-0 rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]">
          运营工作台
        </Link>
        <Link href="/panel/ops/accounts" className="shrink-0 rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]">
          账号处置台
        </Link>
        <Link href="/panel/ops/billing/plans" className="shrink-0 rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]">
          套餐与订阅
        </Link>
        <Link href="/panel/ops/billing/ledger" className="shrink-0 rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]">
          账单与对账
        </Link>
        <span className="shrink-0 rounded-lg bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-primary)] shadow-sm">
          审计与系统
        </span>
      </nav>

      <section className={`${surface} p-4 sm:p-5`}>
        <form onSubmit={submitFilters} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <FilterField label="动作" value={draft.action} onChange={(value) => updateDraft("action", value)} placeholder="billing.balance" />
          <FilterField label="操作者 UUID" value={draft.actor} onChange={(value) => updateDraft("actor", value)} placeholder="按 actor UUID" />
          <FilterField label="目标 UUID" value={draft.target} onChange={(value) => updateDraft("target", value)} placeholder="账号或套餐 UUID" />
          <FilterField label="开始日期" type="date" value={draft.from} onChange={(value) => updateDraft("from", value)} />
          <FilterField label="结束日期" type="date" value={draft.to} onChange={(value) => updateDraft("to", value)} />
          <div className="flex items-end gap-2">
            <button type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">
              <Search className="h-4 w-4" />筛选
            </button>
            <button type="button" onClick={resetFilters} className="rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]">
              重置
            </button>
          </div>
        </form>
      </section>

      <section className={`${surface} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[color:var(--color-surface-border)] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-heading)]">变更记录</h2>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">共 {entries.length} 条 · 默认加载最近 100 条</p>
          </div>
          <button type="button" onClick={() => auditSWR.mutate()} aria-label="刷新审计记录" className="rounded-lg p-2 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]">
            <RefreshCw className={`h-4 w-4 ${auditSWR.isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {auditSWR.error ? (
          <div className="p-8 text-center text-sm text-[var(--color-danger)]">审计记录加载失败：{auditSWR.error.message}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <caption className="sr-only">运营审计记录</caption>
              <thead className="bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-muted)]">
                <tr>
                  <th className="w-10 px-4 py-3" aria-label="展开详情" />
                  <th className="px-3 py-3 font-medium">时间</th>
                  <th className="px-3 py-3 font-medium">操作者</th>
                  <th className="px-3 py-3 font-medium">动作</th>
                  <th className="px-3 py-3 font-medium">目标</th>
                  <th className="px-4 py-3 text-right font-medium">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-surface-border)]">
                {auditSWR.isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--color-text-subtle)]">审计记录加载中…</td></tr>
                ) : entries.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--color-text-subtle)]"><FileClock className="mx-auto mb-2 h-6 w-6" />暂无匹配的审计记录</td></tr>
                ) : entries.map((entry) => {
                  const isExpanded = expanded.has(entry.uuid);
                  const target = typeof entry.details?.target_uuid === "string" ? entry.details.target_uuid : "—";
                  return (
                    <tr key={entry.uuid} className="align-top">
                      <td colSpan={6} className="p-0">
                        <div className="grid grid-cols-[2.5rem_minmax(10rem,1.2fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_6rem] items-start px-4 py-3 hover:bg-[var(--color-surface-muted)]/60">
                          <button type="button" onClick={() => toggleExpanded(entry.uuid)} aria-label={isExpanded ? "收起详情" : "展开详情"} className="mt-0.5 rounded p-1 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)]">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <span className="px-3 text-xs text-[var(--color-text-muted)]">{formatDate(entry.createdAt)}</span>
                          <span className="truncate px-3 font-mono text-xs text-[var(--color-text-muted)]" title={entry.actorUuid}>{entry.actorUuid || "系统"}</span>
                          <span className="px-3"><span className="rounded-full bg-[var(--color-primary-muted)] px-2 py-1 text-xs text-[var(--color-primary)]">{actionLabel(entry.action)}</span><span className="mt-1 block truncate font-mono text-eyebrow text-[var(--color-text-subtle)]">{entry.action}</span></span>
                          <span className="truncate px-3 font-mono text-xs text-[var(--color-text-muted)]" title={target}>{target}</span>
                          <span className="px-3 text-right text-xs text-[var(--color-primary)]">{isExpanded ? "收起" : "展开"}</span>
                        </div>
                        {isExpanded ? <div className="border-t border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-12 py-4"><p className="mb-2 text-xs font-semibold text-[var(--color-heading)]">原始详情</p><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-3 font-mono text-xs leading-5 text-[var(--color-text-muted)]">{JSON.stringify(entry.details ?? {}, null, 2)}</pre></div> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FilterField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block text-xs font-medium text-[var(--color-text-muted)]">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-normal text-[var(--color-heading)] outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]" />
    </label>
  );
}
