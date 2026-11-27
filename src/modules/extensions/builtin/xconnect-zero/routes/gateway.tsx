"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Check,
  Copy,
  Globe,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";

import { useLanguage } from "@i18n/LanguageProvider";
import type { XConnectZeroGateway } from "@lib/xconnectZero";

function formatModeLabel(mode: string): string {
  switch (mode) {
    case "wg_vless_l3":
      return "WireGuard over VLESS (L3)";
    case "wg_vless_l2":
      return "WireGuard over VLESS (L2)";
    case "wg_udp_l3":
      return "WireGuard UDP (L3)";
    default:
      return mode || "wg_vless_l3";
  }
}

function formatLastSeen(value?: string | null): string {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function XConnectZeroGatewayRoute() {
  const { language } = useLanguage();
  const zh = language === "zh";
  const [gateways, setGateways] = useState<XConnectZeroGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadGateways = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/xconnect-zero/gateways", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as {
        gateways?: XConnectZeroGateway[];
        error?: string;
        message?: string;
      } | null;
      if (!response.ok) {
        throw new Error(
          payload?.message || payload?.error || `HTTP ${response.status}`,
        );
      }
      setGateways(Array.isArray(payload?.gateways) ? payload.gateways : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load available gateways",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGateways();
  }, [loadGateways]);

  const healthyCount = useMemo(
    () => gateways.filter((gw) => gw.runtime_healthy).length,
    [gateways],
  );

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2000);
    } catch {
      // Clipboard unavailable in restricted context
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 uppercase tracking-wider">
              <Server className="h-3.5 w-3.5" />
              <span>XConnect Zero</span>
            </span>
            <Link
              href="/panel/agent"
              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {zh ? "运营与管理 / Agent 分组" : "Admin & Operations / Agent Groups"}
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {zh ? "Gateway 分组" : "Gateway Groups"}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {zh
              ? "查看当前账号可接入的 XConnect Gateway 网关节点分组，支持一键复制 CLI 连接命令。"
              : "Inspect available XConnect Gateway groups for your account and copy CLI connection commands."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/panel/agent"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {zh ? "Agent 分组" : "Agent Groups"}
          </Link>
          <Link
            href="/panel/xconnect-zero"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {zh ? "管理网络" : "Manage networks"}
          </Link>
          <button
            type="button"
            onClick={() => void loadGateways()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>可用网关总数</span>
            <Server className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {gateways.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>健康运行节点</span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {healthyCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>默认接入协议</span>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-base font-medium text-slate-900 dark:text-slate-100">
            WireGuard over VLESS (443)
          </div>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          加载网关列表失败：{error}
        </div>
      ) : null}

      {!loading && !error && gateways.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <Globe className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-base font-medium text-slate-900 dark:text-slate-100">
            暂无可用 Gateway 节点
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            请先在 XConnect Zero 控面创建或绑定私有网络与网关节点。
          </p>
        </div>
      ) : null}

      {gateways.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">网关节点</th>
                  <th className="px-4 py-3">所属网络 / CIDR</th>
                  <th className="px-4 py-3">入口地址</th>
                  <th className="px-4 py-3">传输模式</th>
                  <th className="px-4 py-3">状态 / 最近心跳</th>
                  <th className="px-4 py-3">CLI 接入命令</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {gateways.map((gw) => {
                  const host =
                    gw.gateway_endpoint_host || gw.transport_server_name;
                  const upCommand = `xconnect-one up --gateway ${host || gw.gateway_id}`;
                  const copyId = `up:${gw.gateway_id}`;
                  return (
                    <tr
                      key={`${gw.network_id}:${gw.gateway_id}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {gw.display_name || gw.gateway_id}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                          {gw.gateway_id}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                          {gw.network_id}
                        </div>
                        {gw.cidr ? (
                          <div className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                            {gw.cidr}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-mono text-xs text-slate-800 dark:text-slate-200">
                          {host}:{gw.transport_port || 443}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          WG Port {gw.gateway_endpoint_port || 51820} (encapsulated)
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          {formatModeLabel(gw.connection_mode)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            gw.runtime_healthy
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              gw.runtime_healthy ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {gw.runtime_healthy ? "Healthy" : "Degraded"}
                        </span>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatLastSeen(gw.last_seen_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-center gap-2">
                          <code className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            <Terminal className="h-3 w-3 shrink-0 text-slate-400" />
                            <span>{upCommand}</span>
                          </code>
                          <button
                            type="button"
                            onClick={() => void handleCopy(copyId, upCommand)}
                            aria-label={`Copy command for ${gw.gateway_id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            {copiedKey === copyId ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                <span>已复制</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>复制</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
