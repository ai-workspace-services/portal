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
    aliases: ["jpn-tky", "jp-x", "jp_", "prod-jp", "tokyo", "japan"],
  },
  {
    pool: XCONNECT_REGIONAL_POOLS[1],
    aliases: [
      "us-ca",
      "us-x",
      "us_",
      "prod-us",
      "california",
      "united states",
      "america",
    ],
  },
  {
    pool: XCONNECT_REGIONAL_POOLS[2],
    aliases: ["hk-x", "hk_", "prod-hk", "hong kong", "hongkong"],
  },
  {
    pool: XCONNECT_REGIONAL_POOLS[3],
    aliases: [
      "ph-mnl",
      "ph-x",
      "ph_",
      "prod-ph",
      "ph-surfercloud",
      "manila",
      "philippines",
    ],
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
  const usedRegions = new Set<string>();
  const options: Array<{ pool: RegionalPool; node: VlessNode }> = [];

  for (const node of nodes) {
    const pool = regionForNode(node);
    if (!pool) {
      continue;
    }
    if (usedRegions.has(pool.code)) continue;
    usedRegions.add(pool.code);
    options.push({ pool, node: withRegionalEntry(node, pool) });
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
    name: `${pool.shortCode}-Connect`,
    address: pool.entry,
    server_name: pool.entry,
  };
}
