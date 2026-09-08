"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Database,
  FileClock,
  GitBranch,
  GitCommitHorizontal,
  Globe2,
  KeyRound,
  LockKeyhole,
  MoreHorizontal,
  Network,
  Play,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import Breadcrumbs from "@/app/panel/components/Breadcrumbs";

type View = "overview" | "releases" | "environments" | "audit" | "vault";
type Environment = "All environments" | "UAT" | "PROD" | "Hybrid";
type OperationStatus = "Completed" | "Failed" | "Pending";
type Risk = "Low" | "Medium" | "High";

type Operation = {
  id: string;
  time: string;
  title: string;
  environment: Exclude<Environment, "All environments">;
  status: OperationStatus;
  risk: Risk;
  actor: string;
  detail: string;
};

type Gateway = {
  id: string;
  region: string;
  heartbeat: string;
  freshness: string;
  status: "Healthy" | "Stale";
};

const operations: Operation[] = [
  { id: "op-2401", time: "Sep 08, 10:12 AM", title: "Deploy build v2.4.1", environment: "UAT", status: "Completed", risk: "Low", actor: "M. Chen", detail: "serverless-orchestrator.yml · 8 jobs" },
  { id: "op-2398", time: "Sep 08, 08:41 AM", title: "Configuration update", environment: "PROD", status: "Completed", risk: "Low", actor: "A. Patel", detail: "GitOps runtime topology · verified" },
  { id: "op-2393", time: "Sep 07, 05:27 PM", title: "Release plan created", environment: "UAT", status: "Completed", risk: "Low", actor: "B. Nguyen", detail: "daily-main-snapshot.yaml · 4 orgs" },
  { id: "op-2389", time: "Sep 07, 02:18 PM", title: "XConnect Gateway update", environment: "Hybrid", status: "Completed", risk: "Medium", actor: "S. Kim", detail: "3 gateways · generation 18" },
  { id: "op-2386", time: "Sep 07, 11:03 AM", title: "Access policy change", environment: "PROD", status: "Completed", risk: "Low", actor: "R. Davis", detail: "Role allowlist · no secret values" },
  { id: "op-2382", time: "Sep 06, 04:36 PM", title: "Deploy build v2.4.0", environment: "PROD", status: "Completed", risk: "Medium", actor: "M. Chen", detail: "production · protected environment" },
  { id: "op-2376", time: "Sep 06, 10:11 AM", title: "Rollback release", environment: "UAT", status: "Failed", risk: "Medium", actor: "J. Park", detail: "Blocked by immutable manifest check" },
  { id: "op-2370", time: "Sep 05, 03:14 PM", title: "Vault policy update", environment: "PROD", status: "Completed", risk: "High", actor: "A. Patel", detail: "Role reconciliation · approved" },
];

const gateways: Gateway[] = [
  { id: "Gateway 01", region: "US-EAST", heartbeat: "2 minutes ago", freshness: "< 1 minute", status: "Healthy" },
  { id: "Gateway 02", region: "EU-WEST", heartbeat: "3 minutes ago", freshness: "2 minutes", status: "Healthy" },
  { id: "Gateway 03", region: "AP-SOUTHEAST", heartbeat: "1 minute ago", freshness: "< 1 minute", status: "Healthy" },
];

const viewCopy: Record<Exclude<View, "overview">, { title: string; description: string }> = {
  releases: { title: "Releases", description: "统一查看跨仓库 Tag、不可变 Manifest 与发布执行。" },
  environments: { title: "Environments", description: "查看现有 Pages、SSR、Router、Cloud Run 与 Hybrid 运行边界。" },
  audit: { title: "Audit", description: "查看每次申请、MFA、审批、Workflow 与回滚的完整时间线。" },
  vault: { title: "Vault & Access", description: "只查看声明式角色边界，敏感值始终在运行时注入。" },
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function StatusDot({ tone = "success" }: { tone?: "success" | "danger" | "warning" | "muted" }) {
  const colors = { success: "bg-[var(--color-success)]", danger: "bg-[var(--color-danger)]", warning: "bg-[var(--color-warning)]", muted: "bg-[var(--color-text-subtle)]" };
  return <span className={classNames("inline-block h-2.5 w-2.5 rounded-full", colors[tone])} aria-hidden="true" />;
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "blue" | "neutral" }) {
  const tones = {
    success: "bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]",
    warning: "bg-[var(--color-warning-muted)] text-[var(--color-warning-foreground)]",
    danger: "bg-[var(--color-danger-muted)] text-[var(--color-danger-foreground)]",
    blue: "bg-[var(--color-primary-muted)] text-[var(--color-primary)]",
    neutral: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
  };
  return <span className={classNames("inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold", tones[tone])}>{children}</span>;
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={classNames("rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]", className)}>{children}</section>;
}

function EnvironmentStatus({ name, uptime, response, extra }: { name: string; uptime: string; response?: string; extra?: string }) {
  return (
    <div className="flex min-w-[14rem] flex-1 items-start gap-3 border-r border-[color:var(--color-divider)] px-4 py-1 last:border-r-0">
      <StatusDot />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-heading)]"><span>{name}</span><span className="text-xs font-medium text-[var(--color-success)]">Healthy</span></div>
        <div className="mt-2 flex items-center gap-5 text-xs text-[var(--color-text-muted)]"><span><strong className="text-sm text-[var(--color-heading)]">{uptime}</strong><br />Uptime (7d)</span>{response ? <span><strong className="text-sm text-[var(--color-heading)]">{response}</strong><br />Avg response</span> : null}{extra ? <span><strong className="text-sm text-[var(--color-heading)]">{extra}</strong><br />Regions online</span> : null}</div>
      </div>
    </div>
  );
}

function MfaDialog({ onClose, onVerified }: { onClose: () => void; onVerified: () => void }) {
  const [code, setCode] = useState("");
  const valid = /^\d{6}$/.test(code);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="mfa-title">
      <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-warning-muted)] text-[var(--color-warning-foreground)]"><LockKeyhole className="h-5 w-5" /></div><div><h2 id="mfa-title" className="text-lg font-semibold text-[var(--color-heading)]">动态验证</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">此操作需要 step-up MFA，不会把凭据发送到页面。</p></div></div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]" aria-label="关闭"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 rounded-lg border border-[color:var(--color-warning-muted)] bg-[var(--color-warning-muted)]/45 p-3 text-xs text-[var(--color-warning-foreground)]">将批准：<strong>Deploy build v2.4.2</strong> · PROD。申请人与审批人必须不同。</div>
        <label htmlFor="mfa-code" className="mt-5 block text-sm font-semibold text-[var(--color-heading)]">Authenticator code</label>
        <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" className="mt-2 h-12 w-full rounded-lg border border-[color:var(--color-surface-border-strong)] bg-[var(--color-surface-muted)] px-4 text-center text-xl tracking-[0.5em] text-[var(--color-heading)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus)]" />
        <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-text-subtle)]"><span>验证设备：已注册 Authenticator</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />04:52</span></div>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="tactile-button tactile-button-soft">取消</button><button type="button" disabled={!valid} onClick={onVerified} className="tactile-button tactile-button-primary disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck className="h-4 w-4" />验证并批准</button></div>
      </div>
    </div>
  );
}

export default function PlatformOperationsPage({ view }: { view: View }) {
  const [environment, setEnvironment] = useState<Environment>("All environments");
  const [search, setSearch] = useState("");
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [approved, setApproved] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredOperations = useMemo(() => operations.filter((operation) => {
    const matchesEnvironment = environment === "All environments" || operation.environment === environment;
    const query = search.trim().toLowerCase();
    return matchesEnvironment && (!query || `${operation.title} ${operation.actor} ${operation.environment}`.toLowerCase().includes(query));
  }), [environment, search]);

  const copyOperationId = async () => {
    await navigator.clipboard?.writeText(selectedOperation?.id ?? "op-2401");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (view !== "overview") {
    return <SecondaryView view={view} />;
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/panel" }, { label: "Platform Operations", href: "/panel/operations" }, { label: "Overview", href: "/panel/operations" }]} />

      <header className="flex flex-col gap-4 border-b border-[color:var(--color-divider)] pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">Operations console</p><h1 className="mt-1 text-2xl font-bold text-[var(--color-heading)] sm:text-3xl">Platform Operations</h1><p className="mt-1 text-sm text-[var(--color-text-subtle)]">Monitor environments, manage releases, and keep the platform healthy.</p></div>
        <div className="flex flex-wrap items-end gap-3"><label className="text-xs font-semibold text-[var(--color-text-muted)]">Environment scope<span className="relative mt-1 block"><select value={environment} onChange={(event) => setEnvironment(event.target.value as Environment)} className="h-10 min-w-[12rem] appearance-none rounded-lg border border-[color:var(--color-surface-border-strong)] bg-[var(--color-surface)] px-3 pr-9 text-sm font-medium text-[var(--color-heading)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus)]"><option>All environments</option><option>UAT</option><option>PROD</option><option>Hybrid</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[var(--color-text-subtle)]" /></span></label><div className="hidden min-w-[9rem] text-xs text-[var(--color-text-muted)] sm:block">Last updated<p className="mt-1 text-sm font-semibold text-[var(--color-heading)]">Sep 08, 2026 · <span className="text-[var(--color-success)]">● Live</span></p></div><button type="button" onClick={() => setPlanOpen(true)} className="tactile-button tactile-button-primary min-h-10 px-4"><Play className="h-4 w-4" />Create release plan</button></div>
      </header>

      <Panel className="flex flex-col gap-2 p-3 sm:flex-row sm:items-stretch sm:gap-0"><EnvironmentStatus name="UAT" uptime="99.9%" response="24 ms" /><EnvironmentStatus name="PROD" uptime="99.98%" response="28 ms" /><EnvironmentStatus name="Hybrid" uptime="100%" extra="3 / 3" /></Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <Panel className="min-w-0 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-divider)] px-4 py-4"><h2 className="text-lg font-semibold text-[var(--color-heading)]">Recent operations</h2><div className="flex items-center gap-2"><label className="relative hidden sm:block"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-text-subtle)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search operations" className="h-9 w-44 rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] pl-8 pr-3 text-xs outline-none focus:border-[var(--color-primary)]" /></label><Link href="/panel/operations/audit" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]">View all<ChevronRight className="h-3.5 w-3.5" /></Link></div></div><div className="overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-xs"><thead className="bg-[var(--color-surface-muted)]/75 text-[var(--color-text-muted)]"><tr><th className="px-4 py-3 font-semibold">Time</th><th className="px-4 py-3 font-semibold">Operation</th><th className="px-4 py-3 font-semibold">Environment</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Risk</th><th className="px-4 py-3 font-semibold">Actor</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-[var(--color-divider)]">{filteredOperations.map((operation) => <tr key={operation.id} className={classNames("cursor-pointer transition-colors hover:bg-[var(--color-primary-muted)]/35", selectedOperation?.id === operation.id && "bg-[var(--color-primary-muted)]/45")} onClick={() => setSelectedOperation(operation)}><td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">{operation.time}</td><td className="px-4 py-3"><span className="font-semibold text-[var(--color-heading)]">{operation.title}</span><span className="mt-1 block text-[11px] text-[var(--color-text-subtle)]">{operation.detail}</span></td><td className="px-4 py-3"><Badge tone={operation.environment === "PROD" ? "blue" : operation.environment === "Hybrid" ? "neutral" : "blue"}>{operation.environment}</Badge></td><td className="px-4 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><StatusDot tone={operation.status === "Failed" ? "danger" : operation.status === "Pending" ? "warning" : "success"} />{operation.status}</span></td><td className="px-4 py-3"><Badge tone={operation.risk === "High" ? "danger" : operation.risk === "Medium" ? "warning" : "success"}>{operation.risk}</Badge></td><td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">{operation.actor}</td><td className="px-4 py-3 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedOperation(operation); }} className="rounded p-1 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-hover)]" aria-label={`View ${operation.title}`}><MoreHorizontal className="h-4 w-4" /></button></td></tr>)}{filteredOperations.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]">No operations match this scope.</td></tr> : null}</tbody></table></div></Panel>

        <Panel className="p-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-[var(--color-heading)]">Approval queue</h2><Badge tone="neutral">3</Badge><Link href="/panel/operations/audit" className="ml-auto text-xs font-semibold text-[var(--color-primary)]">View all</Link></div><div className="mt-4 space-y-3"><div className="rounded-lg border border-[color:var(--color-warning-muted)] bg-[var(--color-warning-muted)]/35 p-3"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning-foreground)]" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-semibold text-[var(--color-heading)]">Deploy build v2.4.2</p><Badge tone="warning">MFA required</Badge></div><div className="mt-2 flex items-center gap-2 text-xs"><Badge tone="blue">PROD</Badge><span className="text-[var(--color-text-muted)]">Release plan</span></div><p className="mt-3 text-xs text-[var(--color-text-muted)]">Requested by M. Chen · Sep 08, 10:18 AM</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setMfaOpen(true)} className="tactile-button tactile-button-primary">Review</button><button type="button" onClick={() => setSelectedOperation(operations[1])} className="tactile-button tactile-button-soft">View details</button></div></div></div></div><div className="rounded-lg border border-[color:var(--color-surface-border)] p-3"><div className="flex items-start gap-3"><FileClock className="mt-0.5 h-4 w-4 text-[var(--color-text-muted)]" /><div><p className="font-semibold text-[var(--color-heading)]">Access policy update</p><p className="mt-2 text-xs text-[var(--color-text-muted)]"><Badge tone="blue">UAT</Badge> <span className="ml-1">Security</span></p><p className="mt-2 text-xs text-[var(--color-text-subtle)]">Pending · A. Patel · 09:42 AM</p></div><Badge tone="neutral">Pending</Badge></div></div><div className="rounded-lg border border-[color:var(--color-surface-border)] p-3"><div className="flex items-start gap-3"><Database className="mt-0.5 h-4 w-4 text-[var(--color-text-muted)]" /><div><p className="font-semibold text-[var(--color-heading)]">Enable data sync</p><p className="mt-2 text-xs text-[var(--color-text-muted)]"><Badge tone="blue">Hybrid</Badge> <span className="ml-1">Configuration</span></p><p className="mt-2 text-xs text-[var(--color-text-subtle)]">Pending · S. Kim · Sep 07</p></div><Badge tone="neutral">Pending</Badge></div></div></div></Panel>
      </div>

      <Panel className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><h2 className="text-lg font-semibold text-[var(--color-heading)]">XConnect Zero</h2><span className="inline-flex items-center gap-2 text-xs text-[var(--color-success-foreground)]"><StatusDot />All gateways operational</span></div><Link href="/panel/xconnect-zero" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]">View details<ArrowRight className="h-3.5 w-3.5" /></Link></div><div className="mt-4 grid gap-3 lg:grid-cols-3">{gateways.map((gateway) => <div key={gateway.id} className="rounded-lg border border-[color:var(--color-surface-border)] p-3.5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><StatusDot tone={gateway.status === "Healthy" ? "success" : "warning"} /><span className="font-semibold text-[var(--color-heading)]">{gateway.id}</span></div><Badge tone="neutral">{gateway.region}</Badge></div><dl className="mt-3 divide-y divide-[var(--color-divider)] text-xs"><div className="flex justify-between gap-3 py-2"><dt className="text-[var(--color-text-muted)]">Status</dt><dd className="font-medium text-[var(--color-success)]">{gateway.status}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-[var(--color-text-muted)]">Last heartbeat</dt><dd className="text-[var(--color-text)]">{gateway.heartbeat}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-[var(--color-text-muted)]">Data freshness</dt><dd className="text-[var(--color-text)]">{gateway.freshness}</dd></div><div className="flex justify-between gap-3 pt-2"><dt className="text-[var(--color-text-muted)]">Connection</dt><dd className="font-medium text-[var(--color-text)]">Secure</dd></div></dl></div>)}</div></Panel>

      {selectedOperation ? <OperationDrawer operation={selectedOperation} approved={approved} copied={copied} onCopy={copyOperationId} onClose={() => setSelectedOperation(null)} onReview={() => setMfaOpen(true)} /> : null}
      {mfaOpen ? <MfaDialog onClose={() => setMfaOpen(false)} onVerified={() => { setApproved(true); setMfaOpen(false); }} /> : null}
      {planOpen ? <ReleasePlanDialog onClose={() => setPlanOpen(false)} /> : null}
    </div>
  );
}

function OperationDrawer({ operation, approved, copied, onCopy, onClose, onReview }: { operation: Operation; approved: boolean; copied: boolean; onCopy: () => void; onClose: () => void; onReview: () => void }) {
  return <div className="fixed inset-0 z-40 flex justify-end bg-[var(--color-overlay)]/30 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-labelledby="operation-drawer-title"><button type="button" aria-label="Close operation details" onClick={onClose} className="flex-1 cursor-default" /><aside className="h-full w-full max-w-xl overflow-y-auto border-l border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)]"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">Operation detail</p><h2 id="operation-drawer-title" className="mt-1 text-xl font-semibold text-[var(--color-heading)]">{operation.title}</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">{operation.detail}</p></div><button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"><X className="h-4 w-4" /></button></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-lg bg-[var(--color-surface-muted)] p-3"><p className="text-[11px] uppercase tracking-wide text-[var(--color-text-subtle)]">Status</p><p className="mt-1 flex items-center gap-2 text-sm font-semibold"><StatusDot tone={operation.status === "Failed" ? "danger" : "success"} />{approved ? "Approved" : operation.status}</p></div><div className="rounded-lg bg-[var(--color-surface-muted)] p-3"><p className="text-[11px] uppercase tracking-wide text-[var(--color-text-subtle)]">Risk</p><p className="mt-1 text-sm font-semibold text-[var(--color-heading)]">{operation.risk}</p></div></div><div className="mt-5 divide-y divide-[var(--color-divider)] border-y border-[color:var(--color-divider)]"><div className="flex items-center justify-between py-3 text-sm"><span className="text-[var(--color-text-muted)]">Operation ID</span><button type="button" onClick={onCopy} className="inline-flex items-center gap-2 font-mono text-xs text-[var(--color-primary)]">{operation.id}{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button></div><div className="flex items-center justify-between py-3 text-sm"><span className="text-[var(--color-text-muted)]">Environment</span><Badge tone="blue">{operation.environment}</Badge></div><div className="flex items-center justify-between py-3 text-sm"><span className="text-[var(--color-text-muted)]">Requested by</span><span className="font-medium text-[var(--color-heading)]">{operation.actor}</span></div></div><div className="mt-5 rounded-lg border border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)]/45 p-3 text-sm text-[var(--color-text)]"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" /><div><p className="font-semibold">Secrets injected at runtime</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">Vault OIDC、GitHub App token、SSH 与数据库凭据不会从此页面传出。</p></div></div></div><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">Execution stages</p><ol className="mt-3 space-y-3 text-sm">{["Plan and validate", "Approval and MFA", "Vault OIDC", "GitHub App", "Execute workflow", "Record audit"].map((stage, index) => <li key={stage} className="flex items-center gap-3"><span className={classNames("flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", index < (approved ? 6 : 1) ? "bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]" : "bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)]")}>{index < (approved ? 6 : 1) ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className={index < (approved ? 6 : 1) ? "text-[var(--color-text)]" : "text-[var(--color-text-subtle)]"}>{stage}</span></li>)}</ol></div><div className="mt-6 flex justify-end gap-2"><button type="button" className="tactile-button tactile-button-soft"><ArrowRight className="h-4 w-4" />Open run</button>{!approved ? <button type="button" onClick={onReview} className="tactile-button tactile-button-primary"><ShieldCheck className="h-4 w-4" />Review with MFA</button> : <span className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-[var(--color-success-muted)] px-3 text-xs font-semibold text-[var(--color-success-foreground)]"><CheckCircle2 className="h-4 w-4" />Approved</span>}</div></aside></div>;
}

function ReleasePlanDialog({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="plan-title"><div className="w-full max-w-lg rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)]"><div className="flex items-start justify-between gap-3"><div><h2 id="plan-title" className="text-lg font-semibold text-[var(--color-heading)]">Create release plan</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">先生成只读 plan，再决定是否进入 Workflow。</p></div><button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"><X className="h-4 w-4" /></button></div>{submitted ? <div className="mt-5 rounded-lg border border-[color:var(--color-success-muted)] bg-[var(--color-success-muted)] p-4 text-sm text-[var(--color-success-foreground)]"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" />Plan created</div><p className="mt-1 text-xs">Operation op-plan-2402 已创建，等待 manifest 校验。</p></div> : <div className="mt-5 space-y-4"><label className="block text-sm font-medium text-[var(--color-heading)]">Target environment<select className="mt-1.5 h-10 w-full rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 text-sm"><option>UAT</option><option>PROD — approval required</option></select></label><label className="block text-sm font-medium text-[var(--color-heading)]">Source ref<select className="mt-1.5 h-10 w-full rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 text-sm"><option>main → resolve immutable snapshot</option><option>uat-daily-build-2026.09.08-r1</option><option>v2.4.1</option></select></label><div className="rounded-lg border border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)]/45 p-3 text-xs text-[var(--color-text-muted)]"><p className="font-semibold text-[var(--color-primary)]">Safe preview</p><p className="mt-1">将验证 4 个组织、不可变 SHA、Workflow input、Vault role boundary 和 GitOps topology。凭据只在 Runner 运行时注入。</p></div></div>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="tactile-button tactile-button-soft">{submitted ? "Close" : "Cancel"}</button>{!submitted ? <button type="button" onClick={() => setSubmitted(true)} className="tactile-button tactile-button-primary"><GitBranch className="h-4 w-4" />Generate plan</button> : null}</div></div></div>;
}

function SecondaryView({ view }: { view: Exclude<View, "overview"> }) {
  const copy = viewCopy[view];
  const isReleases = view === "releases";
  const isVault = view === "vault";
  const isAudit = view === "audit";
  const isEnvironment = view === "environments";
  return <div className="space-y-4"><Breadcrumbs items={[{ label: "Dashboard", href: "/panel" }, { label: "Platform Operations", href: "/panel/operations" }, { label: copy.title, href: `/panel/operations/${view === "vault" ? "vault-access" : view}` }]} /><header className="flex flex-col gap-2 border-b border-[color:var(--color-divider)] pb-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">Platform Operations</p><h1 className="mt-1 text-2xl font-bold text-[var(--color-heading)]">{copy.title}</h1><p className="mt-1 text-sm text-[var(--color-text-subtle)]">{copy.description}</p></div><Badge tone={isVault ? "warning" : "blue"}>{isVault ? "MFA protected" : isAudit ? "Read-only evidence" : "Current topology"}</Badge></header>{isReleases ? <ReleasesView /> : isEnvironment ? <EnvironmentView /> : isAudit ? <AuditView /> : <VaultView />}</div>;
}

function ReleasesView() {
  const [planned, setPlanned] = useState(false);
  const workflows = [
    { name: "auto-release.yaml", purpose: "跨仓库 tag / release fan-in", status: "Ready" },
    { name: "serverless-orchestrator.yml", purpose: "Pages · Router · SSR · Cloud Run", status: "Ready" },
    { name: "hybrid-orchestrator.yml", purpose: "Hybrid safe-method policy", status: "Approval" },
    { name: "selfhost-orchestrator.yml", purpose: "Self-hosted runtime rollout", status: "Approval" },
    { name: "data-migration.yaml", purpose: "Backup · checkpoint · single writer", status: "High risk" },
    { name: "validate-release-pr.yml", purpose: "Manifest / topology contract", status: "Read-only" },
  ];
  return <div className="space-y-4"><Panel className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-[var(--color-heading)]">Immutable release manifest</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">Tag 只作为入口；执行前解析为 repo SHA、image digest 和 GitOps topology hash。</p></div><Badge tone="success"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Verified</Badge></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-lg bg-[var(--color-surface-muted)] p-3"><p className="text-[11px] uppercase tracking-wide text-[var(--color-text-subtle)]">Release ID</p><p className="mt-1 font-mono text-sm font-semibold text-[var(--color-heading)]">rel-2026.09.08.1</p></div><div className="rounded-lg bg-[var(--color-surface-muted)] p-3"><p className="text-[11px] uppercase tracking-wide text-[var(--color-text-subtle)]">GitOps commit</p><p className="mt-1 font-mono text-sm font-semibold text-[var(--color-heading)]">sha:7a3c…d91e</p></div><div className="rounded-lg bg-[var(--color-surface-muted)] p-3"><p className="text-[11px] uppercase tracking-wide text-[var(--color-text-subtle)]">Topology contract</p><p className="mt-1 text-sm font-semibold text-[var(--color-heading)]">1 / 1 / 5 / 3 / 1</p><p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Pages / Router / SSR / Run / DB</p></div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)]/35 p-3 text-xs text-[var(--color-text-muted)]"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />Browser only submits a plan; Router dispatches via GitHub App with runtime OIDC/Vault credentials.</span><button type="button" onClick={() => setPlanned(true)} className="tactile-button tactile-button-primary">{planned ? "Plan created" : "Create cross-repo plan"}</button></div></Panel><Panel className="overflow-hidden"><div className="border-b border-[color:var(--color-divider)] px-4 py-4"><h2 className="text-lg font-semibold text-[var(--color-heading)]">Workflow catalog</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">Allowlist only：不能从输入拼接 workflow 文件、Vault path 或 ref。</p></div><div className="divide-y divide-[var(--color-divider)]">{workflows.map((workflow) => <div key={workflow.name} className="flex flex-wrap items-center gap-3 px-4 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-muted)] text-[var(--color-primary)]"><GitBranch className="h-4 w-4" /></div><div className="min-w-[13rem] flex-1"><p className="font-mono text-sm font-semibold text-[var(--color-heading)]">{workflow.name}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{workflow.purpose}</p></div><Badge tone={workflow.status === "High risk" ? "danger" : workflow.status === "Approval" ? "warning" : workflow.status === "Ready" ? "success" : "neutral"}>{workflow.status}</Badge><ChevronRight className="h-4 w-4 text-[var(--color-text-subtle)]" /></div>)}</div></Panel></div>;
}

function EnvironmentView() {
  const services = ["Cloudflare Pages", "frontend-router", "SSR · public", "SSR · content", "SSR · auth", "SSR · console", "SSR · workspace", "Accounts · Cloud Run", "Content · Cloud Run", "Billing · Cloud Run", "PostgreSQL / Supabase", "External XConnect-Gateway ×3"];
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"><Panel className="p-4"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-[var(--color-heading)]">Runtime topology</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">现有 Web SaaS 混合架构，未引入新平台。Gateway 数据面保持在外部 Linux 节点。</p></div><Badge tone="success"><StatusDot /> Healthy</Badge></div><div className="mt-4 flex flex-wrap gap-2">{["1 Pages", "1 Router", "5 SSR", "3 Cloud Run", "1 PostgreSQL", "3 external gateways"].map((item) => <Badge key={item} tone="blue">{item}</Badge>)}</div><div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{services.map((service, index) => <div key={service} className="flex items-center gap-3 rounded-lg border border-[color:var(--color-surface-border)] px-3 py-3 text-sm"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary-muted)] text-[var(--color-primary)]">{index < 2 ? <Globe2 className="h-4 w-4" /> : index > 9 ? <Network className="h-4 w-4" /> : index > 6 ? <Database className="h-4 w-4" /> : <ServerCog className="h-4 w-4" />}</span><span className="font-medium text-[var(--color-heading)]">{service}</span></div>)}</div></Panel><Panel className="p-4"><h2 className="text-lg font-semibold text-[var(--color-heading)]">Deployment controls</h2><div className="mt-4 space-y-3">{["Plan current topology", "Deploy UAT", "Switch Hybrid policy", "Rollback last release"].map((item, index) => <button key={item} type="button" className="flex w-full items-center justify-between rounded-lg border border-[color:var(--color-surface-border)] px-3 py-3 text-left text-sm font-medium text-[var(--color-heading)] hover:border-[color:var(--color-primary-border)] hover:bg-[var(--color-primary-muted)]/35"><span className="flex items-center gap-2">{index === 0 ? <GitCommitHorizontal className="h-4 w-4 text-[var(--color-primary)]" /> : index === 3 ? <RefreshCw className="h-4 w-4 text-[var(--color-warning)]" /> : <Play className="h-4 w-4 text-[var(--color-primary)]" />}{item}</span><ChevronRight className="h-4 w-4 text-[var(--color-text-subtle)]" /></button>)}</div></Panel></div>;
}

function AuditView() {
  return <Panel className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-divider)] px-4 py-4"><div><h2 className="text-lg font-semibold text-[var(--color-heading)]">Audit timeline</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">所有时间均来自 operation 与 Workflow 回执。</p></div><button type="button" className="tactile-button tactile-button-soft"><Copy className="h-4 w-4" />Export redacted</button></div><div className="divide-y divide-[var(--color-divider)]">{operations.map((operation) => <div key={operation.id} className="flex flex-wrap items-center gap-4 px-4 py-4"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-muted)] text-[var(--color-primary)]"><Activity className="h-4 w-4" /></div><div className="min-w-[13rem] flex-1"><p className="font-semibold text-[var(--color-heading)]">{operation.title}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{operation.actor} · {operation.environment} · {operation.time}</p></div><Badge tone={operation.status === "Failed" ? "danger" : "success"}>{operation.status}</Badge><span className="text-xs font-mono text-[var(--color-text-subtle)]">{operation.id}</span></div>)}</div></Panel>;
}

function VaultView() {
  const rows = [{ role: "platform-ops-toolkit-uat", boundary: "main · release/* · daily-build-*", access: "UAT only", status: "Verified" }, { role: "platform-ops-toolkit-prod", boundary: "v* · release/v*", access: "PROD read/apply", status: "Verified" }, { role: "platform-ops-toolkit-prod-release", boundary: "main · daily-main-snapshot only", access: "Tag authoring", status: "MFA protected" }];
  const [diffCreated, setDiffCreated] = useState(false);
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"><Panel className="overflow-hidden"><div className="border-b border-[color:var(--color-divider)] px-4 py-4"><h2 className="text-lg font-semibold text-[var(--color-heading)]">Role boundaries</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">只展示 repo、Workflow、ref 和环境边界；不会读取 secret value。</p></div><div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-left text-xs"><thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"><tr><th className="px-4 py-3">Role</th><th className="px-4 py-3">Ref boundary</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-[var(--color-divider)]">{rows.map((row) => <tr key={row.role}><td className="px-4 py-4 font-mono font-medium text-[var(--color-heading)]">{row.role}</td><td className="px-4 py-4 text-[var(--color-text-muted)]">{row.boundary}</td><td className="px-4 py-4 text-[var(--color-text-muted)]">{row.access}</td><td className="px-4 py-4"><Badge tone={row.status === "MFA protected" ? "warning" : "success"}>{row.status}</Badge></td></tr>)}</tbody></table></div></Panel><Panel className="p-4"><div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-[var(--color-primary)]" /><h2 className="text-lg font-semibold text-[var(--color-heading)]">Safe role update</h2></div><p className="mt-2 text-sm text-[var(--color-text-muted)]">角色更新先展示声明式 diff，再进入受保护 Workflow。</p><div className="mt-4 space-y-3 text-xs text-[var(--color-text-muted)]"><div className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success)]" />OIDC short-lived token</div><div className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success)]" />Route-specific permission</div><div className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success)]" />Step-up MFA + independent approval</div><div className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-warning)]" />No VAULT_TOKEN field in Web</div></div>{diffCreated ? <div className="mt-4 rounded-lg bg-[var(--color-success-muted)] p-3 text-xs font-medium text-[var(--color-success-foreground)]">Role diff op-role-2403 已生成，下一步需要独立审批与 MFA。</div> : null}<button type="button" onClick={() => setDiffCreated(true)} className="tactile-button tactile-button-primary mt-5 w-full"><GitBranch className="h-4 w-4" />{diffCreated ? "Role diff created" : "Create role diff"}</button></Panel></div>;
}
