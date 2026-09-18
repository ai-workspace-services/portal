import type { VlessNode } from "./vless";

// openToUsers decides whether a region is offered in the end-user VLESS
// selector. The admin page at /panel/agent renders it as a column so the
// operator view and what users can actually pick never drift apart. Closing a
// region is a deliberate edit here followed by a release; there is no runtime
// switch behind this table.
export const XCONNECT_REGIONAL_POOLS = [
  {
    code: "jpn-tky",
    shortCode: "JP",
    zhName: "日本",
    enName: "Japan",
    entry: "jp-xconnect.svc.plus",
    poolCount: 1,
    openToUsers: true,
  },
  {
    code: "us-ca",
    shortCode: "US",
    zhName: "美国",
    enName: "United States",
    entry: "us-xconnect.svc.plus",
    poolCount: 1,
    openToUsers: true,
  },
  {
    code: "hk",
    shortCode: "HK",
    zhName: "香港",
    enName: "Hong Kong",
    entry: "hk-xconnect.svc.plus",
    poolCount: 1,
    openToUsers: true,
  },
  {
    code: "ph-mnl",
    shortCode: "PH",
    zhName: "菲律宾",
    enName: "Philippines",
    entry: "ph-xconnect.svc.plus",
    poolCount: 1,
    openToUsers: true,
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

export const CANONICAL_FALLBACK_NODE: VlessNode = {
  name: "XConnect",
  address: "jp-xconnect.svc.plus",
  port: 443,
  transport: "xhttp",
  path: "/split",
  mode: "auto",
  flow: "xtls-rprx-vision",
  server_name: "jp-xconnect.svc.plus",
  xhttp_port: 443,
  tcp_port: 1443,
  uri_scheme_xhttp:
    "vless://${UUID}@${NODE}:443?encryption=none&type=xhttp&security=tls&host=${DOMAIN}&path=${PATH}&mode=${MODE}&sni=${SNI}&fp=${FP}&alpn=h2%2Chttp%2F1.1%2Ch3#${TAG}",
  uri_scheme_tcp:
    "vless://${UUID}@${NODE}:1443?encryption=none&type=tcp&security=tls&sni=${SNI}&fp=${FP}&flow=${FLOW}#${TAG}",
};

function isTemplateNode(node: VlessNode): boolean {
  const address = (node.address || "").trim().toLowerCase();
  const name = (node.name || "").trim().toLowerCase();
  return (
    !address ||
    address === "*" ||
    address.includes("accounts.") ||
    name.includes("template") ||
    name.includes("xconnect") ||
    name.includes("shared token") ||
    name.includes("internal agents")
  );
}

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

  const templateNode = nodes.find(isTemplateNode);

  for (const node of nodes) {
    if (!node.address || node.address.trim() === "*") continue;
    const pool = regionForNode(node);
    if (!pool) {
      continue;
    }
    // A closed region still has a live node and still resolves; it just must
    // not be offered. Filtering here keeps every caller of this function --
    // the selector, the URI builder and the QR code -- on the same list.
    if (!pool.openToUsers) continue;
    if (usedRegions.has(pool.code)) continue;
    usedRegions.add(pool.code);
    options.push({ pool, node: withRegionalEntry(node, pool) });
  }

  // If concrete nodes were provided and matched regions, offer only those specific regions.
  if (options.length > 0) {
    return XCONNECT_REGIONAL_POOLS.flatMap((pool) => {
      const option = options.find(
        (candidate) => candidate.pool.code === pool.code,
      );
      return option ? [option] : [];
    });
  }

  // If concrete nodes were provided but NONE matched any known region, do not guess.
  const hasOnlyConcreteUnmatchedNodes =
    nodes.length > 0 && !templateNode && options.length === 0;
  if (hasOnlyConcreteUnmatchedNodes) {
    return [];
  }

  // In fallback / template mode (e.g. UAT where no runtime edge agents are active, or wildcard template is returned):
  // Provide all open regional pools using the template node or canonical defaults.
  const baseNode = templateNode ?? CANONICAL_FALLBACK_NODE;
  return XCONNECT_REGIONAL_POOLS.flatMap((pool) => {
    if (!pool.openToUsers) return [];
    return [{ pool, node: withRegionalEntry(baseNode, pool) }];
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

