import type { VlessNode } from "./vless";

export type RegionalPool = {
  key: string;
  code: string;
  shortCode: string;
  zhName: string;
  enName: string;
  entry: string;
  poolCount: number;
  openToUsers: boolean;
};

type RegionalPoolReport = Pick<
  RegionalPool,
  "code" | "entry" | "poolCount" | "openToUsers"
>;

function describePool(report: RegionalPoolReport): RegionalPool {
  const prefix = report.code.split("-")[0].toUpperCase();
  const country = prefix === "JPN" ? "JP" : prefix;
  const name = (locale: string): string => {
    if (!/^[A-Z]{2}$/.test(country)) return report.code;
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(country) ??
      report.code
    );
  };
  return {
    ...report,
    key: `${report.code}:${report.entry}`,
    shortCode: country,
    zhName: name("zh"),
    enName: name("en"),
  };
}

export async function fetchRegionalPools(): Promise<RegionalPool[]> {
  const response = await fetch("/api/agent-server/v1/regional-pools", {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`regional_pools_request_failed (${response.status})`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || !payload.every(isRegionalPoolReport)) {
    throw new Error("unexpected_regional_pools_payload");
  }
  return payload.map(describePool);
}

function isRegionalPoolReport(value: unknown): value is RegionalPoolReport {
  if (!value || typeof value !== "object") return false;
  const pool = value as RegionalPoolReport;
  return (
    typeof pool.code === "string" &&
    !!pool.code.trim() &&
    typeof pool.entry === "string" &&
    !!pool.entry.trim() &&
    Number.isInteger(pool.poolCount) &&
    pool.poolCount > 0 &&
    typeof pool.openToUsers === "boolean"
  );
}

export function regionalNodeOptions(
  nodes: VlessNode[],
): Array<{ pool: RegionalPool; node: VlessNode }> {
  const options = new Map<string, { pool: RegionalPool; node: VlessNode }>();
  for (const node of nodes) {
    if (
      !node.region ||
      !node.address ||
      node.address === "*" ||
      node.open_to_users !== true
    )
      continue;
    const report = {
      code: node.region,
      entry: node.address,
      poolCount: node.pool_count ?? 0,
      openToUsers: node.open_to_users,
    };
    if (!isRegionalPoolReport(report)) continue;
    const pool = describePool(report);
    // Preserve the reported endpoint, SNI, ports and URI schemes verbatim.
    if (!options.has(pool.key)) options.set(pool.key, { pool, node });
  }
  return [...options.values()].sort((a, b) =>
    a.pool.key.localeCompare(b.pool.key),
  );
}
