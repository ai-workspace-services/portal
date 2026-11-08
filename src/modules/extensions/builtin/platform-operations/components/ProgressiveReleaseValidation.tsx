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
  Database,
  ExternalLink,
  Search,
  Globe,
  Server,
  ArrowUpDown,
  Folder,
  FolderOpen,
  FolderKanban,
  Cpu,
  BookOpen,
  ChevronsUpDown,
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
  const isGateBlocked = p?.gateStatus.status === "BLOCKED";

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
      map.forEach(({ meta, items: catItems }) => {
        const passCount = catItems.filter((i) => i.result === "PASS").length;
        const failCount = catItems.filter((i) => i.result === "FAIL").length;
        groups.push({
          key: meta.key,
          name: meta.name,
          enName: meta.enName,
          type: rootType,
          items: catItems,
          totalCount: catItems.length,
          passCount,
          failCount,
        });
      });
      return groups;
    };

    const roots: TreeRoot[] = [];
    if (routesFilter === "all" || routesFilter === "frontend") {
      roots.push({
        type: "frontend",
        title: "前端页面路由 (Frontend Pages & Routes)",
        enTitle: "Frontend Web Console Pages",
        categories: groupByCategory(feItems, "frontend"),
        totalCount: feItems.length,
        passCount: feItems.filter((i) => i.result === "PASS").length,
        failCount: feItems.filter((i) => i.result === "FAIL").length,
      });
    }

    if (routesFilter === "all" || routesFilter === "api") {
      roots.push({
        type: "api",
        title: "后端服务与微服务 API (Backend Services & APIs)",
        enTitle: "Backend Microservices & Gateway Endpoints",
        categories: groupByCategory(beItems, "api"),
        totalCount: beItems.length,
        passCount: beItems.filter((i) => i.result === "PASS").length,
        failCount: beItems.filter((i) => i.result === "FAIL").length,
      });
    }

    return roots;
  }, [p?.allRoutesAndApis, routesFilter, searchQuery]);

  const frontendCount = useMemo(
    () => (p?.allRoutesAndApis || []).filter((i) => i.type === "frontend").length,
    [p?.allRoutesAndApis]
  );
  const apiCount = useMemo(
    () => (p?.allRoutesAndApis || []).filter((i) => i.type === "api").length,
    [p?.allRoutesAndApis]
  );

  const toggleRoot = (type: "frontend" | "api") => {
    setExpandedRoots((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => ({ ...prev, [key]: prev[key] === false ? true : false }));
  };

  const handleExpandAll = () => {
    setExpandedRoots({ frontend: true, api: true });
    const next: Record<string, boolean> = {};
    for (const root of treeData) {
      for (const cat of root.categories) {
        next[cat.key] = true;
      }
    }
    setExpandedCategories(next);
  };

  const handleCollapseAll = () => {
    setExpandedRoots({ frontend: false, api: false });
    const next: Record<string, boolean> = {};
    for (const root of treeData) {
      for (const cat of root.categories) {
        next[cat.key] = false;
      }
    }
    setExpandedCategories(next);
  };

  const getCategoryIcon = (key: string) => {
    if (key.includes("panel") || key.includes("ops")) return <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
    if (key.includes("workspace") || key.includes("agent")) return <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
    if (key.includes("portal") || key.includes("edge")) return <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
    if (key.includes("docs") || key.includes("content")) return <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
    if (key.includes("auth") || key.includes("mfa")) return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    if (key.includes("admin")) return <FolderKanban className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
    if (key.includes("billing")) return <Database className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />;
    return <Folder className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />;
  };

  return (
    <div className="w-full min-w-0 bg-white dark:bg-[#0f141f] text-slate-800 dark:text-slate-100 font-sans antialiased p-3 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      {/* 顶部控制与面包屑栏 (Grafana Topbar 风格) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-medium">
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Grafana Dashboards
          </span>
          <span>&gt;</span>
          <span className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
            Release Validation
          </span>
          <span>&gt;</span>
          <span className="text-slate-900 dark:text-white font-semibold">
            Progressive Release – SaaS Services
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 数据源模式选择器 */}
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5">
            <button
              type="button"
              onClick={() => setDataSourceMode("live")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                dataSourceMode === "live"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="连接到 https://observability.svc.plus 实时 VictoriaMetrics 集群指标"
            >
              <Database className="w-3 h-3" />
              Live VM
            </button>
            <button
              type="button"
              onClick={() => setDataSourceMode("mock")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                dataSourceMode === "mock"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="呈现设计原型图的高保真样本数据"
            >
              Mock Data
            </button>
          </div>

          {/* 时间窗口选择卡片 */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="font-medium">Last 15 minutes</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>

          {/* 刷新控制 */}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
            title="手动刷新实时指标"
          >
            <RotateCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isLoading ? "animate-spin" : ""}`} />
            <span className="font-mono">{autoRefresh ? `${refreshCountdown}s` : "Off"}</span>
          </button>
        </div>
      </div>

      {/* 主标题区 */}
      <div className="mt-4 mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Progressive Release Validation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            Service × API status matrix for progressive releases ({environment})
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <a
              href="https://observability.svc.plus"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 text-[11px]"
            >
              observability.svc.plus
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </p>
        </div>

        {/* 环境切换药丸 */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-lg text-xs">
          <span className="text-slate-400 px-1.5 text-[11px] font-mono">ENV:</span>
          <button
            type="button"
            onClick={() => setEnvironment("PROD")}
            className={`px-2.5 py-0.5 rounded font-semibold transition-colors ${
              environment === "PROD"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            PROD
          </button>
          <button
            type="button"
            onClick={() => setEnvironment("SIT")}
            className={`px-2.5 py-0.5 rounded font-semibold transition-colors ${
              environment === "SIT"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            SIT
          </button>
        </div>
      </div>

      {/* 顶部三大 KPI 卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
        {/* Environment 卡片 */}
        <div className="md:col-span-3 bg-slate-50/80 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400">Environment</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
              {p?.environment || environment}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              ({p?.cluster || (environment === "PROD" ? "PROD-K3S-V6" : "SIT-K3S-V6")})
            </span>
          </div>
        </div>

        {/* Observation window 卡片 */}
        <div className="md:col-span-4 bg-slate-50/80 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Observation window</span>
            <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate block mt-0.5 font-mono">
              {p?.observationWindow.formattedTimeRange || "Last 15 minutes (14:45 – 15:00 UTC)"}
            </span>
          </div>
        </div>

        {/* Release gate (overall) 门禁卡片 */}
        <div className="md:col-span-5 bg-slate-50/80 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                isGateBlocked
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {isGateBlocked ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Release gate (overall)</span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold tracking-wider ${
                    isGateBlocked
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {p?.gateStatus.status || "ALLOWED"}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                  {p?.gateStatus.summary || "All 10/10 checks passed (Gate Clear)"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service × Endpoint Status 状态矩阵 (核心区块) */}
      <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 mb-4 shadow-sm overflow-hidden">
        <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-slate-900 dark:text-white">
          <span>Service × Endpoint Status</span>
          <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200" />
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[850px] border-collapse text-center">
            {/* 第一层表头：服务分组 */}
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 w-36 align-middle"
                >
                  Service
                </th>
                <th
                  colSpan={3}
                  className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/50 py-1.5 px-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 tracking-wide"
                >
                  Console <span className="text-[11px] font-normal opacity-85 font-mono">(console.svc.plus)</span>
                </th>
                <th
                  colSpan={4}
                  className="bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/50 py-1.5 px-2 text-xs font-semibold text-purple-700 dark:text-purple-300 tracking-wide"
                >
                  Accounts <span className="text-[11px] font-normal opacity-85 font-mono">(accounts.svc.plus)</span>
                </th>
                <th
                  colSpan={3}
                  className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 py-1.5 px-2 text-xs font-semibold text-amber-800 dark:text-amber-300 tracking-wide"
                >
                  Billing <span className="text-[11px] font-normal opacity-85 font-mono">(billing.svc.plus)</span>
                </th>
              </tr>
              {/* 第二层表头：端点路径 */}
              <tr className="bg-slate-50 dark:bg-slate-800/70 text-[11px] text-slate-600 dark:text-slate-400 font-mono border-b border-slate-200 dark:border-slate-700">
                <th className="border border-slate-200 dark:border-slate-700 py-1 px-1 font-normal">/healthz</th>
                <th className="border border-slate-200 dark:border-slate-700 py-1 px-1 font-normal">/login</th>
                <th className="border border-slate-200 dark:border-slate-700 py-1 px-1 font-normal">/panel/agent</th>
                <th className="border border-slate-200 dark:border-slate-700 py-1 px-1 font-normal">/healthz</th>
                <th className="border border-slate-200 dark:border-slate-700 py-1 px-1 font-normal">/readyz</th>
                <th className="border border-slate-200 dark:border-slate-700 py-1 px-1 font-normal">/api/ping</th>
                <th className="border border-slate-200 dark:border-slate-700 py-1 px-1 font-normal">/api/billing/plans</th>
                <th className="border border-slate-200 dark:border-slate-700 py-1 px-1 font-normal">/healthz</th>
                <th className="border border-slate-200 dark:border-slate-700 py-1 px-1 font-normal">/readyz</th>
                <th className="border border-slate-200 dark:border-slate-700 py-1 px-1 font-normal">/api/ping</th>
              </tr>
            </thead>

            {/* 动态渲染服务行与指标单元格 */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {(p?.serviceMatrix?.rows || [
                { service: "Console", domain: "console.svc.plus", cells: {} },
                { service: "Accounts", domain: "accounts.svc.plus", cells: {} },
                { service: "Billing", domain: "billing.svc.plus", cells: {} },
              ]).map((row) => (
                <tr key={row.service} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 text-left">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">{row.service}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{row.domain}</div>
                  </td>
                  {MATRIX_COLUMNS.map((col) => {
                    const cellKey = `${col.service}:${col.endpoint}`;
                    const cell = row.cells?.[cellKey];

                    if (!cell || !cell.isRelevant) {
                      return (
                        <td key={cellKey} className="border border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 font-mono text-sm">
                          —
                        </td>
                      );
                    }

                    if (cell.result === "FAIL") {
                      return (
                        <td key={cellKey} className="border border-slate-200 dark:border-slate-800 p-1.5">
                          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded p-1.5 flex flex-col items-center justify-center shadow-xs">
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded leading-none">
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
                        <td key={cellKey} className="border border-slate-200 dark:border-slate-800 p-1.5">
                          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded p-1.5 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded leading-none">
                              NO DATA
                            </span>
                            <span className="text-xs font-bold text-slate-400 font-mono mt-1">—</span>
                            <span className="text-[10px] text-slate-400 font-mono">p95 —</span>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={cellKey} className="border border-slate-200 dark:border-slate-800 p-1.5">
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded p-1.5 flex flex-col items-center justify-center shadow-xs">
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded leading-none">
                            PASS
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white font-mono mt-1">
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
      <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 mb-4 shadow-sm overflow-hidden">
        <h2 className="text-xs font-semibold text-slate-900 dark:text-white mb-3">Flagger (Progressive Release)</h2>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2 px-3 font-medium w-48">Service</th>
                <th className="py-2 px-3 font-medium w-36">Flagger phase</th>
                <th className="py-2 px-3 font-medium w-40">Weight (candidate)</th>
                <th className="py-2 px-3 font-medium">Traffic (primary vs candidate)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {(p?.flaggerServices || []).map((fs) => {
                const isProgressing = fs.phase === "Progressing";
                const isSucceeded = fs.phase === "Succeeded";

                return (
                  <tr key={fs.service} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900 dark:text-white">{fs.service}</span>{" "}
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{fs.serviceDomain}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          isProgressing
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50"
                            : isSucceeded
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50"
                        }`}
                      >
                        {fs.phase}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white">
                      {fs.weight !== null ? `${fs.weight}%` : "0%"}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-48 sm:w-64 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm overflow-hidden flex">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${fs.primaryTrafficPct}%` }}
                            title={`Primary ${fs.primaryTrafficPct}%`}
                          ></div>
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${fs.candidateTrafficPct}%` }}
                            title={`Candidate ${fs.candidateTrafficPct}%`}
                          ></div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
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
      <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 mb-4 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-white">
              Top 10 Endpoint Details {dataSourceMode === "mock" ? "(Sample Mock Data)" : "(Live Data)"}
            </h2>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono">
              {dataSourceMode === "mock" ? "SAMPLE MOCK DATA" : "OBSERVABILITY VM"}
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            10/10 checks •{" "}
            <span className={p?.gateStatus.failedChecks ? "text-rose-600 font-semibold" : "text-emerald-600 font-semibold"}>
              {p?.gateStatus.failedChecks ?? 0} failed
            </span>{" "}
            • Updated: {lastRefreshedAt || p?.updatedAtUtc || "14:34:02 UTC"}
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] bg-slate-50/60 dark:bg-slate-800/40">
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
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {(p?.endpoints || []).map((ep) => {
                const isFail = ep.result === "FAIL";
                const isConsole = ep.service === "Console";
                const isAccounts = ep.service === "Accounts";

                return (
                  <tr key={ep.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-slate-400">{ep.order}</td>
                    <td className="py-2 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          isConsole
                            ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50"
                            : isAccounts
                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50"
                        }`}
                      >
                        {ep.service}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-900 dark:text-white font-medium">{ep.endpoint}</td>
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{ep.expectedHttp}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isFail
                            ? "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300"
                            : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                        }`}
                      >
                        {ep.observedHttp}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-900 dark:text-white">{ep.p95LatencyMs.toLocaleString()} ms</td>
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{ep.freshnessSec} s</td>
                    <td className="py-2 px-3">
                      {isFail ? (
                        <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          FAIL
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
        {/* 左侧 Gate rule 熔断规则高亮条 */}
        <div className="md:col-span-8 bg-slate-50/80 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 border-l-4 border-l-blue-500 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed shadow-sm">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-white">Gate rule:</span> The release is{" "}
            <span className="font-bold text-rose-600 dark:text-rose-400 tracking-wide">BLOCKED</span> if any endpoint is
            failed, stale (exceeds freshness), missing samples (NO DATA), or if the candidate
            request sample is insufficient.
          </div>
        </div>

        {/* 右侧 Candidate sample 样本数指标卡 */}
        <div className="md:col-span-4 bg-slate-50/80 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 border-l-4 border-l-purple-500 rounded-xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center shrink-0">
            <FlaskConical className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="text-xs text-slate-900 dark:text-white">
              <span className="text-slate-500 dark:text-slate-400">Candidate sample:</span>{" "}
              <span className="font-bold font-mono">
                {p?.candidateSample.requestsCount.toLocaleString() ?? "34,862"} requests
              </span>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 font-mono">
              {p?.candidateSample.summary ?? "(sufficient, ≥ 10,000)"}
            </div>
          </div>
        </div>
      </div>

      {/* 全量路由与后端服务 API 清单：三级分组树状展示 (Collapsible Routes & APIs Matrix) */}
      <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-all">
        {/* 折叠标题栏 */}
        <div
          onClick={() => setIsRoutesCollapsed(!isRoutesCollapsed)}
          className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-200 dark:border-slate-800 transition-colors select-none"
        >
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label={isRoutesCollapsed ? "展开全量资产树" : "折叠全量资产树"}
            >
              {isRoutesCollapsed ? (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Web Console 前端全量路由与后端服务 API 接口清单
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                (Full Routing &amp; Microservice APIs Matrix • 前端 / 后端 / 大类 / 子组件三级树状展示)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* 统计指标胶囊 */}
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 font-medium flex items-center gap-1">
              <Globe className="w-2.5 h-2.5" />
              {frontendCount} 前端路由 (7 大类)
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 font-medium flex items-center gap-1">
              <Server className="w-2.5 h-2.5" />
              {apiCount} 后端服务与探针 (8 大类)
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              All 100% Online
            </span>
          </div>
        </div>

        {/* 展开内容区 */}
        {!isRoutesCollapsed && (
          <div className="p-3.5 space-y-4">
            {/* 顶部工具栏：过滤 Tab、快捷操作、搜索框 */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* 分组过滤 Tab */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setRoutesFilter("all")}
                    className={
                      routesFilter === "all"
                        ? "px-2.5 py-1 rounded text-xs font-medium transition-colors bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "px-2.5 py-1 rounded text-xs font-medium transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }
                  >
                    All ({p?.allRoutesAndApis?.length ?? 181})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoutesFilter("frontend")}
                    className={
                      routesFilter === "frontend"
                        ? "px-2.5 py-1 rounded text-xs font-medium transition-colors bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs flex items-center gap-1"
                        : "px-2.5 py-1 rounded text-xs font-medium transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                    }
                  >
                    <Globe className="w-3 h-3" />
                    Frontend ({frontendCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoutesFilter("api")}
                    className={
                      routesFilter === "api"
                        ? "px-2.5 py-1 rounded text-xs font-medium transition-colors bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs flex items-center gap-1"
                        : "px-2.5 py-1 rounded text-xs font-medium transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                    }
                  >
                    <Server className="w-3 h-3" />
                    Backend APIs ({apiCount})
                  </button>
                </div>

                {/* 展开全部 / 折叠全部按钮 */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleExpandAll}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors"
                  >
                    展开全部
                  </button>
                  <button
                    type="button"
                    onClick={handleCollapseAll}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors"
                  >
                    折叠全部
                  </button>
                </div>
              </div>

              {/* 实时搜索框 */}
              <div className="relative min-w-[260px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="按路径、模块大类、服务或描述搜索..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>
            </div>

            {/* 三级分组树状展示区 */}
            <div className="space-y-4">
              {treeData.map((root) => {
                const isRootExpanded =
                  searchQuery.trim().length > 0 || expandedRoots[root.type] !== false;
                const isFrontend = root.type === "frontend";

                const rootBg = isFrontend
                  ? "bg-blue-50/70 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
                  : "bg-purple-50/70 hover:bg-purple-50 dark:bg-purple-950/20 dark:hover:bg-purple-950/30";

                const rootIconBg = isFrontend
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300";

                const rootPassBadge =
                  root.failCount === 0
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                    : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40";

                return (
                  <div
                    key={root.type}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40 shadow-xs"
                  >
                    {/* 一级节点 (Level 1: 前端 / 后端) */}
                    <div
                      onClick={() => toggleRoot(root.type)}
                      className={"flex flex-wrap items-center justify-between gap-3 p-3 cursor-pointer select-none transition-colors border-b border-slate-200 dark:border-slate-800 " + rootBg}
                    >
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                          aria-label={isRootExpanded ? "折叠大类" : "展开大类"}
                        >
                          {isRootExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                          )}
                        </button>
                        <div
                          className={"w-7 h-7 rounded-lg flex items-center justify-center " + rootIconBg}
                        >
                          {isFrontend ? <Globe className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{root.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {root.enTitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                          {root.categories.length} 个功能大类
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium font-mono">
                          {root.totalCount} 项
                        </span>
                        <span
                          className={"text-[11px] px-2 py-0.5 rounded-full font-medium " + rootPassBadge}
                        >
                          {root.passCount}/{root.totalCount} PASS
                        </span>
                      </div>
                    </div>

                    {/* 二级节点容器 (Level 2: 各功能大类) */}
                    {isRootExpanded && (
                      <div className="p-3 space-y-3">
                        {root.categories.map((cat) => {
                          const isCatExpanded =
                            searchQuery.trim().length > 0 || expandedCategories[cat.key] !== false;

                          const catPassBadge =
                            cat.failCount === 0
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40";

                          return (
                            <div
                              key={cat.key}
                              className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-850 shadow-xs"
                            >
                              {/* 二级节点标题栏 */}
                              <div
                                onClick={() => toggleCategory(cat.key)}
                                className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50/70 hover:bg-slate-100/60 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 cursor-pointer select-none transition-colors border-b border-slate-200 dark:border-slate-800/80"
                              >
                                <div className="flex items-center gap-2 pl-1">
                                  <button
                                    type="button"
                                    className="p-0.5 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                  >
                                    {isCatExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <div className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    {getCategoryIcon(cat.key)}
                                  </div>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                      {cat.name}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                                      {cat.enName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                      ({cat.key})
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pr-1" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                    {cat.totalCount} 项
                                  </span>
                                  <span
                                    className={"text-[11px] px-2 py-0.5 rounded-full font-medium " + catPassBadge}
                                  >
                                    {cat.passCount}/{cat.totalCount} PASS
                                  </span>
                                </div>
                              </div>

                              {/* 三级节点 (Level 3: 子组件 / 路由与 API 接口条目清单) */}
                              {isCatExpanded && (
                                <div className="overflow-x-auto scrollbar-thin">
                                  <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                      <tr className="bg-slate-50/40 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800 text-[11px]">
                                        <th className="py-2 px-3 w-10">#</th>
                                        <th className="py-2 px-3 w-20">Method</th>
                                        <th className="py-2 px-3 w-64">Path / Route</th>
                                        <th className="py-2 px-3 w-28">Service</th>
                                        <th className="py-2 px-3">Description</th>
                                        <th className="py-2 px-3 w-20">Expected</th>
                                        <th className="py-2 px-3 w-20">Observed</th>
                                        <th className="py-2 px-3 w-28">Latency</th>
                                        <th className="py-2 px-3 w-24">Result</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                      {cat.items.map((item, idx) => {
                                        const isPass = item.result === "PASS";
                                        const methodFirst = item.method.split(",")[0].trim().toUpperCase();
                                        const isGet = methodFirst === "GET";
                                        const isPost = methodFirst === "POST";
                                        const isPut = methodFirst === "PUT";
                                        const isDelete = methodFirst === "DELETE";

                                        const methodBadgeClass = isGet
                                          ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/40"
                                          : isPost
                                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40"
                                          : isPut
                                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40"
                                          : isDelete
                                          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/40"
                                          : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40";

                                        const observedBadgeClass =
                                          item.observedHttp === item.expectedHttp
                                            ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300"
                                            : "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300";

                                        return (
                                          <tr
                                            key={item.id}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors font-mono"
                                          >
                                            <td className="py-2 px-3 text-slate-400 text-[11px]">{idx + 1}</td>
                                            <td className="py-2 px-3">
                                              <span
                                                className={"px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wider " + methodBadgeClass}
                                              >
                                                {item.method}
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white text-xs">
                                              {item.path}
                                            </td>
                                            <td className="py-2 px-3 font-sans">
                                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                                {item.service}
                                              </span>
                                              <span className="block text-[10px] text-slate-400 font-mono">
                                                {item.serviceDomain}
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 font-sans text-slate-600 dark:text-slate-300 text-[11px]">
                                              {item.description}
                                            </td>
                                            <td className="py-2 px-3 text-slate-500 dark:text-slate-400 text-xs">
                                              {item.expectedHttp}
                                            </td>
                                            <td className="py-2 px-3 text-xs">
                                              <span
                                                className={"px-1.5 py-0.5 rounded font-bold " + observedBadgeClass}
                                              >
                                                {item.observedHttp}
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                                              {item.latencyMs} ms
                                              <span className="text-[10px] text-slate-400 block font-sans">
                                                {item.freshnessSec}s ago
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 font-sans">
                                              {isPass ? (
                                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                                  PASS
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                                                  <XCircle className="w-3.5 h-3.5" />
                                                  FAIL
                                                </span>
                                              )}
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
                        })}
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