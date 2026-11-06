"use client";

import { useState } from "react";
import useSWR from "swr";

import { ADMIN_API_BASE } from "../../lib/adminApi";

const resourceClasses = ["free", "shared", "plus", "pro", "custom"] as const;
const resourceLabels = {
  free: "Free",
  shared: "Shared",
  plus: "Plus",
  pro: "Pro",
  custom: "Custom",
} as const;
type ResourceClass = (typeof resourceClasses)[number];
type AgentStatus = "healthy" | "unhealthy" | "offline" | "unknown";
type Agent = {
  id: string;
  nodeId?: string;
  name?: string;
  resourceClass: ResourceClass;
  status: AgentStatus;
  lastHeartbeat?: string;
  lastSync?: string;
};

const copy = {
  zh: {
    status: {
      healthy: "正常",
      unhealthy: "异常",
      offline: "离线",
      unknown: "未上报",
    },
    filter: "节点类别",
    all: "全部",
    node: "节点",
    health: "状态",
    heartbeat: "最近心跳",
    sync: "最近同步",
    loading: "正在加载节点…",
    failed: "节点列表加载失败。",
    empty: "没有匹配的节点。",
    retry: "重试",
  },
  en: {
    status: {
      healthy: "Healthy",
      unhealthy: "Unhealthy",
      offline: "Offline",
      unknown: "Unreported",
    },
    filter: "Resource class",
    all: "All",
    node: "Node",
    health: "Status",
    heartbeat: "Last heartbeat",
    sync: "Last sync",
    loading: "Loading agents…",
    failed: "Could not load agents.",
    empty: "No matching agents.",
    retry: "Retry",
  },
};

const endpoint = `${ADMIN_API_BASE}/agents/inventory`;

async function fetchInventory(): Promise<{ agents: Agent[] }> {
  const response = await fetch(endpoint, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("agent_inventory_unavailable");
  return response.json();
}

export default function AgentInventory({
  accountId,
  language,
}: {
  accountId: string;
  language: string;
}) {
  const t = language === "zh" ? copy.zh : copy.en;
  const [filter, setFilter] = useState<ResourceClass | "all">("all");
  const { data, error, isLoading, mutate } = useSWR(
    [endpoint, accountId],
    fetchInventory,
    { refreshInterval: 30_000 },
  );
  const agents = (data?.agents ?? []).filter(
    (agent) => filter === "all" || agent.resourceClass === filter,
  );
  const formatter = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const date = (value?: string) =>
    value ? formatter.format(new Date(value)) : "—";

  return (
    <div className="space-y-4 px-4 py-4 sm:px-5">
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={t.filter}
      >
        {(["all", ...resourceClasses] as const).map((resourceClass) => (
          <button
            key={resourceClass}
            type="button"
            aria-pressed={filter === resourceClass}
            onClick={() => setFilter(resourceClass)}
            className="rounded-md border border-[color:var(--color-surface-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] aria-pressed:border-[var(--color-primary)] aria-pressed:text-[var(--color-primary)]"
          >
            {resourceClass === "all" ? t.all : resourceLabels[resourceClass]}
          </button>
        ))}
      </div>
      {error ? (
        <div role="alert" className="flex items-center gap-3 text-sm">
          {t.failed}
          <button
            type="button"
            className="underline"
            onClick={() => void mutate()}
          >
            {t.retry}
          </button>
        </div>
      ) : isLoading || agents.length === 0 ? (
        <p role="status" className="text-sm text-[var(--color-text-muted)]">
          {isLoading ? t.loading : t.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[color:var(--color-surface-border)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[color:var(--color-surface-border)] text-[var(--color-text-muted)]">
              <tr>
                {[t.node, t.filter, t.health, t.heartbeat, t.sync].map(
                  (label) => (
                    <th
                      key={label}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2 font-medium"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr
                  key={agent.id}
                  className="border-b border-[color:var(--color-surface-border)] last:border-b-0"
                >
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    {agent.name || agent.id}
                    {agent.name && agent.name !== agent.id && (
                      <span className="block text-xs font-normal text-[var(--color-text-muted)]">
                        {agent.id}
                      </span>
                    )}
                    {agent.nodeId && agent.nodeId !== agent.id && (
                      <span className="block text-xs font-normal text-[var(--color-text-muted)]">
                        {agent.nodeId}
                      </span>
                    )}
                  </th>
                  <td className="px-3 py-2">
                    {resourceLabels[agent.resourceClass]}
                  </td>
                  <td className="px-3 py-2">{t.status[agent.status]}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {date(agent.lastHeartbeat)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {date(agent.lastSync)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
