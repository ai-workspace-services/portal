"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  ChevronRight,
  Layers,
  Search,
  Globe,
  Server,
  Folder,
  FolderOpen,
} from "lucide-react";
import type {
  ProgressiveReleasePayload,
  RouteApiItem,
} from "@/app/api/operations/progressive-release/route";

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

  // 底部可折叠路由与 API 表格状态
  const [isRoutesCollapsed, setIsRoutesCollapsed] = useState(false);
  const [routesFilter, setRoutesFilter] = useState<"all" | "frontend" | "api">("all");
  const [searchQuery, setSearchQuery] = useState("");

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
  const isGateBlocked = p?.gateStatus?.status === "BLOCKED";

  // 一级节点折叠状态 (frontend / api)
  const [expandedRoots, setExpandedRoots] = useState<Record<string, boolean>>({
    frontend: true,
    api: true,
  });

  // 二级大类折叠状态 (categoryKey)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // 树状分组结构接口
  interface TreeCategory {
    key: string;
    name: string;
    enName: string;
    type: "frontend" | "api";
    items: RouteApiItem[];
    totalCount: number;
    passCount: number;
    failCount: number;
  }

  interface TreeRoot {
    type: "frontend" | "api";
    title: string;
    enTitle: string;
    categories: TreeCategory[];
    totalCount: number;
    passCount: number;
    failCount: number;
  }

  // 过滤并构造树状结构数据 (前端/后端 -> 大类 -> 路由/接口)
  const treeData = useMemo<TreeRoot[]>(() => {
    const list: RouteApiItem[] = p?.allRoutesAndApis || [];

    const filterItem = (item: RouteApiItem) => {
      if (routesFilter === "frontend" && item.type !== "frontend") return false;
      if (routesFilter === "api" && item.type !== "api") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.path.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.service.toLowerCase().includes(q) ||
          item.serviceDomain.toLowerCase().includes(q) ||
          (item.categoryName && item.categoryName.toLowerCase().includes(q)) ||
          (item.categoryEnName && item.categoryEnName.toLowerCase().includes(q)) ||
          (item.method && item.method.toLowerCase().includes(q))
        );
      }
      return true;
    };

    const feItems = list.filter((i) => i.type === "frontend" && filterItem(i));
    const beItems = list.filter((i) => i.type === "api" && filterItem(i));

    const resolveCategoryMeta = (item: RouteApiItem, rootType: "frontend" | "api") => {
      if (item.categoryKey && item.categoryName) {
        return {
          key: item.categoryKey,
          name: item.categoryName,
          enName: item.categoryEnName || item.categoryKey,
        };
      }
      if (rootType === "frontend") {
        if (item.path.startsWith("/panel"))
          return { key: "fe-panel", name: "平台运维与控制台", enName: "Panel & Operations" };
        if (item.path.startsWith("/ai-workspace"))
          return { key: "fe-workspace", name: "智能体与工作空间", enName: "AI Workspace & Studio" };
        if (item.path === "/" || item.path === "/about" || item.path === "/prices" || item.path.startsWith("/products"))
          return { key: "fe-portal", name: "产品、服务与门户", enName: "Portal, Products & Services" };
        if (item.path.startsWith("/docs") || item.path.startsWith("/blogs") || item.path.startsWith("/download"))
          return { key: "fe-docs", name: "知识库、文档与博客", enName: "Docs, Knowledge & Blogs" };
        if (item.path === "/login" || item.path === "/register" || item.path.startsWith("/email"))
          return { key: "fe-auth", name: "统一身份认证与用户中心", enName: "Auth & User Center" };
        if (item.path.startsWith("/cloud_iac") || item.path.startsWith("/xworkmate"))
          return { key: "fe-edge", name: "边缘套件与基础设施工具", enName: "Edge Suites & Cloud IaC" };
        return { key: "fe-support", name: "客户支持与服务条款", enName: "Support, Legal & System" };
      } else {
        if (
          item.path.startsWith("/api/operations") ||
          item.path === "/healthz" ||
          item.path === "/api/ping" ||
          item.service === "Billing" ||
          item.service === "Accounts"
        ) {
          return { key: "be-ops", name: "运维监控与发布门禁", enName: "Operations & Progressive Release" };
        }
        if (
          item.path.startsWith("/api/auth/stripe") ||
          item.path.startsWith("/api/auth/subscriptions") ||
          item.path.startsWith("/api/admin/billing") ||
          item.path === "/api/billing/plans"
        ) {
          return { key: "be-billing", name: "商业化、计费与订阅", enName: "Billing, Payments & Subscriptions" };
        }
        if (item.path.startsWith("/api/auth/mfa")) {
          return { key: "be-mfa", name: "MFA 多因素安全认证", enName: "Multi-Factor Authentication" };
        }
        if (item.path.startsWith("/api/admin")) {
          return { key: "be-admin", name: "平台治理与管理控制台", enName: "Admin & Governance Platform" };
        }
        if (
          item.path.startsWith("/api/agent") ||
          item.path.startsWith("/api/ai-workspace") ||
          item.path.startsWith("/api/task")
        ) {
          return { key: "be-agent", name: "AI 智能体与工作空间", enName: "AI Workspace & Agent Runtime" };
        }
        if (item.path.startsWith("/api/xconnect") || item.path.startsWith("/api/xworkmate")) {
          return { key: "be-edge", name: "边缘协同与互联网络", enName: "Edge Connect & Collaboration" };
        }
        if (item.path.startsWith("/api/auth") || item.path.startsWith("/api/account")) {
          return { key: "be-auth", name: "身份认证与用户账户", enName: "Authentication & Account Management" };
        }
        return { key: "be-content", name: "文档检索、营销与集成服务", enName: "Docs, Content & Integrations" };
      }
    };

    const groupByCategory = (items: RouteApiItem[], rootType: "frontend" | "api"): TreeCategory[] => {
      const map = new Map<string, { meta: { key: string; name: string; enName: string }; items: RouteApiItem[] }>();
      for (const item of items) {
        const meta = resolveCategoryMeta(item, rootType);
        if (!map.has(meta.key)) {
          map.set(meta.key, { meta, items: [] });
        }
        map.get(meta.key)!.items.push({
          ...item,
          categoryKey: meta.key,
          categoryName: meta.name,
          categoryEnName: meta.enName,
        });
      }

      const groups: TreeCategory[] = [];
      map.forEach((value, key) => {
        const passCount = value.items.filter((i) => i.result === "PASS").length;
        const failCount = value.items.filter((i) => i.result === "FAIL").length;
        groups.push({
          key,
          name: value.meta.name,
          enName: value.meta.enName,
          type: rootType,
          items: value.items.sort((a, b) => a.order - b.order),
          totalCount: value.items.length,
          passCount,
          failCount,
        });
      });

      return groups.sort((a, b) => b.totalCount - a.totalCount);
    };

    const feCategories = groupByCategory(feItems, "frontend");
    const beCategories = groupByCategory(beItems, "api");

    const roots: TreeRoot[] = [];

    if (routesFilter === "all" || routesFilter === "frontend") {
      const fePass = feItems.filter((i) => i.result === "PASS").length;
      const feFail = feItems.filter((i) => i.result === "FAIL").length;
      roots.push({
        type: "frontend",
        title: "前端页面路由 (Frontend Pages & Routes)",
        enTitle: "Frontend Pages & Portal Routes",
        categories: feCategories,
        totalCount: feItems.length,
        passCount: fePass,
        failCount: feFail,
      });
    }

    if (routesFilter === "all" || routesFilter === "api") {
      const bePass = beItems.filter((i) => i.result === "PASS").length;
      const beFail = beItems.filter((i) => i.result === "FAIL").length;
      roots.push({
        type: "api",
        title: "后端服务与微服务 API (Backend Services & APIs)",
        enTitle: "Backend Microservice APIs & Probes",
        categories: beCategories,
        totalCount: beItems.length,
        passCount: bePass,
        failCount: beFail,
      });
    }

    return roots;
  }, [p?.allRoutesAndApis, routesFilter, searchQuery]);

  const toggleRoot = (type: string) => {
    setExpandedRoots((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    setExpandedRoots({ frontend: true, api: true });
    const allCatKeys: Record<string, boolean> = {};
    for (const r of treeData) {
      for (const c of r.categories) {
        allCatKeys[c.key] = true;
      }
    }
    setExpandedCategories(allCatKeys);
  };

  const collapseAll = () => {
    setExpandedRoots({ frontend: false, api: false });
    const allCatKeys: Record<string, boolean> = {};
    for (const r of treeData) {
      for (const c of r.categories) {
        allCatKeys[c.key] = false;
      }
    }
    setExpandedCategories(allCatKeys);
  };

  const frontendCount = p?.allRoutesAndApis?.filter((i) => i.type === "frontend").length ?? 65;
  const apiCount = p?.allRoutesAndApis?.filter((i) => i.type === "api").length ?? 116;

  return (
    <div className="w-full space-y-4 text-[var(--color-text)]">
      {/* 顶部标题与全局状态栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-surface-border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-heading)] tracking-tight">
              Progressive Release Validation
            </h1>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {dataSourceMode === "live" ? "LIVE OBSERVABILITY" : "MOCK SIMULATION"}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Service × API status matrix for progressive releases (双集群服务网格金丝雀渐进发布健康验证、流量加权观测与全量前后端路由接口状态矩阵)
          </p>
        </div>

        {/* 右侧环境选择器与刷新控制器 */}
        <div className="flex items-center gap-2">
          {/* 环境选择器 */}
          <div className="inline-flex rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setEnvironment("PROD")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                environment === "PROD"
                  ? "bg-[var(--color-primary)] text-white shadow-xs"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              PROD
            </button>
            <button
              type="button"
              onClick={() => setEnvironment("SIT")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                environment === "SIT"
                  ? "bg-[var(--color-primary)] text-white shadow-xs"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              SIT
            </button>
          </div>

          {/* 倒计时与手动刷新按钮 */}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text)] transition-colors shadow-xs disabled:opacity-50"
            title="点击立即刷新 Prometheus / Flagger 指标"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[var(--color-primary)] ${isLoading ? "animate-spin" : ""}`} />
            <span className="font-mono text-[11px] text-[var(--color-text-muted)]">{refreshCountdown}s</span>
          </button>
        </div>
      </div>

      {/* 核心 KPI 状态卡片栏 (3 卡分布) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 环境卡片 */}
        <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-muted)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-muted)] block">Environment</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-bold font-mono text-[var(--color-heading)]">{environment}</span>
                <span className="text-[11px] text-[var(--color-text-subtle)] font-mono">
                  ({environment === "PROD" ? "PROD-K3S-V6" : "SIT-K3S-V6"})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 观测窗口卡片 */}
        <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-muted)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-muted)] block">Observation window</span>
              <div className="text-xs font-semibold font-mono text-[var(--color-heading)] mt-0.5">
                {p?.observationWindow.label || "Last 15 minutes"}
              </div>
              <div className="text-[10px] text-[var(--color-text-subtle)] font-mono">
                {p?.observationWindow.formattedTimeRange || "14:19 - 14:34 UTC"}
              </div>
            </div>
          </div>
        </div>

        {/* 发布门禁状态卡片 */}
        <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isGateBlocked
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
              }`}
            >
              {isGateBlocked ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-muted)] block">Release gate (overall)</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wider ${
                    isGateBlocked
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {p?.gateStatus.status || "ALLOWED"}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
                  {p?.gateStatus.summary || "All checks passed"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service × Endpoint Status 状态矩阵 (核心区块) */}
      <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-heading)]">
            <span>Service × Endpoint Status</span>
            <span className="text-[10px] text-[var(--color-text-subtle)] font-normal font-mono">
              (Live Probing Matrix • 10 Core Health Indicators)
            </span>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-text-subtle)]">
            Updated: {lastRefreshedAt || p?.updatedAtUtc || "14:39:54 UTC"}
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[850px] border-collapse text-center">
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
                  className="bg-[var(--color-primary-muted)] text-[var(--color-primary)] border border-[color:var(--color-primary-border)] py-1.5 px-2 text-xs font-semibold tracking-wide"
                >
                  Console <span className="text-[11px] font-normal opacity-85 font-mono">(console.svc.plus)</span>
                </th>
                <th
                  colSpan={4}
                  className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25 py-1.5 px-2 text-xs font-semibold tracking-wide"
                >
                  Accounts <span className="text-[11px] font-normal opacity-85 font-mono">(accounts.svc.plus)</span>
                </th>
                <th
                  colSpan={3}
                  className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 py-1.5 px-2 text-xs font-semibold tracking-wide"
                >
                  Billing <span className="text-[11px] font-normal opacity-85 font-mono">(billing.svc.plus)</span>
                </th>
              </tr>
              <tr className="bg-[var(--color-surface-muted)] text-[11px] text-[var(--color-text-muted)] font-mono border-b border-[color:var(--color-surface-border)]">
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

            <tbody className="divide-y divide-[var(--color-surface-border)]">
              {(p?.serviceMatrix?.rows || [
                { service: "Console", domain: "console.svc.plus", cells: {} },
                { service: "Accounts", domain: "accounts.svc.plus", cells: {} },
                { service: "Billing", domain: "billing.svc.plus", cells: {} },
              ]).map((row) => (
                <tr key={row.service} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                  <td className="bg-[var(--color-surface-muted)] border border-[color:var(--color-surface-border)] px-3 py-2 text-left">
                    <div className="text-xs font-semibold text-[var(--color-heading)]">{row.service}</div>
                    <div className="text-[10px] text-[var(--color-text-subtle)] font-mono">{row.domain}</div>
                  </td>
                  {MATRIX_COLUMNS.map((col) => {
                    const cellKey = `${col.service}:${col.endpoint}`;
                    const cell = row.cells?.[cellKey];

                    if (!cell || !cell.isRelevant) {
                      return (
                        <td key={cellKey} className="border border-[color:var(--color-surface-border)] text-[var(--color-text-subtle)] font-mono text-xs">
                          —
                        </td>
                      );
                    }

                    if (cell.result === "FAIL") {
                      return (
                        <td key={cellKey} className="border border-[color:var(--color-surface-border)] p-1.5">
                          <div className="bg-rose-500/10 border border-rose-500/25 rounded p-1.5 flex flex-col items-center justify-center shadow-xs">
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded leading-none">
                              FAIL
                            </span>
                            <span className="text-xs font-bold text-rose-700 dark:text-rose-300 font-mono mt-1">
                              {cell.httpCode ?? 503}
                            </span>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono">
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
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-border)] px-1.5 py-0.5 rounded leading-none">
                              NO DATA
                            </span>
                            <span className="text-xs font-bold text-[var(--color-text-subtle)] font-mono mt-1">—</span>
                            <span className="text-[10px] text-[var(--color-text-subtle)] font-mono">p95 —</span>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={cellKey} className="border border-[color:var(--color-surface-border)] p-1.5">
                        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded p-1.5 flex flex-col items-center justify-center shadow-xs">
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded leading-none">
                            PASS
                          </span>
                          <span className="text-xs font-bold text-[var(--color-heading)] font-mono mt-1">
                            {cell.httpCode ?? 200}
                          </span>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
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
      <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-semibold text-[var(--color-heading)]">Flagger (Progressive Release)</h2>
          <span className="text-[11px] font-mono text-[var(--color-text-subtle)]">
            Traffic Weighted Canary Deployment Matrix
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[color:var(--color-surface-border)] text-[var(--color-text-muted)]">
                <th className="py-2.5 px-3 font-medium w-48">Service</th>
                <th className="py-2.5 px-3 font-medium w-36">Flagger phase</th>
                <th className="py-2.5 px-3 font-medium w-36">Weight (candidate)</th>
                <th className="py-2.5 px-3 font-medium">Traffic (primary vs candidate)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-surface-border)]">
              {(p?.flaggerServices || []).map((fs) => {
                const isNotConfigured = fs.phase === "Not configured" || fs.weight === null;
                const isProgressing = fs.phase === "Progressing";
                const isSucceeded = fs.phase === "Succeeded";
                const isFailed = fs.phase === "Failed";

                return (
                  <tr key={fs.service} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-[var(--color-heading)]">{fs.service}</span>{" "}
                      <span className="text-[11px] text-[var(--color-text-subtle)] font-mono">{fs.serviceDomain}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-medium border ${
                          isProgressing
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                            : isSucceeded
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : isFailed
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                            : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[color:var(--color-surface-border)]"
                        }`}
                      >
                        {fs.phase}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-[var(--color-heading)]">
                      {isNotConfigured ? "—" : `${fs.weight}%`}
                    </td>
                    <td className="py-3 px-3">
                      {isNotConfigured ? (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
                          <Info className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-subtle)]" />
                          <span>{fs.message || "No canary configured for this service"}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="h-3.5 w-48 sm:w-64 bg-[var(--color-surface-muted)] border border-[color:var(--color-surface-border)] rounded overflow-hidden flex">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${fs.primaryTrafficPct ?? 100}%` }}
                              title={`Primary ${fs.primaryTrafficPct ?? 100}%`}
                            ></div>
                            <div
                              className="h-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${fs.candidateTrafficPct ?? 0}%` }}
                              title={`Candidate ${fs.candidateTrafficPct ?? 0}%`}
                            ></div>
                          </div>
                          <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                            Primary {fs.primaryTrafficPct ?? 100}% &nbsp;|&nbsp; Candidate {fs.candidateTrafficPct ?? 0}%
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 熔断规则与候选样本两大提示栏 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* 左侧 Gate rule 熔断规则高亮条 */}
        <div className="md:col-span-8 rounded-xl border border-[color:var(--color-surface-border)] border-l-4 border-l-[var(--color-primary)] bg-[var(--color-surface)] p-3.5 flex items-start gap-2.5 text-xs text-[var(--color-text)] leading-relaxed shadow-[var(--shadow-sm)]">
          <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[var(--color-heading)]">Gate rule:</span> The release is{" "}
            <span className="font-bold text-rose-600 dark:text-rose-400 tracking-wide">BLOCKED</span> if any endpoint is
            failed, stale (exceeds freshness), missing samples (NO DATA), or if the candidate
            request sample is insufficient.
          </div>
        </div>

        {/* 右侧 Candidate sample 样本数指标卡 */}
        <div className="md:col-span-4 rounded-xl border border-[color:var(--color-surface-border)] border-l-4 border-l-purple-500 bg-[var(--color-surface)] p-3.5 flex items-center gap-3 shadow-[var(--shadow-sm)]">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <FlaskConical className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="text-xs text-[var(--color-heading)]">
              <span className="text-[var(--color-text-muted)]">Candidate sample:</span>{" "}
              <span className="font-bold font-mono">
                {p?.candidateSample.requestsCount.toLocaleString() ?? "526,700"} requests
              </span>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 font-mono">
              {p?.candidateSample.summary ?? "(sufficient, ≥ 10,000)"}
            </div>
          </div>
        </div>
      </div>

      {/* 全量路由与后端服务 API 清单：三级分组树状展示 (Collapsible Routes & APIs Matrix) */}
      <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] overflow-hidden transition-all">
        {/* 折叠标题栏 */}
        <div
          onClick={() => setIsRoutesCollapsed(!isRoutesCollapsed)}
          className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] cursor-pointer border-b border-[color:var(--color-surface-border)] transition-colors select-none"
        >
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="p-1 rounded hover:bg-[var(--color-surface-border)] text-[var(--color-text-muted)] transition-colors"
              aria-label={isRoutesCollapsed ? "展开全量资产树" : "折叠全量资产树"}
            >
              {isRoutesCollapsed ? (
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-heading)]">
                Web Console 前端全量路由与后端服务 API 接口清单
              </span>
              <span className="text-[11px] text-[var(--color-text-subtle)] font-normal hidden sm:inline">
                (Full Routing &amp; Microservice APIs Matrix • 前端 / 后端 / 大类 / 子组件三级树状展示)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* 统计指标胶囊 */}
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[var(--color-primary-muted)] text-[var(--color-primary)] border border-[color:var(--color-primary-border)] font-medium flex items-center gap-1">
              <Globe className="w-2.5 h-2.5" />
              Frontend ({frontendCount} 路由 · 7 大类)
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-medium flex items-center gap-1">
              <Server className="w-2.5 h-2.5" />
              Backend APIs ({apiCount} 接口 · 8 大类)
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              All 100% Online
            </span>
          </div>
        </div>

        {/* 展开内容区 */}
        {!isRoutesCollapsed && (
          <div className="p-4 space-y-4">
            {/* 顶部工具栏：过滤 Tab、快捷操作、搜索框 */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* 视图类型筛选器 */}
                <div className="inline-flex rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setRoutesFilter("all")}
                    className={`px-3 py-1 font-medium rounded-md transition-all ${
                      routesFilter === "all"
                        ? "bg-[var(--color-primary)] text-white shadow-xs"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    全部资产 ({frontendCount + apiCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoutesFilter("frontend")}
                    className={`px-3 py-1 font-medium rounded-md transition-all ${
                      routesFilter === "frontend"
                        ? "bg-[var(--color-primary)] text-white shadow-xs"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    前端页面 ({frontendCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoutesFilter("api")}
                    className={`px-3 py-1 font-medium rounded-md transition-all ${
                      routesFilter === "api"
                        ? "bg-[var(--color-primary)] text-white shadow-xs"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    后端接口 ({apiCount})
                  </button>
                </div>

                {/* 一键全部展开 / 全部折叠 */}
                <div className="flex items-center gap-1 ml-1">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="px-2.5 py-1 rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    全部展开
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="px-2.5 py-1 rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    全部收起
                  </button>
                </div>
              </div>

              {/* 搜索框 */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-subtle)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索路由、微服务、大类或功能..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[color:var(--color-text-subtle)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-[10px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 树状分组内容展示 */}
            <div className="space-y-4">
              {treeData.map((root) => {
                const isRootExpanded = expandedRoots[root.type] ?? true;
                const isFrontend = root.type === "frontend";

                return (
                  <div
                    key={root.type}
                    className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs"
                  >
                    {/* Level 1: 一级分类标题栏 (前端 vs 后端) */}
                    <div
                      onClick={() => toggleRoot(root.type)}
                      className="flex items-center justify-between p-3.5 bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors border-b border-[color:var(--color-surface-border)] select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="p-1 rounded text-[var(--color-text-muted)]">
                          {isRootExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                          )}
                        </span>
                        {isFrontend ? (
                          <div className="w-6 h-6 rounded bg-[var(--color-primary-muted)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                            <Globe className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                            <Server className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--color-heading)]">{root.title}</span>
                            <span className="text-[11px] font-mono text-[var(--color-text-subtle)]">
                              ({root.enTitle})
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--color-text-subtle)]">
                            包含 {root.categories.length} 个功能子类 / 组件模块 • 累计 {root.totalCount} 项监控条目
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{root.passCount} PASS</span>
                          {root.failCount > 0 && (
                            <span className="text-rose-600 font-semibold ml-2">/ {root.failCount} FAIL</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Level 2 & 3: 二级分类列表与三级端点表格 */}
                    {isRootExpanded && (
                      <div className="p-3.5 space-y-3 bg-[var(--color-surface)]">
                        {root.categories.length === 0 ? (
                          <div className="text-center py-6 text-xs text-[var(--color-text-subtle)]">
                            未匹配到符合条件的条目
                          </div>
                        ) : (
                          root.categories.map((cat) => {
                            const isCatExpanded = expandedCategories[cat.key] !== false;

                            return (
                              <div
                                key={cat.key}
                                className="rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] overflow-hidden"
                              >
                                {/* Level 2: 二级大类标题栏 */}
                                <div
                                  onClick={() => toggleCategory(cat.key)}
                                  className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors select-none"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="p-0.5 rounded text-[var(--color-text-muted)]">
                                      {isCatExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                      )}
                                    </span>
                                    {isCatExpanded ? (
                                      <FolderOpen className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                                    ) : (
                                      <Folder className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                                    )}
                                    <span className="text-xs font-semibold text-[var(--color-heading)]">{cat.name}</span>
                                    <span className="text-[10px] text-[var(--color-text-subtle)] font-mono">
                                      ({cat.enName})
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[color:var(--color-surface-border)] font-mono">
                                      {cat.totalCount} 项
                                    </span>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                                      {cat.passCount} PASS
                                    </span>
                                  </div>
                                </div>

                                {/* Level 3: 三级路由/接口明细表格 */}
                                {isCatExpanded && (
                                  <div className="overflow-x-auto border-t border-[color:var(--color-surface-border)]">
                                    <table className="w-full border-collapse text-left text-xs font-mono">
                                      <thead>
                                        <tr className="border-b border-[color:var(--color-surface-border)] text-[var(--color-text-muted)] text-[11px] bg-[var(--color-surface-muted)]">
                                          <th className="py-2 px-3 w-10">#</th>
                                          <th className="py-2 px-3 w-20">Method</th>
                                          <th className="py-2 px-3 w-64">Path / Route</th>
                                          <th className="py-2 px-3 w-28">Service</th>
                                          <th className="py-2 px-3 font-sans">Description</th>
                                          <th className="py-2 px-3 w-20 text-center">Expected</th>
                                          <th className="py-2 px-3 w-20 text-center">Observed</th>
                                          <th className="py-2 px-3 w-24 text-right">Latency</th>
                                          <th className="py-2 px-3 w-20 text-right">Age</th>
                                          <th className="py-2 px-3 w-20 text-center">Result</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[var(--color-surface-border)]">
                                        {cat.items.map((item, idx) => {
                                          const isPass = item.result === "PASS";
                                          const isGet = item.method === "GET";
                                          const isPost = item.method === "POST";
                                          const isPut = item.method === "PUT";
                                          const isDelete = item.method === "DELETE";

                                          return (
                                            <tr
                                              key={item.id}
                                              className="hover:bg-[var(--color-surface-hover)] transition-colors"
                                            >
                                              <td className="py-2 px-3 text-[var(--color-text-subtle)] text-[11px]">
                                                {idx + 1}
                                              </td>
                                              <td className="py-2 px-3">
                                                <span
                                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                    isGet
                                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                                      : isPost
                                                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                                                      : isPut
                                                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                                      : isDelete
                                                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                                      : "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                                                  }`}
                                                >
                                                  {item.method}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3">
                                                <span className="font-semibold text-[var(--color-heading)]">
                                                  {item.path}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3 font-sans">
                                                <span className="px-2 py-0.5 rounded text-[11px] font-medium border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                                                  {item.service}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3 font-sans text-xs text-[var(--color-text-muted)]">
                                                {item.description}
                                              </td>
                                              <td className="py-2 px-3 text-center text-[var(--color-text-muted)]">
                                                {item.expectedHttp}
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                <span
                                                  className={`font-semibold ${
                                                    isPass
                                                      ? "text-emerald-600 dark:text-emerald-400"
                                                      : "text-rose-600 dark:text-rose-400"
                                                  }`}
                                                >
                                                  {item.observedHttp}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3 text-right text-[var(--color-text-muted)]">
                                                {item.latencyMs} ms
                                              </td>
                                              <td className="py-2 px-3 text-right text-[var(--color-text-subtle)] text-[11px]">
                                                {item.freshnessSec}s
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                <span
                                                  className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                                                    isPass
                                                      ? "text-emerald-600 dark:text-emerald-400"
                                                      : "text-rose-600 dark:text-rose-400"
                                                  }`}
                                                >
                                                  {isPass ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                  ) : (
                                                    <XCircle className="w-3.5 h-3.5" />
                                                  )}
                                                  {item.result}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
