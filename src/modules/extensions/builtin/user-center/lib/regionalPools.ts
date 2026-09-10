import type { VlessNode } from "./vless";

export const XCONNECT_REGIONAL_POOLS = [
  {
    code: "jpn-tky",
    shortCode: "JP",
    zhName: "日本",
    enName: "Japan",
    entry: "jp-xconnect.svc.plus",
    poolCount: 1,
  },
  {
    code: "us-ca",
    shortCode: "US",
    zhName: "美国",
    enName: "United States",
    entry: "us-xconnect.svc.plus",
    poolCount: 1,
  },
  {
    code: "hk",
    shortCode: "HK",
    zhName: "香港",
    enName: "Hong Kong",
    entry: "hk-xconnect.svc.plus",
    poolCount: 1,
  },
  {
    code: "ph-mnl",
    shortCode: "PH",
    zhName: "菲律宾",
    enName: "Philippines",
    entry: "ph-xconnect.svc.plus",
    poolCount: 1,
  },
] as const;

export type RegionalPool = (typeof XCONNECT_REGIONAL_POOLS)[number];

const REGION_ALIASES: ReadonlyArray<{
  pool: RegionalPool;
  aliases: readonly string[];
}> = [
  {
    pool: XCONNECT_REGIONAL_POOLS[0],
    aliases: ["jpn-tky", "jp-x", "jp_", "tokyo", "japan"],
  },
  {
    pool: XCONNECT_REGIONAL_POOLS[1],
    aliases: ["us-ca", "us-x", "us_", "california", "united states", "america"],
  },
  {
    pool: XCONNECT_REGIONAL_POOLS[2],
    aliases: ["hk-x", "hk_", "hong kong", "hongkong"],
  },
  {
    pool: XCONNECT_REGIONAL_POOLS[3],
    aliases: ["ph-mnl", "ph-x", "ph_", "manila", "philippines"],
  },
];

export function regionForNode(node: VlessNode): RegionalPool | undefined {
  const identity =
    `${node.name} ${node.address} ${node.server_name ?? ""}`.toLowerCase();
  return REGION_ALIASES.find(({ aliases }) =>
    aliases.some((alias) => identity.includes(alias)),
  )?.pool;
}

export function regionalNodeOptions(nodes: VlessNode[]): Array<{
  pool: RegionalPool;
  node: VlessNode;
}> {
  if (nodes.length === 0) return [];

  const usedRegions = new Set<string>();
  const pendingNodes: VlessNode[] = [];
  const options: Array<{ pool: RegionalPool; node: VlessNode }> = [];

  for (const node of nodes) {
    const pool = regionForNode(node);
    if (!pool) {
      pendingNodes.push(node);
      continue;
    }
    if (usedRegions.has(pool.code)) continue;
    usedRegions.add(pool.code);
    options.push({ pool, node: withRegionalEntry(node, pool) });
  }

  for (const node of pendingNodes) {
    const pool = XCONNECT_REGIONAL_POOLS.find(
      (candidate) => !usedRegions.has(candidate.code),
    );
    if (!pool) break;
    usedRegions.add(pool.code);
    options.push({ pool, node: withRegionalEntry(node, pool) });
  }

  // Regional entries are fixed public endpoints. A restarted accounts service
  // can temporarily report only one live agent, but that agent still carries
  // the transport template needed to build every regional URI.
  const template = nodes[0];
  for (const pool of XCONNECT_REGIONAL_POOLS) {
    if (usedRegions.has(pool.code)) continue;
    usedRegions.add(pool.code);
    options.push({ pool, node: withRegionalEntry(template, pool) });
  }

  return XCONNECT_REGIONAL_POOLS.flatMap((pool) => {
    const option = options.find(
      (candidate) => candidate.pool.code === pool.code,
    );
    return option ? [option] : [];
  });
}

function withRegionalEntry(node: VlessNode, pool: RegionalPool): VlessNode {
  return {
    ...node,
    name: pool.shortCode,
    address: pool.entry,
    server_name: pool.entry,
  };
}
