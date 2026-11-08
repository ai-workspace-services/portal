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

export default function ProgressiveReleaseValidation({
  initialEnvironment = "PROD",
}: Props) {
  const [environment, setEnvironment] = useState<"PROD" | "SIT">(initialEnvironment);
  const [dataSourceMode, setDataSourceMode] = useState<"live" | "mock">("mock");
  const [data, setData] = useState<ProgressiveReleasePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);
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

  return (
    <div className="w-full min-w-0 bg-[#0b0d13] text-[#e2e8f0] font-sans antialiased p-3 sm:p-5 rounded-lg border border-[#1b2030] shadow-2xl selection:bg-[#2563eb] selection:text-white">
      {/* 顶部控制与面包屑栏 (Grafana Topbar 风格) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1b2030] text-xs">
        <div className="flex items-center gap-1.5 text-[#94a3b8]">
          <span className="hover:text-white transition-colors cursor-pointer flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#3b82f6]" />
            Grafana Dashboards
          </span>
          <span>&gt;</span>
          <span className="hover:text-white transition-colors cursor-pointer">Release Validation</span>
          <span>&gt;</span>
          <span className="text-[#cbd5e1] font-medium">Progressive Release – SaaS Services</span>
        </div>

        <div className="flex items-center gap-2">
          {/* 数据源模式选择器 */}
          <div className="flex items-center rounded bg-[#161a26] border border-[#273044] p-0.5">
            <button
              type="button"
              onClick={() => setDataSourceMode("live")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                dataSourceMode === "live"
                  ? "bg-[#2563eb] text-white shadow-sm"
                  : "text-[#94a3b8] hover:text-white"
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
                  ? "bg-[#334155] text-white shadow-sm"
                  : "text-[#94a3b8] hover:text-white"
              }`}
              title="呈现设计原型图的高保真样本数据"
            >
              Mock Data
            </button>
          </div>

          {/* 时间窗口选择卡片 */}
          <div className="flex items-center gap-1.5 bg-[#161a26] border border-[#273044] px-2.5 py-1 rounded text-[#cbd5e1]">
            <Calendar className="w-3.5 h-3.5 text-[#94a3b8]" />
            <span className="font-medium">Last 15 minutes</span>
            <ChevronDown className="w-3 h-3 text-[#64748b]" />
          </div>

          {/* 刷新控制 */}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-[#161a26] hover:bg-[#1e2536] border border-[#273044] px-2.5 py-1 rounded text-[#cbd5e1] transition-colors"
            title="手动刷新"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#3b82f6] ${isLoading ? "animate-spin" : ""}`} />
            <span className="font-mono">{autoRefresh ? `${refreshCountdown}s` : "Off"}</span>
          </button>
        </div>
      </div>

      {/* 主标题区 */}
      <div className="mt-4 mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Progressive Release Validation
          </h1>
          <p className="text-xs text-[#94a3b8] mt-1 flex items-center gap-1.5">
            Service × API status matrix for progressive releases ({environment})
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e]"></span>
            <a
              href="https://observability.svc.plus"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3b82f6] hover:underline inline-flex items-center gap-0.5 text-[11px]"
            >
              observability.svc.plus
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </p>
        </div>

        {/* 环境切换药丸 */}
        <div className="flex items-center gap-1 bg-[#141824] border border-[#242c3f] p-1 rounded-md text-xs">
          <span className="text-[#64748b] px-1.5 text-[11px]">ENV:</span>
          <button
            type="button"
            onClick={() => setEnvironment("PROD")}
            className={`px-2.5 py-0.5 rounded font-semibold transition-colors ${
              environment === "PROD"
                ? "bg-[#dc2626] text-white shadow-sm"
                : "text-[#94a3b8] hover:text-white"
            }`}
          >
            PROD
          </button>
          <button
            type="button"
            onClick={() => setEnvironment("SIT")}
            className={`px-2.5 py-0.5 rounded font-semibold transition-colors ${
              environment === "SIT"
                ? "bg-[#0ea5e9] text-white shadow-sm"
                : "text-[#94a3b8] hover:text-white"
            }`}
          >
            SIT
          </button>
        </div>
      </div>

      {/* 顶部三大 KPI 卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
        {/* Environment 卡片 */}
        <div className="md:col-span-3 bg-[#121520] border border-[#1e2436] rounded-md p-3.5 flex flex-col justify-between shadow-sm">
          <span className="text-xs text-[#8e9bb0]">Environment</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white font-mono">
              {p?.environment || environment}
            </span>
            <span className="text-[11px] text-[#64748b] font-mono">
              ({p?.cluster || (environment === "PROD" ? "PROD-K3S-V6" : "SIT-K3S-V6")})
            </span>
          </div>
        </div>

        {/* Observation window 卡片 */}
        <div className="md:col-span-4 bg-[#121520] border border-[#1e2436] rounded-md p-3.5 flex items-center gap-3.5 shadow-sm">
          <div className="w-9 h-9 rounded bg-[#181d2c] border border-[#262f46] flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-[#94a3b8]" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[#8e9bb0] block">Observation window</span>
            <span className="text-xs sm:text-sm font-medium text-white truncate block mt-0.5 font-mono">
              {p?.observationWindow.formattedTimeRange || "Last 15 minutes (14:45 – 15:00 UTC)"}
            </span>
          </div>
        </div>

        {/* Release gate (overall) 门禁卡片 */}
        <div className="md:col-span-5 bg-[#121520] border border-[#1e2436] rounded-md p-3.5 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#2b1419] border border-[#521b24] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-[#ef4444]" />
            </div>
            <div>
              <span className="text-xs text-[#8e9bb0] block">Release gate (overall)</span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold tracking-wider ${
                    p?.gateStatus.status === "BLOCKED"
                      ? "bg-[#dc2626] text-white"
                      : "bg-[#16a34a] text-white"
                  }`}
                >
                  {p?.gateStatus.status || "BLOCKED"}
                </span>
                <span className="text-xs text-[#cbd5e1] font-mono">
                  {p?.gateStatus.summary || "1 / 10 checks failed"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service × Endpoint Status 状态矩阵 (核心区块) */}
      <div className="bg-[#121520] border border-[#1e2436] rounded-md p-3.5 mb-4 shadow-sm overflow-hidden">
        <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-white">
          <span>Service × Endpoint Status</span>
          <Info className="w-3.5 h-3.5 text-[#64748b] cursor-pointer hover:text-[#94a3b8]" />
        </div>

        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#252d40]">
          <table className="w-full min-w-[850px] border-collapse text-center">
            {/* 第一层表头：服务分组 */}
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="bg-[#171b29] border border-[#20273a] px-3 py-2 text-left text-xs font-medium text-[#94a3b8] w-36 align-middle"
                >
                  Service
                </th>
                <th
                  colSpan={3}
                  className="bg-[#1d2745] border border-[#20273a] py-1.5 px-2 text-xs font-semibold text-white tracking-wide"
                >
                  Console <span className="text-[11px] font-normal text-[#93c5fd] font-mono">(console.svc.plus)</span>
                </th>
                <th
                  colSpan={4}
                  className="bg-[#242145] border border-[#20273a] py-1.5 px-2 text-xs font-semibold text-white tracking-wide"
                >
                  Accounts <span className="text-[11px] font-normal text-[#c4b5fd] font-mono">(accounts.svc.plus)</span>
                </th>
                <th
                  colSpan={3}
                  className="bg-[#382d18] border border-[#20273a] py-1.5 px-2 text-xs font-semibold text-white tracking-wide"
                >
                  Billing
                </th>
              </tr>
              {/* 第二层表头：端点路径 */}
              <tr className="bg-[#141826] text-[11px] text-[#94a3b8] font-mono border-b border-[#20273a]">
                <th className="border border-[#20273a] py-1 px-1 font-normal">/healthz</th>
                <th className="border border-[#20273a] py-1 px-1 font-normal">/login</th>
                <th className="border border-[#20273a] py-1 px-1 font-normal">/panel/agent</th>
                <th className="border border-[#20273a] py-1 px-1 font-normal">/healthz</th>
                <th className="border border-[#20273a] py-1 px-1 font-normal">/readyz</th>
                <th className="border border-[#20273a] py-1 px-1 font-normal">/api/ping</th>
                <th className="border border-[#20273a] py-1 px-1 font-normal">/api/billing/plans</th>
                <th className="border border-[#20273a] py-1 px-1 font-normal">/healthz</th>
                <th className="border border-[#20273a] py-1 px-1 font-normal">/readyz</th>
                <th className="border border-[#20273a] py-1 px-1 font-normal">/api/ping</th>
              </tr>
            </thead>

            {/* 矩阵三行数据 */}
            <tbody className="divide-y divide-[#20273a]">
              {/* 行 1: Console */}
              <tr className="hover:bg-[#151928] transition-colors">
                <td className="bg-[#171b29] border border-[#20273a] px-3 py-2 text-left">
                  <div className="text-xs font-semibold text-white">Console</div>
                  <div className="text-[10px] text-[#64748b] font-mono">console.svc.plus</div>
                </td>
                {/* Console /healthz */}
                <td className="border border-[#20273a] p-1.5">
                  <div className="bg-[#0e271c] border border-[#174f32] rounded p-1.5 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#4ade80] bg-[#143d27] px-1.5 py-0.5 rounded leading-none">
                      PASS
                    </span>
                    <span className="text-xs font-bold text-white font-mono mt-1">200</span>
                    <span className="text-[10px] text-[#86efac] font-mono">p95 38 ms</span>
                  </div>
                </td>
                {/* Console /login */}
                <td className="border border-[#20273a] p-1.5">
                  <div className="bg-[#0e271c] border border-[#174f32] rounded p-1.5 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#4ade80] bg-[#143d27] px-1.5 py-0.5 rounded leading-none">
                      PASS
                    </span>
                    <span className="text-xs font-bold text-white font-mono mt-1">200</span>
                    <span className="text-[10px] text-[#86efac] font-mono">p95 182 ms</span>
                  </div>
                </td>
                {/* Console /panel/agent */}
                <td className="border border-[#20273a] p-1.5">
                  <div className="bg-[#0e271c] border border-[#174f32] rounded p-1.5 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#4ade80] bg-[#143d27] px-1.5 py-0.5 rounded leading-none">
                      PASS
                    </span>
                    <span className="text-xs font-bold text-white font-mono mt-1">307</span>
                    <span className="text-[10px] text-[#86efac] font-mono">p95 246 ms</span>
                  </div>
                </td>
                {/* 其余 7 列为破折号 */}
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
              </tr>

              {/* 行 2: Accounts */}
              <tr className="hover:bg-[#151928] transition-colors">
                <td className="bg-[#171b29] border border-[#20273a] px-3 py-2 text-left">
                  <div className="text-xs font-semibold text-white">Accounts</div>
                  <div className="text-[10px] text-[#64748b] font-mono">accounts.svc.plus</div>
                </td>
                {/* 前 3 列破折号 */}
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                {/* Accounts /healthz */}
                <td className="border border-[#20273a] p-1.5">
                  <div className="bg-[#0e271c] border border-[#174f32] rounded p-1.5 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#4ade80] bg-[#143d27] px-1.5 py-0.5 rounded leading-none">
                      PASS
                    </span>
                    <span className="text-xs font-bold text-white font-mono mt-1">200</span>
                    <span className="text-[10px] text-[#86efac] font-mono">p95 41 ms</span>
                  </div>
                </td>
                {/* Accounts /readyz */}
                <td className="border border-[#20273a] p-1.5">
                  <div className="bg-[#0e271c] border border-[#174f32] rounded p-1.5 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#4ade80] bg-[#143d27] px-1.5 py-0.5 rounded leading-none">
                      PASS
                    </span>
                    <span className="text-xs font-bold text-white font-mono mt-1">200</span>
                    <span className="text-[10px] text-[#86efac] font-mono">p95 57 ms</span>
                  </div>
                </td>
                {/* Accounts /api/ping */}
                <td className="border border-[#20273a] p-1.5">
                  <div className="bg-[#0e271c] border border-[#174f32] rounded p-1.5 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#4ade80] bg-[#143d27] px-1.5 py-0.5 rounded leading-none">
                      PASS
                    </span>
                    <span className="text-xs font-bold text-white font-mono mt-1">200</span>
                    <span className="text-[10px] text-[#86efac] font-mono">p95 64 ms</span>
                  </div>
                </td>
                {/* Accounts /api/billing/plans (FAIL) */}
                <td className="border border-[#20273a] p-1.5">
                  <div className="bg-[#2f141a] border border-[#591d27] rounded p-1.5 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-[10px] font-bold text-[#f87171] bg-[#45141c] px-1.5 py-0.5 rounded leading-none">
                      FAIL
                    </span>
                    <span className="text-xs font-bold text-[#fca5a5] font-mono mt-1">503</span>
                    <span className="text-[10px] text-[#f87171] font-mono">p95 1,204 ms</span>
                  </div>
                </td>
                {/* 后 3 列破折号 */}
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
              </tr>

              {/* 行 3: Billing */}
              <tr className="hover:bg-[#151928] transition-colors">
                <td className="bg-[#171b29] border border-[#20273a] px-3 py-2 text-left">
                  <div className="text-xs font-semibold text-white">Billing</div>
                  <div className="text-[10px] text-[#64748b] font-mono">billing.svc.plus</div>
                </td>
                {/* 前 7 列破折号 */}
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                <td className="border border-[#20273a] text-[#475569] font-mono text-sm">—</td>
                {/* Billing /healthz */}
                <td className="border border-[#20273a] p-1.5">
                  <div className="bg-[#0e271c] border border-[#174f32] rounded p-1.5 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#4ade80] bg-[#143d27] px-1.5 py-0.5 rounded leading-none">
                      PASS
                    </span>
                    <span className="text-xs font-bold text-white font-mono mt-1">200</span>
                    <span className="text-[10px] text-[#86efac] font-mono">p95 35 ms</span>
                  </div>
                </td>
                {/* Billing /readyz (NO DATA) */}
                <td className="border border-[#20273a] p-1.5">
                  <div className="bg-[#171a25] border border-[#272e42] rounded p-1.5 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#94a3b8] bg-[#1f2537] px-1.5 py-0.5 rounded leading-none">
                      NO DATA
                    </span>
                    <span className="text-xs font-bold text-[#94a3b8] font-mono mt-1">—</span>
                    <span className="text-[10px] text-[#64748b] font-mono">p95 —</span>
                  </div>
                </td>
                {/* Billing /api/ping */}
                <td className="border border-[#20273a] p-1.5">
                  <div className="bg-[#0e271c] border border-[#174f32] rounded p-1.5 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#4ade80] bg-[#143d27] px-1.5 py-0.5 rounded leading-none">
                      PASS
                    </span>
                    <span className="text-xs font-bold text-white font-mono mt-1">200</span>
                    <span className="text-[10px] text-[#86efac] font-mono">p95 71 ms</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Flagger (Progressive Release) 进度表格 */}
      <div className="bg-[#121520] border border-[#1e2436] rounded-md p-3.5 mb-4 shadow-sm overflow-hidden">
        <h2 className="text-xs font-semibold text-white mb-3">Flagger (Progressive Release)</h2>
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#252d40]">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#20273a] text-[#8e9bb0]">
                <th className="py-2 px-3 font-medium w-48">Service</th>
                <th className="py-2 px-3 font-medium w-36">Flagger phase</th>
                <th className="py-2 px-3 font-medium w-40">Weight (candidate)</th>
                <th className="py-2 px-3 font-medium">Traffic (primary vs candidate)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2538]">
              {/* Console */}
              <tr className="hover:bg-[#151928] transition-colors">
                <td className="py-2.5 px-3">
                  <span className="font-semibold text-white">Console</span>{" "}
                  <span className="text-[11px] text-[#64748b] font-mono">console.svc.plus</span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="bg-[#1e3a8a] text-[#93c5fd] px-2 py-0.5 rounded text-[11px] font-medium">
                    Progressing
                  </span>
                </td>
                <td className="py-2.5 px-3 font-mono font-medium text-white">20%</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-64 bg-[#1e2538] rounded-sm overflow-hidden flex">
                      <div className="h-full bg-[#22c55e]" style={{ width: "80%" }}></div>
                      <div className="h-full bg-[#3b82f6]" style={{ width: "20%" }}></div>
                    </div>
                    <span className="text-[11px] font-mono text-[#94a3b8]">
                      Primary 80% &nbsp;|&nbsp; Candidate 20%
                    </span>
                  </div>
                </td>
              </tr>

              {/* Accounts */}
              <tr className="hover:bg-[#151928] transition-colors">
                <td className="py-2.5 px-3">
                  <span className="font-semibold text-white">Accounts</span>{" "}
                  <span className="text-[11px] text-[#64748b] font-mono">accounts.svc.plus</span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="bg-[#1e3a8a] text-[#93c5fd] px-2 py-0.5 rounded text-[11px] font-medium">
                    Progressing
                  </span>
                </td>
                <td className="py-2.5 px-3 font-mono font-medium text-white">10%</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-64 bg-[#1e2538] rounded-sm overflow-hidden flex">
                      <div className="h-full bg-[#22c55e]" style={{ width: "90%" }}></div>
                      <div className="h-full bg-[#3b82f6]" style={{ width: "10%" }}></div>
                    </div>
                    <span className="text-[11px] font-mono text-[#94a3b8]">
                      Primary 90% &nbsp;|&nbsp; Candidate 10%
                    </span>
                  </div>
                </td>
              </tr>

              {/* Billing */}
              <tr className="hover:bg-[#151928] transition-colors">
                <td className="py-2.5 px-3">
                  <span className="font-semibold text-white">Billing</span>{" "}
                  <span className="text-[11px] text-[#64748b] font-mono">billing.svc.plus</span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="bg-[#1e2538] text-[#94a3b8] px-2 py-0.5 rounded text-[11px] font-medium">
                    Not configured
                  </span>
                </td>
                <td className="py-2.5 px-3 font-mono text-[#64748b]">—</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
                    <Info className="w-3.5 h-3.5" />
                    <span>No canary configured for this service</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 10 Endpoint Details 探测详细宽表 */}
      <div className="bg-[#121520] border border-[#1e2436] rounded-md p-3.5 mb-4 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-white">
              Top 10 Endpoint Details {dataSourceMode === "mock" ? "(Sample Mock Data)" : "(Live Data)"}
            </h2>
            <span className="text-[10px] bg-[#1e2538] text-[#94a3b8] px-2 py-0.5 rounded border border-[#2b354e] font-mono">
              {dataSourceMode === "mock" ? "SAMPLE MOCK DATA" : "OBSERVABILITY VM"}
            </span>
          </div>

          <div className="text-[11px] font-mono text-[#94a3b8]">
            10/10 checks •{" "}
            <span className="text-[#f87171] font-semibold">{p?.gateStatus.failedChecks ?? 1} failed</span> •{" "}
            Updated: {lastRefreshedAt || p?.updatedAtUtc || "14:34:02 UTC"}
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#252d40]">
          <table className="w-full border-collapse text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#20273a] text-[#8e9bb0] text-[11px]">
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
            <tbody className="divide-y divide-[#1e2538]">
              {(p?.endpoints || []).map((ep) => {
                const isFail = ep.result === "FAIL";
                const isConsole = ep.service === "Console";
                const isAccounts = ep.service === "Accounts";

                return (
                  <tr key={ep.id} className="hover:bg-[#151928] transition-colors">
                    <td className="py-2 px-3 text-[#64748b]">{ep.order}</td>
                    <td className="py-2 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          isConsole
                            ? "bg-[#064e3b] text-[#6ee7b7]"
                            : isAccounts
                            ? "bg-[#1e3a8a] text-[#93c5fd]"
                            : "bg-[#4c1d95] text-[#d8b4fe]"
                        }`}
                      >
                        {ep.service}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-white font-medium">{ep.endpoint}</td>
                    <td className="py-2 px-3 text-[#94a3b8]">{ep.expectedHttp}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isFail
                            ? "bg-[#7f1d1d] text-[#fca5a5]"
                            : "bg-[#064e3b] text-[#6ee7b7]"
                        }`}
                      >
                        {ep.observedHttp}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-white">{ep.p95LatencyMs.toLocaleString()} ms</td>
                    <td className="py-2 px-3 text-[#94a3b8]">{ep.freshnessSec} s</td>
                    <td className="py-2 px-3">
                      {isFail ? (
                        <span className="flex items-center gap-1 text-[#ef4444] font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          FAIL
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#22c55e] font-bold">
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
        <div className="md:col-span-8 bg-[#121520] border border-[#1e2436] rounded-md p-3.5 flex items-start gap-2.5 text-xs text-[#cbd5e1] leading-relaxed">
          <Info className="w-4 h-4 text-[#94a3b8] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Gate rule:</span> The release is{" "}
            <span className="font-bold text-white tracking-wide">BLOCKED</span> if any endpoint is
            failed, stale (exceeds freshness), missing samples (NO DATA), or if the candidate
            request sample is insufficient.
          </div>
        </div>

        {/* 右侧 Candidate sample 样本数指标卡 */}
        <div className="md:col-span-4 bg-[#121520] border border-[#1e2436] rounded-md p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#181d2c] border border-[#262f46] flex items-center justify-center shrink-0">
            <FlaskConical className="w-4 h-4 text-[#94a3b8]" />
          </div>
          <div>
            <div className="text-xs text-white">
              <span className="text-[#8e9bb0]">Candidate sample:</span>{" "}
              <span className="font-bold font-mono">
                {p?.candidateSample.requestsCount.toLocaleString() ?? "34,862"} requests
              </span>
            </div>
            <div className="text-[11px] text-[#22c55e] font-medium mt-0.5 font-mono">
              {p?.candidateSample.summary ?? "(sufficient, ≥ 10,000)"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
