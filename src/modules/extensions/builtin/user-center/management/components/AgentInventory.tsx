"use client";

import { useState } from "react";
import useSWR from "swr";

import { ADMIN_API_BASE } from "../../lib/adminApi";
import AgentFreeGrantsModal from "./AgentFreeGrantsModal";

const resourceClasses = [
  "free",
  "shared",
  "plus",
  "pro",
  "custom",
  "team",
] as const;

const resourceLabels = {
  free: "Free",
  shared: "Shared",
  plus: "Plus",
  pro: "Pro",
  custom: "Custom",
  team: "Team",
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
  clients?: number;
  clientCount?: number;
};

const copy = {
  zh: {
    title: "Agent 分组与集中配置管理",
    description:
      "按 Free、Shared、Plus、Pro、Custom、Team (5+1) 分组集中查看边缘 Agent 节点身份、健康状态、最近心跳与配置同步回执，统一管理 Custom 白名单与 Team 节点审批。",
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
    clients: "客户端数",
    heartbeat: "最近心跳",
    sync: "最近同步",
    actions: "配置管理",
    loading: "正在加载节点…",
    failed: "节点列表加载失败。",
    empty: "没有匹配的节点。",
    retry: "重试",
    manageGrants: "临时 Free 白名单管理",
    grantAction: "临时白名单",
    teamDecision: "团队审批",
  },
  en: {
    title: "Agent grouping & centralized configuration",
    description:
      "Inspect edge Agent node identities, health status, recent heartbeats, and configuration sync across Free, Shared, Plus, Pro, Custom, and Team (5+1) resource classes.",
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
    clients: "Clients",
    heartbeat: "Last heartbeat",
    sync: "Last sync",
    actions: "Configuration",
    loading: "Loading agents…",
    failed: "Could not load agents.",
    empty: "No matching agents.",
    retry: "Retry",
    manageGrants: "Manage Free Grants",
    grantAction: "Free Grants",
    teamDecision: "Team Decision",
  },
};

const endpoint = `${ADMIN_API_BASE}/agents/inventory`;
const teamEndpoint = `${ADMIN_API_BASE}/agents/team-enrollments`;

async function fetchInventory(): Promise<{ agents: Agent[] }> {
  const response = await fetch(endpoint, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("agent_inventory_unavailable");
  return response.json();
}

async function fetchTeamEnrollments(): Promise<{ agents: Array<{
  agentId?: string;
  entryPoint?: string;
  online?: boolean;
  status?: string;
  lastHeartbeat?: string;
  updatedAt?: string;
}> }> {
  try {
    const response = await fetch(teamEndpoint, {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return { agents: [] };
    return response.json();
  } catch {
    return { agents: [] };
  }
}

export default function AgentInventory({
  accountId,
  language,
  canManage = false,
  onSelectTeamAgent,
}: {
  accountId: string;
  language: string;
  canManage?: boolean;
  onSelectTeamAgent?: (agentId: string) => void;
}) {
  const t = language === "zh" ? copy.zh : copy.en;
  const [filter, setFilter] = useState<ResourceClass | "all">("all");
  const [isGrantsModalOpen, setIsGrantsModalOpen] = useState(false);
  const [selectedCustomNodeId, setSelectedCustomNodeId] = useState<string | undefined>();

  const { data, error, isLoading, mutate } = useSWR(
    [endpoint, accountId],
    fetchInventory,
    { refreshInterval: 30_000 },
  );

  const teamSWR = useSWR(
    [teamEndpoint, accountId],
    fetchTeamEnrollments,
    { refreshInterval: 30_000 },
  );

  const inventoryAgents = data?.agents ?? [];
  const existingIds = new Set(inventoryAgents.map((a) => a.id));

  const teamAgents: Agent[] = (teamSWR.data?.agents ?? [])
    .filter((entry) => Boolean(entry && entry.agentId && !existingIds.has(entry.agentId)))
    .map((entry) => ({
      id: entry.agentId as string,
      nodeId: entry.agentId,
      name: entry.entryPoint ? `${entry.agentId} (${entry.entryPoint})` : entry.agentId,
      resourceClass: "team" as const,
      status: entry.online ? "healthy" : "offline",
      lastHeartbeat: entry.lastHeartbeat,
      lastSync: entry.updatedAt,
      clients: undefined,
    }));

  const allAgents = [...inventoryAgents, ...teamAgents];
  const customNodeIds = inventoryAgents.flatMap((agent) =>
    agent.resourceClass === "custom" && agent.nodeId ? [agent.nodeId] : [],
  );

  const agents = allAgents.filter(
    (agent) => filter === "all" || agent.resourceClass === filter,
  );

  const formatter = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const date = (value?: string) =>
    value ? formatter.format(new Date(value)) : "—";

  return (
    <section
      aria-label={t.title}
      className="space-y-4 rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-4 sm:px-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-heading)]">
            {t.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {t.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCustomNodeId(undefined);
              setIsGrantsModalOpen(true);
            }}
            className="inline-flex h-9 items-center rounded-md border border-[color:var(--color-surface-border)] px-3 text-xs font-medium text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-heading)]"
          >
            {t.manageGrants}
          </button>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={t.filter}
      >
        {(["all", ...resourceClasses] as const).map((resourceClass) => {
          const label =
            resourceClass === "all" ? t.all : resourceLabels[resourceClass];
          const count =
            resourceClass === "all"
              ? allAgents.length
              : allAgents.filter((a) => a.resourceClass === resourceClass).length;
          return (
            <button
              key={resourceClass}
              type="button"
              aria-label={label}
              aria-pressed={filter === resourceClass}
              onClick={() => setFilter(resourceClass)}
              className="inline-flex items-center rounded-md border border-[color:var(--color-surface-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] aria-pressed:border-[var(--color-primary)] aria-pressed:text-[var(--color-primary)]"
            >
              {label}
              {count > 0 && (
                <span
                  aria-hidden="true"
                  className="ml-1.5 rounded-full bg-[var(--color-surface-hover)] px-1.5 py-0.2 text-xs font-mono text-[var(--color-text-muted)]"
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
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
                {[
                  t.node,
                  t.filter,
                  t.health,
                  t.clients,
                  t.heartbeat,
                  t.sync,
                  t.actions,
                ].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="whitespace-nowrap px-3 py-2 font-medium"
                  >
                    {label}
                  </th>
                ))}
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
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        agent.resourceClass === "free"
                          ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                          : agent.resourceClass === "shared"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : agent.resourceClass === "plus"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : agent.resourceClass === "pro"
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                : agent.resourceClass === "custom"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      }`}
                    >
                      {resourceLabels[agent.resourceClass]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        agent.status === "healthy"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : agent.status === "unhealthy"
                            ? "text-red-600 dark:text-red-400"
                            : "text-[var(--color-text-muted)]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          agent.status === "healthy"
                            ? "bg-emerald-500"
                            : agent.status === "unhealthy"
                              ? "bg-red-500"
                              : "bg-zinc-400"
                        }`}
                      />
                      {t.status[agent.status] ?? agent.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {agent.clientCount ?? agent.clients ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {date(agent.lastHeartbeat)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {date(agent.lastSync)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {agent.resourceClass === "custom" && agent.nodeId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomNodeId(agent.nodeId);
                          setIsGrantsModalOpen(true);
                        }}
                        className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-600 transition hover:bg-amber-500/10 dark:text-amber-400"
                      >
                        {t.grantAction}
                      </button>
                    ) : agent.resourceClass === "team" ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTeamAgent?.(agent.id);
                          const el = document.querySelector(
                            'section[aria-label="Team agents"]',
                          );
                          el?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="rounded border border-indigo-500/40 px-2 py-1 text-xs text-indigo-600 transition hover:bg-indigo-500/10 dark:text-indigo-400"
                      >
                        {t.teamDecision}
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isGrantsModalOpen && (
        <AgentFreeGrantsModal
          onClose={() => setIsGrantsModalOpen(false)}
          initialNodeId={selectedCustomNodeId}
          customNodeIds={customNodeIds}
          canManage={canManage}
          language={language}
        />
      )}
    </section>
  );
}
