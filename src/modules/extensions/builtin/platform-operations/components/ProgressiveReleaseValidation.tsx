"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  ShieldAlert,
  ShieldCheck,
  RotateCw,
  Info,
  CheckCircle2,
  XCircle,
  FlaskConical,
  ChevronDown,
  Layers,
  Database,
  ExternalLink,
} from "lucide-react";
import type { ProgressiveReleasePayload } from "@/app/api/operations/progressive-release/route";

interface Props {
  initialEnvironment?: "PROD" | "SIT";
}

const MATRIX_COLUMNS = [
  { service: "Console", endpoint: "/healthz" },
  { service: "Console", endpoint: "/login" },
  { service: "Console", endpoint: "/panel/agent" },
  { service: "Accounts", endpoint: "/healthz" },
  { service: "Accounts", endpoint: "/readyz" },
  { service: "Accounts", endpoint: "/api/ping" },
  { service: "Accounts", endpoint: "/api/billing/plans" },
  { service: "Billing", endpoint: "/healthz" },
  { service: "Billing", endpoint: "/readyz" },
  { service: "Billing", endpoint: "/api/ping" },
] as const;

export default function ProgressiveReleaseValidation({
  initialEnvironment = "PROD",
}: Props) {
  const [environment, setEnvironment] = useState<"PROD" | "SIT">(initialEnvironment);
  const [dataSourceMode, setDataSourceMode] = useState<"live" | "mock">("live");
  const [data, setData] = useState<ProgressiveReleasePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [autoRefresh] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(30);

  // 获取数据函数
  const fetchData = useCallback(
    async (isManual = false) => {
      if (isManual) setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          environment,
          mock: dataSourceMode === "mock" ? "true" : "false",
        });
        const res = await fetch(`/api/operations/progressive-release?${queryParams.toString()}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const payload: ProgressiveReleasePayload = await res.json();
          setData(payload);
          setLastRefreshedAt(new Date().toTimeString().slice(0, 8) + " UTC");
        }
      } catch (err) {
        console.error("Failed to load progressive release data", err);
      } finally {
        setIsLoading(false);
      }
    },
    [environment, dataSourceMode]
  );

  useEffect(() => {
    fetchData(true);
    setRefreshCountdown(30);
  }, [fetchData]);

  // 定时刷新机制
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchData(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const p = data;
  const isGateBlocked = p?.gateStatus.status === "BLOCKED";

  return (
    <div className="w-full min-w-0 bg-[var(--color-surface-elevated)] text-[var(--color-text)] font-sans antialiased p-3 sm:p-5 rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] shadow-[var(--shadow-soft)] backdrop-blur transition-colors">
      {/* 顶部控制与面包屑栏 (Grafana Topbar 风格) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[color:var(--color-surface-border)] text-xs">
        <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
          <span className="hover:text-[var(--color-text)] transition-colors cursor-pointer flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Grafana Dashboards
          </span>
          <span>&gt;</span>
          <span className="hover:text-[var(--color-text)] transition-colors cursor-pointer">Release Validation</span>
          <span>&gt;</span>
          <span className="text-[var(--color-text)] font-medium">Progressive Release – SaaS Services</span>
        </div>

        <div className="flex items-center gap-2">
          {/* 数据源模式选择器 */}
          <div className="flex items-center rounded-lg bg-[var(--color-surface-muted)] border border-[color:var(--color-surface-border)] p-0.5">
            <button
              type="button"
              onClick={() => setDataSourceMode("live")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                dataSourceMode === "live"
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
              title="连接到 https://observability.svc.plus 真实 VictoriaMetrics"
            >
              <Database className="w-3 h-3" />
              Live VM
            </button>
            <button
              type="button"
              onClick={() => setDataSourceMode("mock")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                dataSourceMode === "mock"
                  ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm border border-[color:var(--color-surface-border)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
              title="呈现设计原型图的高保真样本数据"
            >
              Mock Data
            </button>
          </div>

          {/* 时间窗口选择卡片 */}
          <div className="flex items-center gap-1.5 bg-[var(--color-surface-muted)] border border-[color:var(--color-surface-border)] px-2.5 py-1 rounded-lg text-[var(--color-text)]">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <span className="font-medium">Last 15 minutes</span>
            <ChevronDown className="w-3 h-3 text-[var(--color-text-subtle)]" />
          </div>

          {/* 刷新控制 */}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] border border-[color:var(--color-surface-border)] px-2.5 py-1 rounded-lg text-[var(--color-text)] transition-colors"
            title="手动刷新"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[var(--color-primary)] ${isLoading ? "animate-spin" : ""}`} />
            <span className="font-mono">{autoRefresh ? `${refreshCountdown}s` : "Off"}</span>
          </button>
        </div>
      </div>

      {/* 主标题区 */}
      <div className="mt-4 mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-heading)]">
            Progressive Release Validation
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 flex items-center gap-1.5">
            Service × API status matrix for progressive releases ({environment})
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-success)]"></span>
            <a
              href="https://observability.svc.plus"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] hover:underline inline-flex items-center gap-0.5 text-[11px]"
            >
              observability.svc.plus
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </p>
        </div>

        {/* 环境切换药丸 */}
        <div className="flex items-center gap-1 bg-[var(--color-surface-muted)] border border-[color:var(--color-surface-border)] p-1 rounded-lg text-xs">
          <span className="text-[var(--color-text-subtle)] px-1.5 text-[11px]">ENV:</span>
          <button
            type="button"
            onClick={() => setEnvironment("PROD")}
            className={`px-2.5 py-0.5 rounded font-semibold transition-colors ${
              environment === "PROD"
                ? "bg-[var(--color-danger,#dc2626)] text-white shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            PROD
          </button>
          <button
            type="button"
            onClick={() => setEnvironment("SIT")}
            className={`px-2.5 py-0.5 rounded font-semibold transition-colors ${
              environment === "SIT"
                ? "bg-[var(--color-primary,#0058bd)] text-white shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            SIT
          </button>
        </div>
      </div>

      {/* 顶部三大 KPI 卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
        {/* Environment 卡片 */}
        <div className="md:col-span-3 bg-[var(--color-surface)] border border-[color:var(--color-surface-border)] rounded-[var(--radius-xl)] p-3.5 flex flex-col justify-between shadow-[var(--shadow-sm)] backdrop-blur">
          <span className="text-xs text-[var(--color-text-muted)]">Environment</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--color-heading)] font-mono">
              {p?.environment || environment}
            </span>
            <span className="text-[11px] text-[var(--color-text-subtle)] font-mono">
              ({p?.cluster || (environment === "PROD" ? "PROD-K3S-V6" : "SIT-K3S-V6")})
            </span>
          </div>
        </div>

        {/* Observation window 卡片 */}
        <div className="md:col-span-4 bg-[var(--color-surface)] border border-[color:var(--color-surface-border)] rounded-[var(--radius-xl)] p-3.5 flex items-center gap-3.5 shadow-[var(--shadow-sm)] backdrop-blur">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-muted)] border border-[color:var(--color-surface-border)] flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[var(--color-text-muted)] block">Observation window</span>
            <span className="text-xs sm:text-sm font-medium text-[var(--color-heading)] truncate block mt-0.5 font-mono">
              {p?.observationWindow.formattedTimeRange || "Last 15 minutes (14:45 – 15:00 UTC)"}
            </span>
          </div>
        </div>

        {/* Release gate (overall) 门禁卡片 */}
        <div className="md:col-span-5 bg-[var(--color-surface)] border border-[color:var(--color-surface-border)] rounded-[var(--radius-xl)] p-3.5 flex items-center justify-between gap-3 shadow-[var(--shadow-sm)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                isGateBlocked
                  ? "bg-[var(--color-danger-muted)] border-[color:var(--color-danger)]/30 text-[var(--color-danger)]"
                  : "bg-[var(--color-success-muted)] border-[color:var(--color-success)]/30 text-[var(--color-success)]"
              }`}
            >
              {isGateBlocked ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-muted)] block">Release gate (overall)</span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold tracking-wider ${
                    isGateBlocked
                      ? "bg-[var(--color-danger,#dc2626)] text-white"
                      : "bg-[var(--color-success,#16a34a)] text-white"
                  }`}
                >
                  {p?.gateStatus.status || "BLOCKED"}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] font-mono">
                  {p?.gateStatus.summary || "1 / 10 checks failed"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service × Endpoint Status 状态矩阵 (核心区块) */}
      <div className="bg-[var(--color-surface)] border border-[color:var(--color-surface-border)] rounded-[var(--radius-xl)] p-3.5 mb-4 shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-[var(--color-heading)]">
          <span>Service × Endpoint Status</span>
          <Info className="w-3.5 h-3.5 text-[var(--color-text-subtle)] cursor-pointer hover:text-[var(--color-text)]" />
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[850px] border-collapse text-center">
            {/* 第一层表头：服务分组 */}
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="bg-[var(--color-surface-muted)] border border-[color:var(--color-surface-border)] px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] w-36 align-middle"
                >
                  Service
                </th>
                <th
                  colSpan={3}
                  className="bg-[var(--color-primary-muted)]/60 border border-[color:var(--color-surface-border)] py-1.5 px-2 text-xs font-semibold text-[var(--color-primary)] tracking-wide"
                >
                  Console <span className="text-[11px] font-normal opacity-85 font-mono">(console.svc.plus)</span>
                </th>
                <th
                  colSpan={4}
                  className="bg-[var(--color-accent-muted)]/60 border border-[color:var(--color-surface-border)] py-1.5 px-2 text-xs font-semibold text-[var(--color-accent-foreground)] tracking-wide"
                >
                  Accounts <span className="text-[11px] font-normal opacity-85 font-mono">(accounts.svc.plus)</span>
                </th>
                <th
                  colSpan={3}
                  className="bg-[var(--color-warning-muted)]/60 border border-[color:var(--color-surface-border)] py-1.5 px-2 text-xs font-semibold text-[var(--color-warning-foreground)] tracking-wide"
                >
                  Billing <span className="text-[11px] font-normal opacity-85 font-mono">(billing.svc.plus)</span>
                </th>
              </tr>
              {/* 第二层表头：端点路径 */}
              <tr className="bg-[var(--color-surface-muted)]/70 text-[11px] text-[var(--color-text-muted)] font-mono border-b border-[color:var(--color-surface-border)]">
                <th className="border border-[color:var(--color-surface-border)] py-1 px-1 font-normal">/healthz</th>
                <th className="border border-[color:var(--color-surface-border)] py-1 px-1 font-normal">/login</th>
                <th className="border border-[color:var(--color-surface-border)] py-1 px-1 font-normal">/panel/agent</th>
                <th className="border border-[color:var(--color-surface-border)] py-1 px-1 font-normal">/healthz</th>
                <th className="border border-[color:var(--color-surface-border)] py-1 px-1 font-normal">/readyz</th>
                <th className="border border-[color:var(--color-surface-border)] py-1 px-1 font-normal">/api/ping</th>
                <th className="border border-[color:var(--color-surface-border)] py-1 px-1 font-normal">/api/billing/plans</th>
                <th className="border border-[color:var(--color-surface-border)] py-1 px-1 font-normal">/healthz</th>
                <th className="border border-[color:var(--color-surface-border)] py-1 px-1 font-normal">/readyz</th>
                <th className="border border-[color:var(--color-surface-border)] py-1 px-1 font-normal">/api/ping</th>
              </tr>
            </thead>

            {/* 动态渲染服务行与指标单元格 */}
            <tbody className="divide-y divide-[color:var(--color-surface-border)]">
              {(p?.serviceMatrix?.rows || [
                { service: "Console", domain: "console.svc.plus", cells: {} },
                { service: "Accounts", domain: "accounts.svc.plus", cells: {} },
                { service: "Billing", domain: "billing.svc.plus", cells: {} },
              ]).map((row) => (
                <tr key={row.service} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                  <td className="bg-[var(--color-surface-muted)]/40 border border-[color:var(--color-surface-border)] px-3 py-2 text-left">
                    <div className="text-xs font-semibold text-[var(--color-heading)]">{row.service}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)] font-mono">{row.domain}</div>
                  </td>
                  {MATRIX_COLUMNS.map((col) => {
                    const cellKey = `${col.service}:${col.endpoint}`;
                    const cell = row.cells?.[cellKey];

                    if (!cell || !cell.isRelevant) {
                      return (
                        <td key={cellKey} className="border border-[color:var(--color-surface-border)] text-[var(--color-text-subtle)] font-mono text-sm">
                          —
                        </td>
                      );
                    }

                    if (cell.result === "FAIL") {
                      return (
                        <td key={cellKey} className="border border-[color:var(--color-surface-border)] p-1.5">
                          <div className="bg-[var(--color-danger-muted)]/70 border border-[color:var(--color-danger)]/40 rounded p-1.5 flex flex-col items-center justify-center shadow-sm">
                            <span className="text-[10px] font-bold text-[var(--color-danger-foreground,#7f1d1d)] bg-[var(--color-danger-muted)] px-1.5 py-0.5 rounded leading-none">
                              FAIL
                            </span>
                            <span className="text-xs font-bold text-[var(--color-danger-foreground,#7f1d1d)] font-mono mt-1">
                              {cell.httpCode ?? 503}
                            </span>
                            <span className="text-[10px] text-[var(--color-danger-foreground,#7f1d1d)] font-mono">
                              p95 {cell.p95LatencyMs?.toLocaleString() ?? "1,204"} ms
                            </span>
                          </div>
                        </td>
                      );
                    }

                    if (cell.result === "NO DATA") {
                      return (
                        <td key={cellKey} className="border border-[color:var(--color-surface-border)] p-1.5">
                          <div className="bg-[var(--color-surface-muted)] border border-[color:var(--color-surface-border)] rounded p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-bold text-[var(--color-text-subtle)] bg-[var(--color-surface)] px-1.5 py-0.5 rounded leading-none">
                              NO DATA
                            </span>
                            <span className="text-xs font-bold text-[var(--color-text-subtle)] font-mono mt-1">—</span>
                            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">p95 —</span>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={cellKey} className="border border-[color:var(--color-surface-border)] p-1.5">
                        <div className="bg-[var(--color-success-muted)]/50 border border-[color:var(--color-success)]/30 rounded p-1.5 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold text-[var(--color-success-foreground,#166534)] bg-[var(--color-success-muted)] px-1.5 py-0.5 rounded leading-none">
                            PASS
                          </span>
                          <span className="text-xs font-bold text-[var(--color-heading)] font-mono mt-1">
                            {cell.httpCode ?? 200}
                          </span>
                          <span className="text-[10px] text-[var(--color-success-foreground,#166534)] font-mono">
                            p95 {cell.p95LatencyMs ?? 0} ms
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flagger (Progressive Release) 进度表格 */}
      <div className="bg-[var(--color-surface)] border border-[color:var(--color-surface-border)] rounded-[var(--radius-xl)] p-3.5 mb-4 shadow-[var(--shadow-sm)] overflow-hidden">
        <h2 className="text-xs font-semibold text-[var(--color-heading)] mb-3">Flagger (Progressive Release)</h2>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[color:var(--color-surface-border)] text-[var(--color-text-muted)]">
                <th className="py-2 px-3 font-medium w-48">Service</th>
                <th className="py-2 px-3 font-medium w-36">Flagger phase</th>
                <th className="py-2 px-3 font-medium w-40">Weight (candidate)</th>
                <th className="py-2 px-3 font-medium">Traffic (primary vs candidate)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-surface-border)]">
              {(p?.flaggerServices || []).map((fs) => {
                const isProgressing = fs.phase === "Progressing";
                const isSucceeded = fs.phase === "Succeeded";

                return (
                  <tr key={fs.service} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-[var(--color-heading)]">{fs.service}</span>{" "}
                      <span className="text-[11px] text-[var(--color-text-muted)] font-mono">{fs.serviceDomain}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          isProgressing
                            ? "bg-[var(--color-primary-muted)] text-[var(--color-primary)] border-[color:var(--color-primary)]/20"
                            : isSucceeded
                            ? "bg-[var(--color-success-muted)] text-[var(--color-success)] border-[color:var(--color-success)]/20"
                            : "bg-[var(--color-danger-muted)] text-[var(--color-danger)] border-[color:var(--color-danger)]/20"
                        }`}
                      >
                        {fs.phase}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-[var(--color-heading)]">
                      {fs.weight !== null ? `${fs.weight}%` : "0%"}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-48 sm:w-64 bg-[var(--color-surface-muted)] border border-[color:var(--color-surface-border)] rounded-sm overflow-hidden flex">
                          <div
                            className="h-full bg-[#22c55e] transition-all"
                            style={{ width: `${fs.primaryTrafficPct}%` }}
                            title={`Primary ${fs.primaryTrafficPct}%`}
                          ></div>
                          <div
                            className="h-full bg-[#3b82f6] transition-all"
                            style={{ width: `${fs.candidateTrafficPct}%` }}
                            title={`Candidate ${fs.candidateTrafficPct}%`}
                          ></div>
                        </div>
                        <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                          Primary {fs.primaryTrafficPct}% &nbsp;|&nbsp; Candidate {fs.candidateTrafficPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 10 Endpoint Details 探测详细宽表 */}
      <div className="bg-[var(--color-surface)] border border-[color:var(--color-surface-border)] rounded-[var(--radius-xl)] p-3.5 mb-4 shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-[var(--color-heading)]">
              Top 10 Endpoint Details {dataSourceMode === "mock" ? "(Sample Mock Data)" : "(Live Data)"}
            </h2>
            <span className="text-[10px] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] px-2 py-0.5 rounded border border-[color:var(--color-surface-border)] font-mono">
              {dataSourceMode === "mock" ? "SAMPLE MOCK DATA" : "OBSERVABILITY VM"}
            </span>
          </div>

          <div className="text-[11px] font-mono text-[var(--color-text-muted)]">
            10/10 checks •{" "}
            <span className={p?.gateStatus.failedChecks ? "text-[var(--color-danger)] font-semibold" : "text-[var(--color-success)] font-semibold"}>
              {p?.gateStatus.failedChecks ?? 0} failed
            </span>{" "}
            • Updated: {lastRefreshedAt || p?.updatedAtUtc || "14:34:02 UTC"}
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[color:var(--color-surface-border)] text-[var(--color-text-muted)] text-[11px]">
                <th className="py-2 px-3 w-10">#</th>
                <th className="py-2 px-3 w-28">Service</th>
                <th className="py-2 px-3">Endpoint (GET)</th>
                <th className="py-2 px-3 w-28">Expected HTTP</th>
                <th className="py-2 px-3 w-28">Observed HTTP</th>
                <th className="py-2 px-3 w-28">p95 Latency</th>
                <th className="py-2 px-3 w-28">Freshness (age)</th>
                <th className="py-2 px-3 w-24">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-surface-border)]">
              {(p?.endpoints || []).map((ep) => {
                const isFail = ep.result === "FAIL";
                const isConsole = ep.service === "Console";
                const isAccounts = ep.service === "Accounts";

                return (
                  <tr key={ep.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                    <td className="py-2 px-3 text-[var(--color-text-subtle)]">{ep.order}</td>
                    <td className="py-2 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          isConsole
                            ? "bg-[var(--color-primary-muted)] text-[var(--color-primary)] border-[color:var(--color-primary)]/20"
                            : isAccounts
                            ? "bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)] border-[color:var(--color-accent-foreground)]/20"
                            : "bg-[var(--color-warning-muted)] text-[var(--color-warning-foreground)] border-[color:var(--color-warning-foreground)]/20"
                        }`}
                      >
                        {ep.service}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[var(--color-heading)] font-medium">{ep.endpoint}</td>
                    <td className="py-2 px-3 text-[var(--color-text-muted)]">{ep.expectedHttp}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isFail
                            ? "bg-[var(--color-danger-muted)] text-[var(--color-danger)]"
                            : "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                        }`}
                      >
                        {ep.observedHttp}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[var(--color-heading)]">{ep.p95LatencyMs.toLocaleString()} ms</td>
                    <td className="py-2 px-3 text-[var(--color-text-muted)]">{ep.freshnessSec} s</td>
                    <td className="py-2 px-3">
                      {isFail ? (
                        <span className="flex items-center gap-1 text-[var(--color-danger)] font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          FAIL
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[var(--color-success)] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          PASS
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 底部 Callout 两大区域 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* 左侧 Gate rule 熔断规则高亮条 */}
        <div className="md:col-span-8 bg-[var(--color-surface)] border border-[color:var(--color-surface-border)] rounded-[var(--radius-xl)] p-3.5 flex items-start gap-2.5 text-xs text-[var(--color-text-muted)] leading-relaxed shadow-[var(--shadow-sm)] backdrop-blur">
          <Info className="w-4 h-4 text-[var(--color-text-subtle)] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[var(--color-heading)]">Gate rule:</span> The release is{" "}
            <span className="font-bold text-[var(--color-heading)] tracking-wide">BLOCKED</span> if any endpoint is
            failed, stale (exceeds freshness), missing samples (NO DATA), or if the candidate
            request sample is insufficient.
          </div>
        </div>

        {/* 右侧 Candidate sample 样本数指标卡 */}
        <div className="md:col-span-4 bg-[var(--color-surface)] border border-[color:var(--color-surface-border)] rounded-[var(--radius-xl)] p-3.5 flex items-center gap-3 shadow-[var(--shadow-sm)] backdrop-blur">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-muted)] border border-[color:var(--color-surface-border)] flex items-center justify-center shrink-0">
            <FlaskConical className="w-4 h-4 text-[var(--color-text-muted)]" />
          </div>
          <div>
            <div className="text-xs text-[var(--color-heading)]">
              <span className="text-[var(--color-text-muted)]">Candidate sample:</span>{" "}
              <span className="font-bold font-mono">
                {p?.candidateSample.requestsCount.toLocaleString() ?? "34,862"} requests
              </span>
            </div>
            <div className="text-[11px] text-[var(--color-success)] font-medium mt-0.5 font-mono">
              {p?.candidateSample.summary ?? "(sufficient, ≥ 10,000)"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
