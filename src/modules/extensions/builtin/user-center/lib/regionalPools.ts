import type { VlessNode } from "./vless";

export type RegionalClosureReason =
  | "explicit_disabled"
  | "stale"
  | "unhealthy"
  | "xray_not_running";

export type RegionalPool = {
  key: string;
  code: string;
  shortCode: string;
  zhName: string;
  enName: string;
  entry: string;
  poolCount: number;
  openToUsers: boolean;
  closedReasons?: RegionalClosureReason[];
};

type RegionalPoolReport = Pick<
  RegionalPool,
  "code" | "entry" | "poolCount" | "openToUsers" | "closedReasons"
>;

export function regionalClosureReasonLabel(
  reason: RegionalClosureReason,
  zh: boolean,
): string {
  const labels: Record<RegionalClosureReason, [string, string]> = {
    explicit_disabled: ["配置已关闭", "Disabled in configuration"],
    stale: ["状态上报已过期", "Status report expired"],
    unhealthy: ["配置同步异常", "Configuration sync unhealthy"],
    xray_not_running: ["Xray 同步状态未就绪", "Xray sync state not ready"],
  };
  return labels[reason][zh ? 0 : 1];
}

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
    typeof pool.openToUsers === "boolean" &&
    (pool.closedReasons === undefined ||
      (Array.isArray(pool.closedReasons) &&
        pool.closedReasons.every((reason) =>
          [
            "explicit_disabled",
            "stale",
            "unhealthy",
            "xray_not_running",
          ].includes(reason),
        )))
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
