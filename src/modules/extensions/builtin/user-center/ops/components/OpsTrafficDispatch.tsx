"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  RefreshCw,
  Server,
  ShieldAlert,
  Sliders,
  Terminal,
} from "lucide-react";

import { ADMIN_API_BASE } from "../../lib/adminApi";
import {
  CANONICAL_SEED_NODES,
  buildFluxgateSwarmSnippet,
  buildHaproxyBackendSnippet,
  buildHaproxyDrainCheckCommand,
  buildHaproxyReloadCommands,
  buildHaproxyRollbackCommands,
  buildHaproxyWeightCommands,
  buildPlaybookVarsYaml,
  clampWeight,
  createDispatchPlanConfig,
  deriveRemoteServerName,
  getScenarioPresets,
  mergeInventoryNodes,
  sanitizeHaproxyIdentifier,
  type ApiInventoryAgent,
  type DispatchNode,
  type DispatchScenario,
} from "../trafficDispatch";

type OutputTab = "haproxy" | "playbook" | "fluxgate";

type ChecklistStepId =
  | "backup"
  | "reload"
  | "weights"
  | "drain-check"
  | "maintenance";

interface ChecklistItem {
  id: ChecklistStepId;
  title: string;
  detail: string;
}

interface OperationLogEntry {
  id: string;
  timestamp: string;
  message: string;
}

const CHECKLIST_STEPS: readonly ChecklistItem[] = [
  {
    id: "backup",
    title: "1. 备份当前配置",
    detail: "保存 /etc/haproxy/haproxy.cfg 时间戳快照，确保可秒级回滚。",
  },
  {
    id: "reload",
    title: "2. 双后端无损 Reload",
    detail: "配置 be_xray_xhttp 双后端后执行 haproxy -c 校验与 systemctl reload haproxy。",
  },
  {
    id: "weights",
    title: "3. Admin Socket 灰度调权",
    detail: "按 80/20 → 50/50 → 20/80 → 0/100 通过 socat admin.sock 热调权。",
  },
  {
    id: "drain-check",
    title: "4. 确认 scur=0 排空",
    detail: "通过 show stat 确认源节点本地 xray 活跃会话 (scur) 归零且目标节点 UP。",
  },
  {
    id: "maintenance",
    title: "5. 执行升级或节点维护",
    detail: "完成 Xray/HAProxy 滚动升级或慢节点下线检修，并在完成后按需恢复权重。",
  },
];

const surface =
  "rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)]";

const inputClass =
  "w-full rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-heading)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-muted)]";

const INVENTORY_ENDPOINT = `${ADMIN_API_BASE}/agents/inventory`;

async function fetchAgentInventory(): Promise<{
  agents: ApiInventoryAgent[];
  live: boolean;
}> {
  const response = await fetch(INVENTORY_ENDPOINT, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("agent_inventory_unavailable");
  }
  const payload = (await response.json()) as { agents?: ApiInventoryAgent[] };
  const agents = Array.isArray(payload?.agents) ? payload.agents : [];
  return { agents, live: agents.length > 0 };
}

function statusBadge(status: DispatchNode["status"]) {
  switch (status) {
    case "healthy":
      return {
        label: "健康",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "degraded":
      return {
        label: "波动/慢节点",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
    case "offline":
      return {
        label: "离线",
        className: "border-red-200 bg-red-50 text-red-700",
      };
    default:
      return {
        label: "未知",
        className: "border-slate-200 bg-slate-50 text-slate-600",
      };
  }
}

function formatNowTime(): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

export default function OpsTrafficDispatch() {
  const inventorySWR = useSWR(INVENTORY_ENDPOINT, fetchAgentInventory, {
    revalidateOnFocus: false,
  });

  const isLiveInventory = Boolean(
    !inventorySWR.error &&
      inventorySWR.data?.live &&
      (inventorySWR.data?.agents?.length ?? 0) > 0,
  );

  const nodes = useMemo<DispatchNode[]>(() => {
    if (inventorySWR.error || !inventorySWR.data?.live) {
      return mergeInventoryNodes([]);
    }
    return mergeInventoryNodes(inventorySWR.data.agents);
  }, [inventorySWR.data, inventorySWR.error]);

  const [sourceId, setSourceId] = useState<string>(CANONICAL_SEED_NODES[0].id);
  const [targetId, setTargetId] = useState<string>(CANONICAL_SEED_NODES[1].id);
  const [targetAddressOverride, setTargetAddressOverride] = useState<string>("");
  const [targetSniOverride, setTargetSniOverride] = useState<string>("");
  const [remoteAliasOverride, setRemoteAliasOverride] = useState<string>("");
  const [scenario, setScenario] = useState<DispatchScenario>("rolling-upgrade");
  const [localWeight, setLocalWeight] = useState<number>(80);
  const [activeTab, setActiveTab] = useState<OutputTab>("haproxy");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<ChecklistStepId, boolean>>({
    backup: false,
    reload: false,
    weights: false,
    "drain-check": false,
    maintenance: false,
  });
  const [logs, setLogs] = useState<OperationLogEntry[]>([]);

  const appendLog = (message: string) => {
    setLogs((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: formatNowTime(),
        message,
      },
      ...current.slice(0, 29),
    ]);
  };

  const sourceNode = useMemo(() => {
    return nodes.find((node) => node.id === sourceId) ?? nodes[0] ?? CANONICAL_SEED_NODES[0];
  }, [nodes, sourceId]);

  const baseTargetNode = useMemo(() => {
    return (
      nodes.find((node) => node.id === targetId) ??
      nodes.find((node) => node.id !== sourceNode.id) ??
      CANONICAL_SEED_NODES[1]
    );
  }, [nodes, sourceNode.id, targetId]);

  const effectiveTargetNode = useMemo<DispatchNode>(
    () => ({
      ...baseTargetNode,
      address: targetAddressOverride.trim() || baseTargetNode.address,
      sni: targetSniOverride.trim() || baseTargetNode.sni,
    }),
    [baseTargetNode, targetAddressOverride, targetSniOverride],
  );

  const planConfig = useMemo(
    () =>
      createDispatchPlanConfig({
        sourceNode,
        targetNode: effectiveTargetNode,
        scenario,
        localWeight,
        remoteServerName:
          remoteAliasOverride.trim()
            ? sanitizeHaproxyIdentifier(remoteAliasOverride, "peer")
            : deriveRemoteServerName(effectiveTargetNode.id),
      }),
    [effectiveTargetNode, localWeight, remoteAliasOverride, scenario, sourceNode],
  );

  const stagePresets = useMemo(
    () => getScenarioPresets(scenario, planConfig.localWeight),
    [planConfig.localWeight, scenario],
  );

  const backendSnippet = useMemo(
    () => buildHaproxyBackendSnippet(planConfig),
    [planConfig],
  );
  const reloadCommands = useMemo(
    () => buildHaproxyReloadCommands(planConfig),
    [planConfig],
  );
  const stageCommandsText = useMemo(() => {
    if (scenario === "rolling-upgrade") {
      return stagePresets
        .map(
          (stage) =>
            `# ${stage.label}\n${buildHaproxyWeightCommands(
              planConfig,
              stage.localWeight,
              stage.remoteWeight,
            )}`,
        )
        .join("\n\n");
    }
    return buildHaproxyWeightCommands(
      planConfig,
      planConfig.localWeight,
      planConfig.remoteWeight,
    );
  }, [planConfig, scenario, stagePresets]);
  const drainCheckCommand = useMemo(
    () => buildHaproxyDrainCheckCommand(planConfig),
    [planConfig],
  );
  const rollbackCommands = useMemo(
    () => buildHaproxyRollbackCommands(planConfig),
    [planConfig],
  );
  const fullHaproxyRunbook = useMemo(
    () =>
      [
        reloadCommands,
        "",
        `# 3. backend ${planConfig.backendName} 双后端配置片段`,
        backendSnippet,
        "",
        "# 4. Admin Socket 实时热调权",
        stageCommandsText,
        "",
        "# 5. 排空观测 (pxname,svname,scur,status,weight)",
        drainCheckCommand,
        "",
        "# 6. 秒级回滚预案",
        rollbackCommands,
      ].join("\n"),
    [
      backendSnippet,
      drainCheckCommand,
      planConfig.backendName,
      reloadCommands,
      rollbackCommands,
      stageCommandsText,
    ],
  );
  const playbookYaml = useMemo(
    () => buildPlaybookVarsYaml(planConfig),
    [planConfig],
  );
  const fluxgateSnippet = useMemo(
    () => buildFluxgateSwarmSnippet(planConfig),
    [planConfig],
  );

  const selectSource = (node: DispatchNode) => {
    setSourceId(node.id);
    appendLog(`已指定待排空源节点：${node.id} (${node.address})`);
  };

  const selectTarget = (node: DispatchNode) => {
    setTargetId(node.id);
    setTargetAddressOverride(node.address);
    setTargetSniOverride(node.sni);
    setRemoteAliasOverride(deriveRemoteServerName(node.id));
    appendLog(`已指定承接目标节点：${node.id} (${node.address})`);
  };

  const handleScenarioChange = (nextScenario: DispatchScenario) => {
    setScenario(nextScenario);
    if (nextScenario === "rolling-upgrade") {
      setLocalWeight(80);
      appendLog("切换场景：滚动升级排水（初始权重 80/20）");
    } else if (nextScenario === "slow-node") {
      setLocalWeight(0);
      appendLog("切换场景：慢节点故障紧急切流（立即权重 0/100）");
    } else {
      appendLog(`切换场景：自定义权重（当前 ${localWeight}/${100 - localWeight}）`);
    }
  };

  const applyWeightPreset = (nextLocal: number, label: string) => {
    const clamped = clampWeight(nextLocal);
    setLocalWeight(clamped);
    appendLog(`应用权重档位 ${label}：本地 ${clamped}% / 目标 ${100 - clamped}%`);
  };

  const handleCopy = async (key: string, text: string, label: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopiedId(key);
      appendLog(`已复制「${label}」到剪贴板`);
      setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      appendLog(`复制「${label}」失败，请手动选中复制`);
    }
  };

  const handleDownload = (filename: string, content: string, mimeType: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    appendLog(`已下载配置文件：${filename}`);
  };

  const toggleChecklistStep = (step: ChecklistItem) => {
    setCheckedSteps((current) => {
      const nextValue = !current[step.id];
      appendLog(
        `${nextValue ? "已完成" : "取消标记"}检查项：${step.title}`,
      );
      return { ...current, [step.id]: nextValue };
    });
  };

  const completedCount = Object.values(checkedSteps).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-eyebrow font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Operations / traffic dispatch
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">
            手动流量调度
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            围绕 HAProxy 双后端无损 reload、Admin Socket 热调权与 Fluxgate v0.3.0 蜂群排空生成零中断切流方案。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              isLiveInventory
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            {isLiveInventory ? "实时节点库存已同步" : "基准节点模板模式"}
          </span>
          <button
            type="button"
            onClick={() => {
              inventorySWR.mutate();
              appendLog("手动刷新节点库存状态");
            }}
            aria-label="刷新节点库存"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition hover:border-[color:var(--color-primary-border)] hover:text-[var(--color-primary)]"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${inventorySWR.isLoading ? "animate-spin" : ""}`}
            />
            刷新库存
          </button>
        </div>
      </div>

      <section
        role="note"
        className="flex items-start gap-3 rounded-xl border border-[color:var(--color-warning-muted)] bg-[var(--color-warning-muted)]/25 p-4 text-sm text-[var(--color-warning-foreground)]"
      >
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" />
        <div className="space-y-1">
          <p className="font-semibold">
            零中断安全红线：非首次初始化配置变更严禁使用进程重启，必须通过 HAProxy{" "}
            <code className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-xs">
              reload
            </code>{" "}
            （配合 <code className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-xs">expose-fd listeners</code>）与{" "}
            <code className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-xs">
              admin.sock
            </code>{" "}
            实时调权，以保留存量 XHTTP/H2 长连接。
          </p>
          <p className="text-xs opacity-90">
            本控制台仅生成并校验调度命令与 Playbook 变量，所有变更需运维人员在目标节点或 Ansible Playbook 执行阶段显式确认。
          </p>
        </div>
      </section>

      <section className={`${surface} overflow-hidden`} aria-labelledby="topology-heading">
        <div className="flex flex-col gap-2 border-b border-[color:var(--color-surface-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2
              id="topology-heading"
              className="flex items-center gap-2 text-base font-semibold text-[var(--color-heading)]"
            >
              <Server className="h-4 w-4 text-[var(--color-primary)]" />
              节点拓扑与源 / 目标指派
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              当前路径：{planConfig.sourceNode.id} → {planConfig.targetNode.id}（{planConfig.targetNode.address}）
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[var(--color-text-muted)]">
              源节点：<strong className="text-[var(--color-heading)]">{planConfig.sourceNode.id}</strong>
            </span>
            <ArrowLeftRight className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <span className="rounded-md border border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)]/40 px-2.5 py-1 text-[var(--color-primary)]">
              目标节点：<strong>{planConfig.targetNode.id}</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-left text-sm">
            <caption className="sr-only">边缘节点拓扑与流量调度目标选择表</caption>
            <thead className="bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">节点 ID</th>
                <th className="px-3 py-3 font-medium">地址 / SNI</th>
                <th className="px-3 py-3 font-medium">代理引擎</th>
                <th className="px-3 py-3 font-medium">健康状态</th>
                <th className="px-3 py-3 font-medium">活跃连接</th>
                <th className="px-4 py-3 text-right font-medium sm:px-5">调度指派</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-surface-border)]">
              {nodes.map((node) => {
                const badge = statusBadge(node.status);
                const isSource = node.id === sourceNode.id;
                const isTarget = node.id === baseTargetNode.id;
                return (
                  <tr
                    key={node.id}
                    className={`transition hover:bg-[var(--color-surface-hover)] ${
                      isSource || isTarget ? "bg-[var(--color-primary-muted)]/20" : ""
                    }`}
                  >
                    <td className="px-4 py-3 sm:px-5">
                      <div className="font-mono text-xs font-semibold text-[var(--color-heading)]">
                        {node.id}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
                        {node.resourceClass} · {node.source === "live" ? "实时库存" : "基准模板"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-mono text-xs text-[var(--color-heading)]">
                        {node.address}
                      </div>
                      <div className="mt-0.5 font-mono text-eyebrow text-[var(--color-text-subtle)]">
                        SNI: {node.sni || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          node.engine === "haproxy"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-violet-200 bg-violet-50 text-violet-700"
                        }`}
                      >
                        {node.engine === "haproxy" ? "HAProxy" : "Fluxgate"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-[var(--color-heading)]">
                      {node.activeClients}
                    </td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => selectSource(node)}
                          aria-pressed={isSource}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                            isSource
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                              : "border-[color:var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[color:var(--color-primary-border)] hover:text-[var(--color-primary)]"
                          }`}
                        >
                          设为源节点
                        </button>
                        <button
                          type="button"
                          onClick={() => selectTarget(node)}
                          aria-pressed={isTarget}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                            isTarget
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-[color:var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-emerald-300 hover:text-emerald-700"
                          }`}
                        >
                          设为目标节点
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 border-t border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 p-4 sm:grid-cols-3 sm:px-5">
          <label className="block space-y-1 text-xs font-medium text-[var(--color-text-muted)]">
            目标节点地址覆盖 (IP:Port)
            <input
              type="text"
              value={targetAddressOverride}
              onChange={(event) => setTargetAddressOverride(event.target.value)}
              placeholder={baseTargetNode.address}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1 text-xs font-medium text-[var(--color-text-muted)]">
            目标节点 SNI 覆盖
            <input
              type="text"
              value={targetSniOverride}
              onChange={(event) => setTargetSniOverride(event.target.value)}
              placeholder={baseTargetNode.sni || "jp-xconnect-02.svc.plus"}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1 text-xs font-medium text-[var(--color-text-muted)]">
            HAProxy Peer 别名 (server name)
            <input
              type="text"
              value={remoteAliasOverride}
              onChange={(event) => setRemoteAliasOverride(event.target.value)}
              placeholder={deriveRemoteServerName(effectiveTargetNode.id)}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <section className={`${surface} space-y-4 p-4 sm:p-5`} aria-labelledby="scenario-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="scenario-heading"
                className="flex items-center gap-2 text-base font-semibold text-[var(--color-heading)]"
              >
                <Sliders className="h-4 w-4 text-[var(--color-primary)]" />
                调度场景与权重分配
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                通过滑块或预设档位实时计算本地与目标节点的分配比例。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="调度场景">
            <button
              type="button"
              aria-pressed={scenario === "rolling-upgrade"}
              onClick={() => handleScenarioChange("rolling-upgrade")}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                scenario === "rolling-upgrade"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : "border-[color:var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]"
              }`}
            >
              滚动升级排水
            </button>
            <button
              type="button"
              aria-pressed={scenario === "slow-node"}
              onClick={() => handleScenarioChange("slow-node")}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                scenario === "slow-node"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : "border-[color:var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]"
              }`}
            >
              慢节点故障紧急切流
            </button>
            <button
              type="button"
              aria-pressed={scenario === "custom"}
              onClick={() => handleScenarioChange("custom")}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                scenario === "custom"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : "border-[color:var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]"
              }`}
            >
              自定义权重
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--color-heading)]">
                本地权重 {planConfig.localWeight}%
              </span>
              <span className="font-medium text-emerald-700">
                目标节点 {planConfig.remoteWeight}%
              </span>
            </div>

            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
              aria-hidden="true"
            >
              <div
                className="bg-[var(--color-primary)] transition-all"
                style={{ width: `${planConfig.localWeight}%` }}
              />
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${planConfig.remoteWeight}%` }}
              />
            </div>

            <label className="block space-y-1 text-xs font-medium text-[var(--color-text-muted)]">
              <span>调整本地保留权重（0% ~ 100%）</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={planConfig.localWeight}
                onChange={(event) => {
                  const next = clampWeight(Number(event.target.value));
                  setLocalWeight(next);
                  if (scenario !== "custom") {
                    setScenario("custom");
                  }
                }}
                aria-label="本地保留权重百分比"
                className="w-full accent-[var(--color-primary)]"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { label: "80/20", local: 80 },
                { label: "50/50", local: 50 },
                { label: "20/80", local: 20 },
                { label: "0/100", local: 0 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyWeightPreset(preset.local, preset.label)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-mono font-medium transition ${
                    planConfig.localWeight === preset.local
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-muted)] text-[var(--color-primary)]"
                      : "border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-heading)]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
              当前场景阶段建议
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {stagePresets.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => applyWeightPreset(stage.localWeight, stage.label)}
                  className={`rounded-lg border p-3 text-left transition ${
                    planConfig.localWeight === stage.localWeight
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-muted)]/35"
                      : "border-[color:var(--color-surface-border)] bg-[var(--color-surface)] hover:border-[color:var(--color-primary-border)]"
                  }`}
                >
                  <div className="text-xs font-semibold text-[var(--color-heading)]">
                    {stage.label}
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {stage.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={`${surface} flex flex-col justify-between p-4 sm:p-5`} aria-labelledby="checklist-heading">
          <div>
            <div className="flex items-center justify-between">
              <h2
                id="checklist-heading"
                className="flex items-center gap-2 text-base font-semibold text-[var(--color-heading)]"
              >
                <CheckCircle2 className="h-4 w-4 text-[var(--color-primary)]" />
                执行检查清单
              </h2>
              <span className="rounded-full bg-[var(--color-primary-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
                {completedCount}/{CHECKLIST_STEPS.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              按顺序勾选人工确认步骤，所有动作仅记录在本地操作日志中。
            </p>

            <ul className="mt-4 space-y-2.5">
              {CHECKLIST_STEPS.map((step) => {
                const checked = checkedSteps[step.id];
                return (
                  <li key={step.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        checked
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-[color:var(--color-surface-border)] bg-[var(--color-surface)] hover:border-[color:var(--color-primary-border)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleChecklistStep(step)}
                        className="mt-0.5 h-4 w-4 rounded border-[color:var(--color-surface-border)] accent-[var(--color-primary)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-[var(--color-heading)]">
                          {step.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                          {step.detail}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-heading)]">
                本地操作日志
              </span>
              {logs.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-primary)]"
                >
                  清空
                </button>
              ) : null}
            </div>
            {logs.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
                尚无操作记录。选择节点、调整权重或勾选检查项后将在此留痕。
              </p>
            ) : (
              <ul className="mt-2 max-h-36 space-y-1.5 overflow-y-auto text-xs">
                {logs.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2 text-[var(--color-text-muted)]">
                    <span className="shrink-0 font-mono text-[var(--color-text-subtle)]">
                      [{entry.timestamp}]
                    </span>
                    <span>{entry.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className={`${surface} overflow-hidden`} aria-labelledby="outputs-heading">
        <div className="flex flex-col gap-3 border-b border-[color:var(--color-surface-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2
              id="outputs-heading"
              className="flex items-center gap-2 text-base font-semibold text-[var(--color-heading)]"
            >
              <Terminal className="h-4 w-4 text-[var(--color-primary)]" />
              调度指令与编排产物
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              直接对齐 <code className="font-mono">roles/vhosts/haproxy</code> 与 Fluxgate v0.3.0 蜂群控制面。
            </p>
          </div>

          <div className="flex flex-wrap gap-1 rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] p-1" role="tablist" aria-label="调度指令面板">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "haproxy"}
              onClick={() => setActiveTab("haproxy")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeTab === "haproxy"
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-heading)]"
              }`}
            >
              HAProxy 零中断切流命令
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "playbook"}
              onClick={() => setActiveTab("playbook")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeTab === "playbook"
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-heading)]"
              }`}
            >
              Playbook Role 变量 YAML
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "fluxgate"}
              onClick={() => setActiveTab("fluxgate")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeTab === "fluxgate"
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-heading)]"
              }`}
            >
              Fluxgate v0.3.0 蜂群联动指令
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === "haproxy" ? (
            <div role="tabpanel" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[var(--color-text-muted)]">
                  在源节点 <code className="font-mono">{planConfig.sourceNode.id}</code> 上按顺序执行：备份 → 校验并无损 reload → admin.sock 热调权 → show stat 排空观测。
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy("haproxy-all", fullHaproxyRunbook, "HAProxy 完整切流命令")
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-heading)] hover:border-[color:var(--color-primary-border)]"
                  >
                    {copiedId === "haproxy-all" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedId === "haproxy-all" ? "已复制" : "复制全部命令"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        "haproxy-traffic-dispatch.sh",
                        fullHaproxyRunbook,
                        "text/x-shellscript",
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    下载脚本
                  </button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <CodeBlockCard
                  title={`backend ${planConfig.backendName} 配置片段`}
                  code={backendSnippet}
                  copied={copiedId === "backend"}
                  onCopy={() =>
                    handleCopy("backend", backendSnippet, "backend be_xray_xhttp 配置")
                  }
                />
                <CodeBlockCard
                  title="备份与无损 Reload 命令"
                  code={reloadCommands}
                  copied={copiedId === "reload"}
                  onCopy={() =>
                    handleCopy("reload", reloadCommands, "备份与无损 reload 命令")
                  }
                />
                <CodeBlockCard
                  title="Admin Socket 分阶段热调权"
                  code={stageCommandsText}
                  copied={copiedId === "weights"}
                  onCopy={() =>
                    handleCopy("weights", stageCommandsText, "admin.sock 热调权命令")
                  }
                />
                <CodeBlockCard
                  title="排空观测 (show stat) 与秒级回滚"
                  code={`${drainCheckCommand}\n\n${rollbackCommands}`}
                  copied={copiedId === "rollback"}
                  onCopy={() =>
                    handleCopy(
                      "rollback",
                      `${drainCheckCommand}\n\n${rollbackCommands}`,
                      "排空观测与回滚命令",
                    )
                  }
                />
              </div>
            </div>
          ) : null}

          {activeTab === "playbook" ? (
            <div role="tabpanel" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[var(--color-text-muted)]">
                  对应 <code className="font-mono">roles/vhosts/haproxy/defaults/main.yml</code>，固化权重防止下次 Ansible 对账覆盖。
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy("yaml", playbookYaml, "Playbook Role 变量 YAML")
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-heading)] hover:border-[color:var(--color-primary-border)]"
                  >
                    {copiedId === "yaml" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedId === "yaml" ? "已复制" : "复制 YAML"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        "haproxy-traffic-dispatch.yml",
                        playbookYaml,
                        "text/yaml",
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    下载 haproxy-traffic-dispatch.yml
                  </button>
                </div>
              </div>
              <CodeBlockCard
                title="haproxy-traffic-dispatch.yml"
                code={playbookYaml}
                copied={copiedId === "yaml"}
                onCopy={() =>
                  handleCopy("yaml", playbookYaml, "Playbook Role 变量 YAML")
                }
              />
            </div>
          ) : null}

          {activeTab === "fluxgate" ? (
            <div role="tabpanel" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[var(--color-text-muted)]">
                  适用于 Fluxgate v0.3.0 Swarm Grouping Mode：先 1-Hop H2 TLS 承接，再协同下调 Vault KV GTM 权重。
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy("fluxgate", fluxgateSnippet, "Fluxgate 蜂群联动指令")
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-heading)] hover:border-[color:var(--color-primary-border)]"
                  >
                    {copiedId === "fluxgate" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedId === "fluxgate" ? "已复制" : "复制指令"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        "fluxgate-swarm-drain.sh",
                        fluxgateSnippet,
                        "text/x-shellscript",
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    下载指令
                  </button>
                </div>
              </div>
              <CodeBlockCard
                title="Fluxgate v0.3.0 Swarm & Vault KV GTM"
                code={fluxgateSnippet}
                copied={copiedId === "fluxgate"}
                onCopy={() =>
                  handleCopy("fluxgate", fluxgateSnippet, "Fluxgate 蜂群联动指令")
                }
              />
              <div className="flex items-start gap-2 rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text-muted)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
                <span>
                  建议在执行 <code className="font-mono">fluxgate swarm drain</code> 后，配合 HAProxy <code className="font-mono">:8404/metrics</code> 与 Grafana 面板确认误差率稳定再下调 Vault KV GTM 权重。
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function CodeBlockCard({
  title,
  code,
  copied,
  onCopy,
}: {
  title: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between border-b border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/60 px-3 py-2">
        <span className="text-xs font-semibold text-[var(--color-heading)]">{title}</span>
        <button
          type="button"
          onClick={onCopy}
          aria-label={`复制 ${title}`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre className="max-h-72 overflow-x-auto p-3 font-mono text-xs leading-5 text-[var(--color-heading)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
