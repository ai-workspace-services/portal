export type EdgeProxyEngine = "haproxy" | "fluxgate";

export type DispatchScenario = "rolling-upgrade" | "slow-node" | "custom";

export type DispatchNodeStatus = "healthy" | "degraded" | "offline" | "unknown";

export type DispatchNodeSource = "live" | "seed";

export interface DispatchNode {
  id: string;
  name: string;
  address: string;
  sni: string;
  engine: EdgeProxyEngine;
  resourceClass: string;
  status: DispatchNodeStatus;
  activeClients: number;
  lastHeartbeat?: string;
  source: DispatchNodeSource;
}

export interface DispatchPlanConfig {
  sourceNode: DispatchNode;
  targetNode: DispatchNode;
  scenario: DispatchScenario;
  localWeight: number;
  remoteWeight: number;
  backendName: string;
  localServerName: string;
  remoteServerName: string;
  unixSocket: string;
  adminSocket: string;
}

export interface DispatchStagePreset {
  id: string;
  label: string;
  localWeight: number;
  remoteWeight: number;
  description: string;
}

export interface ApiInventoryAgent {
  id?: string;
  nodeId?: string;
  name?: string;
  address?: string;
  entryPoint?: string;
  endpoint?: string;
  ip?: string;
  port?: number | string;
  sni?: string;
  hostname?: string;
  engine?: string;
  proxyEngine?: string;
  resourceClass?: string;
  status?: string;
  clients?: number;
  clientCount?: number;
  activeClients?: number;
  lastHeartbeat?: string;
  lastSync?: string;
}

export const DEFAULT_BACKEND_NAME = "be_xray_xhttp";
export const DEFAULT_LOCAL_SERVER_NAME = "xray";
export const DEFAULT_UNIX_SOCKET = "/dev/shm/xray.sock";
export const DEFAULT_ADMIN_SOCKET = "/run/haproxy/admin.sock";

export const CANONICAL_SEED_NODES: readonly DispatchNode[] = [
  {
    id: "jp-xconnect-01.svc.plus",
    name: "jp-xconnect-01 (Tokyo Pool)",
    address: "3.113.5.51:443",
    sni: "jp-xconnect-01.svc.plus",
    engine: "haproxy",
    resourceClass: "pool-media",
    status: "healthy",
    activeClients: 0,
    source: "seed",
  },
  {
    id: "jp-xconnect-02.svc.plus",
    name: "jp-xconnect-02 (Tokyo Pool)",
    address: "43.207.89.150:443",
    sni: "jp-xconnect-02.svc.plus",
    engine: "fluxgate",
    resourceClass: "pool-media",
    status: "healthy",
    activeClients: 0,
    source: "seed",
  },
];

export function cloneCanonicalSeedNodes(): DispatchNode[] {
  return CANONICAL_SEED_NODES.map((node) => ({ ...node }));
}

export function sanitizeHaproxyIdentifier(
  value: string,
  fallback = "peer",
): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
  return cleaned.length > 0 ? cleaned.slice(0, 63) : fallback;
}

export function sanitizeSni(value: string, fallback = ""): string {
  const candidate = value.trim().toLowerCase();
  if (
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
      candidate,
    ) ||
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(candidate)
  ) {
    return candidate;
  }
  const cleaned = candidate
    .replace(/[^a-z0-9.-]+/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.-]+|[.-]+$/g, "");
  if (
    cleaned &&
    /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/.test(cleaned)
  ) {
    return cleaned;
  }
  return fallback;
}

export function sanitizeHostPort(
  value: string,
  fallback = "127.0.0.1:443",
): string {
  const trimmed = value.trim();
  const ipv4OrHostMatch = trimmed.match(
    /^([a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,251}[a-zA-Z0-9])?):(\d{1,5})$/,
  );
  if (ipv4OrHostMatch) {
    const port = Number(ipv4OrHostMatch[2]);
    if (port >= 1 && port <= 65535) {
      return `${ipv4OrHostMatch[1]}:${port}`;
    }
  }
  const ipv6Match = trimmed.match(/^(\[[0-9a-fA-F:]+\]):(\d{1,5})$/);
  if (ipv6Match) {
    const port = Number(ipv6Match[2]);
    if (port >= 1 && port <= 65535) {
      return `${ipv6Match[1]}:${port}`;
    }
  }
  const bareHostMatch = trimmed.match(
    /^([a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,251}[a-zA-Z0-9])?)$/,
  );
  if (bareHostMatch) {
    return `${bareHostMatch[1]}:443`;
  }
  return fallback;
}

export function sanitizeSocketPath(
  value: string,
  fallback: string,
): string {
  const trimmed = value.trim();
  if (
    /^\/[a-zA-Z0-9/_.-]+$/.test(trimmed) &&
    !trimmed.includes("..")
  ) {
    return trimmed;
  }
  return fallback;
}

export function clampWeight(weight: number): number {
  if (!Number.isFinite(weight)) return 0;
  return Math.min(100, Math.max(0, Math.round(weight)));
}

export function deriveRemoteServerName(nodeIdOrName: string): string {
  const trimmed = nodeIdOrName.trim().toLowerCase();
  const xconnectMatch = trimmed.match(/^([a-z]{2,4})-xconnect-(\d{1,3})(?:\.|$)/);
  if (xconnectMatch) {
    const num = xconnectMatch[2].padStart(2, "0");
    return sanitizeHaproxyIdentifier(`${xconnectMatch[1]}${num}`, "peer");
  }
  const firstLabel = trimmed.split(".")[0] ?? "";
  return sanitizeHaproxyIdentifier(firstLabel, "peer");
}

function normalizeStatus(raw?: string): DispatchNodeStatus {
  const value = raw?.trim().toLowerCase();
  if (value === "healthy" || value === "online" || value === "up") {
    return "healthy";
  }
  if (value === "degraded" || value === "unhealthy" || value === "draining") {
    return "degraded";
  }
  if (value === "offline" || value === "down") {
    return "offline";
  }
  return "unknown";
}

function normalizeEngine(
  rawEngine: string | undefined,
  seedEngine?: EdgeProxyEngine,
  idHint?: string,
): EdgeProxyEngine {
  const value = rawEngine?.trim().toLowerCase();
  if (value === "haproxy") return "haproxy";
  if (value === "fluxgate") return "fluxgate";
  if (seedEngine) return seedEngine;
  if (idHint?.toLowerCase().includes("02")) return "fluxgate";
  return "haproxy";
}

function findMatchingSeed(agent: ApiInventoryAgent): DispatchNode | undefined {
  const candidates = [agent.id, agent.nodeId, agent.sni, agent.hostname]
    .filter((item): item is string => Boolean(item && item.trim()))
    .map((item) => item.trim().toLowerCase());

  return CANONICAL_SEED_NODES.find((seed) => {
    const seedId = seed.id.toLowerCase();
    const seedShort = seedId.split(".")[0];
    return candidates.some(
      (candidate) =>
        candidate === seedId ||
        candidate === seed.sni.toLowerCase() ||
        candidate === seedShort,
    );
  });
}

function resolveAgentAddress(
  agent: ApiInventoryAgent,
  seed?: DispatchNode,
): string {
  const direct = agent.address || agent.endpoint || agent.entryPoint;
  if (direct && direct.trim()) {
    return sanitizeHostPort(direct, seed?.address ?? "127.0.0.1:443");
  }
  if (agent.ip && agent.ip.trim()) {
    const port = agent.port ? String(agent.port).trim() : "443";
    return sanitizeHostPort(
      `${agent.ip.trim()}:${port}`,
      seed?.address ?? "127.0.0.1:443",
    );
  }
  if (seed?.address) return seed.address;
  const hostCandidate = agent.hostname || agent.sni || agent.id || "";
  return sanitizeHostPort(hostCandidate, "127.0.0.1:443");
}

export function mergeInventoryNodes(
  apiAgents?: ApiInventoryAgent[] | null,
): DispatchNode[] {
  if (!Array.isArray(apiAgents) || apiAgents.length === 0) {
    return cloneCanonicalSeedNodes();
  }

  const mapped: DispatchNode[] = [];
  for (const agent of apiAgents) {
    if (!agent || typeof agent !== "object") continue;
    const rawId = (agent.id || agent.nodeId || agent.sni || "").trim();
    if (!rawId) continue;

    const seed = findMatchingSeed(agent);
    const id = sanitizeHaproxyIdentifier(rawId, seed?.id ?? "node");
    const sni = sanitizeSni(
      agent.sni || agent.hostname || seed?.sni || (rawId.includes(".") ? rawId : ""),
      seed?.sni ?? "",
    );
    const address = resolveAgentAddress(agent, seed);
    const engine = normalizeEngine(
      agent.engine ?? agent.proxyEngine,
      seed?.engine,
      id,
    );
    const activeClientsRaw =
      agent.activeClients ?? agent.clientCount ?? agent.clients ?? 0;

    mapped.push({
      id,
      name: (agent.name && agent.name.trim()) || seed?.name || id,
      address,
      sni,
      engine,
      resourceClass:
        (agent.resourceClass && agent.resourceClass.trim()) ||
        seed?.resourceClass ||
        "pool-media",
      status: normalizeStatus(agent.status),
      activeClients: Number.isFinite(activeClientsRaw)
        ? Math.max(0, Math.round(activeClientsRaw))
        : 0,
      lastHeartbeat: agent.lastHeartbeat || agent.lastSync,
      source: "live",
    });
  }

  return mapped.length > 0 ? mapped : cloneCanonicalSeedNodes();
}

export function createDispatchPlanConfig(
  input: Partial<DispatchPlanConfig> & {
    sourceNode?: DispatchNode;
    targetNode?: DispatchNode;
  },
): DispatchPlanConfig {
  const [defaultSource, defaultTarget] = cloneCanonicalSeedNodes();
  const sourceNode = input.sourceNode ?? defaultSource;
  const targetNode = input.targetNode ?? defaultTarget;
  const scenario: DispatchScenario = input.scenario ?? "rolling-upgrade";
  const defaultLocal = scenario === "slow-node" ? 0 : 80;
  const localWeight = clampWeight(input.localWeight ?? defaultLocal);
  const remoteWeight = clampWeight(100 - localWeight);

  return {
    sourceNode: {
      ...sourceNode,
      id: sanitizeHaproxyIdentifier(sourceNode.id, defaultSource.id),
      address: sanitizeHostPort(sourceNode.address, defaultSource.address),
      sni: sanitizeSni(sourceNode.sni, defaultSource.sni),
    },
    targetNode: {
      ...targetNode,
      id: sanitizeHaproxyIdentifier(targetNode.id, defaultTarget.id),
      address: sanitizeHostPort(targetNode.address, defaultTarget.address),
      sni: sanitizeSni(targetNode.sni, defaultTarget.sni),
    },
    scenario,
    localWeight,
    remoteWeight,
    backendName: sanitizeHaproxyIdentifier(
      input.backendName ?? DEFAULT_BACKEND_NAME,
      DEFAULT_BACKEND_NAME,
    ),
    localServerName: sanitizeHaproxyIdentifier(
      input.localServerName ?? DEFAULT_LOCAL_SERVER_NAME,
      DEFAULT_LOCAL_SERVER_NAME,
    ),
    remoteServerName: sanitizeHaproxyIdentifier(
      input.remoteServerName ?? deriveRemoteServerName(targetNode.id),
      "peer",
    ),
    unixSocket: sanitizeSocketPath(
      input.unixSocket ?? DEFAULT_UNIX_SOCKET,
      DEFAULT_UNIX_SOCKET,
    ),
    adminSocket: sanitizeSocketPath(
      input.adminSocket ?? DEFAULT_ADMIN_SOCKET,
      DEFAULT_ADMIN_SOCKET,
    ),
  };
}

export function getScenarioPresets(
  scenario: DispatchScenario,
  customLocalWeight = 50,
): DispatchStagePreset[] {
  if (scenario === "rolling-upgrade") {
    return [
      {
        id: "stage-80-20",
        label: "80/20 灰度验证",
        localWeight: 80,
        remoteWeight: 20,
        description: "切入 20% 新建连接至目标节点，观察错误率与延迟",
      },
      {
        id: "stage-50-50",
        label: "50/50 均衡分流",
        localWeight: 50,
        remoteWeight: 50,
        description: "双节点各承接 50% 新建请求，确认吞吐与水位稳定",
      },
      {
        id: "stage-20-80",
        label: "20/80 主力迁移",
        localWeight: 20,
        remoteWeight: 80,
        description: "80% 流量切换至目标节点，本地存量长连接逐步收敛",
      },
      {
        id: "stage-0-100",
        label: "0/100 全量排空",
        localWeight: 0,
        remoteWeight: 100,
        description: "不再向本地分发新连接，等待存量 scur=0 后执行维护",
      },
    ];
  }

  if (scenario === "slow-node") {
    return [
      {
        id: "stage-cutover-0-100",
        label: "0/100 立即切流",
        localWeight: 0,
        remoteWeight: 100,
        description: "慢节点故障应急摘除：新连接 100% 转发至健康目标节点",
      },
    ];
  }

  const localWeight = clampWeight(customLocalWeight);
  const remoteWeight = clampWeight(100 - localWeight);
  return [
    {
      id: "stage-custom",
      label: `${localWeight}/${remoteWeight} 自定义比例`,
      localWeight,
      remoteWeight,
      description: `按自定义权重分配：本地 ${localWeight}% / 目标节点 ${remoteWeight}%`,
    },
  ];
}

export function buildHaproxyBackendSnippet(cfg: DispatchPlanConfig): string {
  const safe = createDispatchPlanConfig(cfg);
  const sniClause = safe.targetNode.sni
    ? ` sni str(${safe.targetNode.sni})`
    : "";

  return [
    `backend ${safe.backendName}`,
    "    mode http",
    "    balance roundrobin",
    "    option http-no-delay",
    "    http-request set-path /split/ if { path /split }",
    `    http-request set-query "%[query,regsub('(^|&)x_padding=[^&]*','',g),regsub('^&','')]" if { query -m sub x_padding= }`,
    `    server ${safe.localServerName} ${safe.unixSocket} proto h2 weight ${safe.localWeight}`,
    `    server ${safe.remoteServerName} ${safe.targetNode.address} ssl verify none alpn h2${sniClause} check inter 5s fall 3 rise 2 weight ${safe.remoteWeight}`,
  ].join("\n");
}

export function buildHaproxyReloadCommands(cfg: DispatchPlanConfig): string {
  const safe = createDispatchPlanConfig(cfg);
  return [
    `# 1. 备份当前 HAProxy 配置（源节点：${safe.sourceNode.id}）`,
    "cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.bak.$(date +%F_%H%M%S)",
    "",
    `# 2. 更新 /etc/haproxy/haproxy.cfg 中的 backend ${safe.backendName} 后校验并无损 reload`,
    "#    说明：依赖 global expose-fd listeners，仅 reload 保持存量 XHTTP/H2 长连接不中断",
    "haproxy -c -f /etc/haproxy/haproxy.cfg && systemctl reload haproxy",
  ].join("\n");
}

export function buildHaproxyWeightCommands(
  cfg: DispatchPlanConfig,
  localWeight: number,
  remoteWeight: number,
): string {
  const safe = createDispatchPlanConfig(cfg);
  const local = clampWeight(localWeight);
  const remote = clampWeight(remoteWeight);
  return [
    `echo "set server ${safe.backendName}/${safe.localServerName} weight ${local}" | socat stdio ${safe.adminSocket}`,
    `echo "set server ${safe.backendName}/${safe.remoteServerName} weight ${remote}" | socat stdio ${safe.adminSocket}`,
  ].join("\n");
}

export function buildHaproxyDrainCheckCommand(cfg: DispatchPlanConfig): string {
  const safe = createDispatchPlanConfig(cfg);
  return `echo "show stat" | socat stdio ${safe.adminSocket} | grep ${safe.backendName} | cut -d, -f1,2,5,18,19`;
}

export function buildHaproxyRollbackCommands(cfg: DispatchPlanConfig): string {
  const safe = createDispatchPlanConfig(cfg);
  return [
    `# 1. 秒级通过 admin.sock 将流量拉回本地 ${safe.localServerName}（不中断存量连接）`,
    buildHaproxyWeightCommands(safe, 100, 0),
    "",
    "# 2. 恢复备份配置并校验后执行无损 reload",
    "LATEST_BAK=$(ls -1t /etc/haproxy/haproxy.cfg.bak.* | head -n 1)",
    'cp "$LATEST_BAK" /etc/haproxy/haproxy.cfg',
    "haproxy -c -f /etc/haproxy/haproxy.cfg && systemctl reload haproxy",
  ].join("\n");
}

export function buildPlaybookVarsYaml(cfg: DispatchPlanConfig): string {
  const safe = createDispatchPlanConfig(cfg);
  const lines = [
    `# Ansible host_vars / group_vars for roles/vhosts/haproxy (${safe.sourceNode.id} -> ${safe.targetNode.id})`,
    `haproxy_xhttp_local_weight: ${safe.localWeight}`,
    "haproxy_xhttp_spillover_servers:",
    `  - name: ${safe.remoteServerName}`,
    `    address: "${safe.targetNode.address}"`,
    "    ssl: true",
    "    verify: none",
  ];
  if (safe.targetNode.sni) {
    lines.push(`    sni: "${safe.targetNode.sni}"`);
  }
  lines.push(
    '    check_inter: "5s"',
    "    fall: 3",
    "    rise: 2",
    `    weight: ${safe.remoteWeight}`,
  );
  return lines.join("\n");
}

export function buildFluxgateSwarmSnippet(cfg: DispatchPlanConfig): string {
  const safe = createDispatchPlanConfig(cfg);
  const usesFluxgate =
    safe.sourceNode.engine === "fluxgate" ||
    safe.targetNode.engine === "fluxgate";
  const roleHint =
    safe.sourceNode.engine === "fluxgate"
      ? `源节点 ${safe.sourceNode.id} 运行 Fluxgate v0.3.0，可直接执行蜂群排水`
      : safe.targetNode.engine === "fluxgate"
        ? `目标节点 ${safe.targetNode.id} 运行 Fluxgate v0.3.0，作为 1-Hop H2 TLS 蜂群承接节点`
        : `当前选定节点均标记为 HAProxy；若目标池接入 Fluxgate v0.3.0 Swarm，可参考以下蜂群指令`;

  return [
    `# Fluxgate v0.3.0 Swarm Grouping Mode 联动指令`,
    `# 说明：${roleHint}${usesFluxgate ? "" : "（预备模式）"}`,
    "",
    "# 1. 查看蜂群状态、Peer load_score、active_streams 与 GTM 权重",
    "fluxgate swarm status",
    "",
    `# 2. 排空待维护节点（将节点广播为 Draining / load_score=100，通知 GTM Coordinator 摘除权重并 L7 平滑排空）`,
    `#    在待排空节点 (${safe.sourceNode.id}) 上执行：`,
    "fluxgate swarm drain",
    "",
    "# 3. 维护完成后恢复节点为 Alive 并重新加入候选池",
    "fluxgate swarm resume",
    "",
    "# 4. Vault KV GTM 权重协同（与 L7 1-Hop 切流同步下调源节点 DNS 入口权重）",
    `#    目标池：${safe.sourceNode.resourceClass} | 源节点权重=${safe.localWeight} -> 目标节点 (${safe.targetNode.id}) 权重=${safe.remoteWeight}`,
    `vault kv put secret/gtm/pools/${sanitizeHaproxyIdentifier(safe.sourceNode.resourceClass, "pool-media")} \\`,
    `  ${safe.sourceNode.id}_weight=${safe.localWeight} \\`,
    `  ${safe.targetNode.id}_weight=${safe.remoteWeight}`,
  ].join("\n");
}
