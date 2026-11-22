export const XCONNECT_ZERO_ADMIN_PATHS = {
  overview: "/admin/overview",
  networks: "/admin/networks",
  devices: "/admin/devices",
  invites: "/admin/invites",
  registrations: "/admin/registrations",
  telemetry: "/admin/telemetry",
} as const;

export type XConnectZeroAdminPath =
  (typeof XCONNECT_ZERO_ADMIN_PATHS)[keyof typeof XCONNECT_ZERO_ADMIN_PATHS];

/**
 * Public, non-secret fields reserved for the first Zero admin response.
 * Accounts is the only control-plane source of truth for these resources.
 * Device credentials, private keys and signed client configuration are never
 * part of this browser-facing contract.
 */
export interface XConnectZeroAdminOverview {
  status: "available";
  networkCount: number;
  deviceCount: number;
  gatewayCount: number;
  /** Number of owner-scoped controlled-client devices (not Gateways). */
  oneCount?: number;
  /** Enrollment/runtime state for the owner-scoped Gateway devices. */
  gatewayStatus?: "connected" | "active" | "pending" | "not_configured";
  /** Enrollment/runtime state for the owner-scoped One devices. */
  oneStatus?: "connected" | "active" | "pending" | "not_configured";
  /** Optional control-plane signing key identifier. */
  signingKeyId?: string;
  signing_key_id?: string;
}

export interface XConnectZeroNetwork {
  id: string;
  display_name: string;
  cidr: string;
  gateway_id: string;
  gateway_endpoint_host: string;
  gateway_endpoint_port: number;
  transport_server_name: string;
  transport_port: number;
  config_generation?: number;
  connection_mode?: "wg_udp_l3" | "wg_vless_l3" | "wg_vless_l2";
}

export interface XConnectZeroNetworkMember {
  id: string;
  network_id: string;
  user_id: string;
  email: string;
  created_by: string;
  created_at: string;
}

export interface XConnectZeroDevice {
  id: string;
  network_id: string;
  role?: string;
  name: string;
  platform: string;
  hostname: string;
  wireguard_address: string;
  status?: string;
  last_seen_at?: string | null;
  connection_status?: "recent_ack" | "stale" | "never_seen" | "revoked";
  runtime_healthy?: boolean;
  active_path?: string;
  rtt_ms?: number;
  rx_bytes?: number;
  tx_bytes?: number;
  applied_generation?: number;
  connection_mode?: string;
}

export interface XConnectZeroGateway {
  network_id: string;
  network_display_name?: string;
  cidr?: string;
  gateway_id: string;
  display_name: string;
  gateway_endpoint_host: string;
  gateway_endpoint_port: number;
  transport_server_name: string;
  transport_port: number;
  connection_mode: string;
  runtime_healthy: boolean;
  last_seen_at?: string | null;
}

export interface XConnectZeroTelemetry {
  status: "available";
  sase_traffic?: {
    internet_rx_bytes: number;
    internet_tx_bytes: number;
    private_rx_bytes: number;
    private_tx_bytes: number;
  };
  connected_users?: Array<{
    device_id: string;
    user_id?: string;
    name?: string;
    network_id: string;
    gateway_id?: string;
    platform?: string;
    wireguard_address?: string;
    active_path?: string;
    rtt_ms?: number;
    rx_bytes?: number;
    tx_bytes?: number;
    last_seen_at?: string | null;
  }>;
  top_private_apps?: Array<{
    app: string;
    rx_bytes: number;
    tx_bytes: number;
    connections: number;
  }>;
  top_users?: Array<{
    user_id?: string;
    device_id: string;
    name?: string;
    rx_bytes: number;
    tx_bytes: number;
    total_bytes?: number;
  }>;
}

export function formatBytes(bytes?: number): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}

/** ACK activity is control-plane evidence, never a data-plane online claim. */
export function xconnectNodeStatusLabel(
  device: XConnectZeroDevice,
  zh: boolean,
): string {
  if (device.status === "revoked" || device.connection_status === "revoked") {
    return zh ? "已撤销" : "Revoked";
  }
  switch (device.connection_status) {
    case "recent_ack":
      return zh ? "最近配置已确认" : "Recent config ACK";
    case "stale":
      return zh ? "无近期配置确认" : "No recent config ACK";
    case "never_seen":
      return zh ? "等待当前配置确认" : "Awaiting current config ACK";
    default:
      return zh ? "配置确认状态未知" : "Config ACK status unknown";
  }
}

export function xconnectRoleStatusLabel(
  status: XConnectZeroAdminOverview["gatewayStatus"],
  zh: boolean,
): string {
  switch (status) {
    case "connected":
      return zh ? "最近配置已确认" : "Recent config ACK";
    case "active":
      return zh ? "已加入 · 无近期配置确认" : "Enrolled · no recent config ACK";
    case "pending":
      return zh ? "等待加入" : "Awaiting enrollment";
    case "not_configured":
      return zh ? "未配置" : "Not configured";
    default:
      return zh ? "状态未知" : "Status unknown";
  }
}

export interface XConnectZeroInvite {
  id: string;
  network_id: string;
  device_id?: string;
  platform: string;
  role: string;
  expires_at: string;
  remaining_uses: number;
  consumed_at?: string;
}

/** Owner-scoped, non-secret summary of a self-registered One awaiting review. */
export interface XConnectZeroRegistration {
  registration_id: string;
  network_id: string;
  device_id: string;
  name: string;
  hostname: string;
  platform: string;
  status: string;
  wireguard_public_key_fingerprint: string;
  created_at: string;
  expires_at: string;
  approved_at?: string;
  rejected_at?: string;
  consumed_at?: string;
}

export type XConnectZeroAdapterError =
  | "unauthenticated"
  | "forbidden"
  | "control_plane_unavailable"
  | "upstream_unreachable"
  | "invalid_response";

export interface XConnectZeroAdapterErrorResponse {
  error: XConnectZeroAdapterError;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isOverviewStatus(
  value: unknown,
): value is NonNullable<XConnectZeroAdminOverview["gatewayStatus"]> {
  return (
    value === "connected" ||
    value === "active" ||
    value === "pending" ||
    value === "not_configured"
  );
}

export type XConnectZeroPolicyAction = "allow" | "deny";
export type XConnectZeroPolicyProtocol = "all" | "tcp" | "udp" | "icmp";

export interface XConnectZeroPolicyRule {
  id: string;
  action: XConnectZeroPolicyAction;
  source_devices: string[];
  destination_devices: string[];
  protocols: XConnectZeroPolicyProtocol[];
  ports: number[];
  whole_device?: boolean;
}

export interface XConnectZeroPolicyArtifact {
  schema_version: number;
  compiler_version: string;
  network_id: string;
  revision: number;
  default_action: XConnectZeroPolicyAction;
  protected_flows: string[];
  rules: XConnectZeroPolicyRule[];
}

export interface XConnectZeroPolicyExplainRequest {
  source_device_id: string;
  destination_device_id: string;
  protocol: XConnectZeroPolicyProtocol;
  port?: number;
}

export interface XConnectZeroPolicyExplainResponse {
  network_id: string;
  revision: number;
  default_action: XConnectZeroPolicyAction;
  decision: XConnectZeroPolicyAction;
  matched_rule_id?: string;
  matched_rule_index?: number;
  reason: string;
  source_address?: string;
  destination_address?: string;
}

const VALID_POLICY_PROTOCOLS = new Set<XConnectZeroPolicyProtocol>([
  "all",
  "tcp",
  "udp",
  "icmp",
]);

function normalizePolicyAction(
  value: unknown,
  fallback: XConnectZeroPolicyAction = "deny",
): XConnectZeroPolicyAction {
  if (value === "allow" || value === "accept") return "allow";
  if (value === "deny") return "deny";
  return fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizePolicyProtocols(
  value: unknown,
): XConnectZeroPolicyProtocol[] {
  if (!Array.isArray(value)) return [];
  const out: XConnectZeroPolicyProtocol[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const lowered = item.trim().toLowerCase() as XConnectZeroPolicyProtocol;
    if (VALID_POLICY_PROTOCOLS.has(lowered) && !out.includes(lowered)) {
      out.push(lowered);
    }
  }
  return out;
}

function normalizePolicyPorts(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (const item of value) {
    if (
      typeof item === "number" &&
      Number.isInteger(item) &&
      item >= 1 &&
      item <= 65535 &&
      !out.includes(item)
    ) {
      out.push(item);
    }
  }
  return out;
}

export function createDefaultXConnectZeroPolicy(
  networkId: string,
  revision = 0,
): XConnectZeroPolicyArtifact {
  return {
    schema_version: 1,
    compiler_version: "1",
    network_id: networkId,
    revision,
    default_action: "deny",
    protected_flows: [],
    rules: [],
  };
}

export function normalizeXConnectZeroPolicyArtifact(
  raw: unknown,
  networkId: string,
  fallbackRevision = 0,
): { artifact: XConnectZeroPolicyArtifact; recognized: boolean } {
  const candidate =
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "policy" in raw &&
    raw.policy &&
    typeof raw.policy === "object" &&
    !Array.isArray(raw.policy)
      ? (raw.policy as Record<string, unknown>)
      : raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : null;

  const recognized = Boolean(
    candidate &&
      (typeof candidate.default_action === "string" ||
        Array.isArray(candidate.rules)),
  );
  if (!candidate || !recognized) {
    return {
      artifact: createDefaultXConnectZeroPolicy(networkId, fallbackRevision),
      recognized: false,
    };
  }

  const rules: XConnectZeroPolicyRule[] = Array.isArray(candidate.rules)
    ? candidate.rules
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object" && !Array.isArray(item),
        )
        .map((rule, index) => ({
          id:
            typeof rule.id === "string" && rule.id.trim()
              ? rule.id.trim()
              : `rule-${index + 1}`,
          action: normalizePolicyAction(rule.action, "deny"),
          source_devices: normalizeStringArray(rule.source_devices),
          destination_devices: normalizeStringArray(rule.destination_devices),
          protocols: normalizePolicyProtocols(rule.protocols),
          ports: normalizePolicyPorts(rule.ports),
          ...(typeof rule.whole_device === "boolean"
            ? { whole_device: rule.whole_device }
            : {}),
        }))
    : [];

  return {
    recognized: true,
    artifact: {
      schema_version:
        typeof candidate.schema_version === "number" &&
        Number.isInteger(candidate.schema_version) &&
        candidate.schema_version > 0
          ? candidate.schema_version
          : 1,
      compiler_version:
        typeof candidate.compiler_version === "string" &&
        candidate.compiler_version.trim()
          ? candidate.compiler_version.trim()
          : "1",
      network_id:
        typeof candidate.network_id === "string" && candidate.network_id.trim()
          ? candidate.network_id.trim()
          : networkId,
      revision:
        typeof candidate.revision === "number" &&
        Number.isInteger(candidate.revision) &&
        candidate.revision >= 0
          ? candidate.revision
          : fallbackRevision,
      default_action: normalizePolicyAction(candidate.default_action, "deny"),
      protected_flows: normalizeStringArray(candidate.protected_flows),
      rules,
    },
  };
}

function resolveDeviceOverlayAddress(
  devices: XConnectZeroDevice[],
  networkId: string,
  deviceId: string,
): string | undefined {
  const trimmedId = deviceId.trim();
  if (!trimmedId) return undefined;
  const matched =
    devices.find(
      (device) =>
        device.id === trimmedId &&
        (!device.network_id || device.network_id === networkId),
    ) ?? devices.find((device) => device.id === trimmedId);
  const address = matched?.wireguard_address?.trim();
  return address || undefined;
}

function ruleMatchesProtocolAndPort(
  rule: XConnectZeroPolicyRule,
  reqProtocol: XConnectZeroPolicyProtocol,
  reqPort: number | undefined,
): boolean {
  const rawProtocols = (rule.protocols ?? []).map((proto) =>
    proto.toLowerCase(),
  );
  const ports = Array.isArray(rule.ports) ? rule.ports : [];
  const effectiveProtocols =
    rawProtocols.length > 0
      ? rawProtocols
      : ports.length > 0
        ? ["tcp", "udp"]
        : ["all"];

  const normalizedReqProto = (reqProtocol || "all").toLowerCase();
  const hasPort =
    typeof reqPort === "number" && Number.isInteger(reqPort) && reqPort > 0;

  for (const proto of effectiveProtocols) {
    if (proto === "all") {
      return true;
    }
    if (proto === "icmp") {
      if (normalizedReqProto === "icmp" && !hasPort) {
        return true;
      }
      continue;
    }
    if (proto === "tcp" || proto === "udp") {
      if (normalizedReqProto === proto) {
        if (ports.length === 0 || (hasPort && ports.includes(reqPort))) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Evaluates a policy artifact draft locally using the same first-match-wins
 * semantics as XConnect-Gateway/internal/policy/compiler.go.
 */
export function evaluateXConnectZeroPolicyDraft(
  policy: XConnectZeroPolicyArtifact,
  req: XConnectZeroPolicyExplainRequest,
  devices: XConnectZeroDevice[],
): XConnectZeroPolicyExplainResponse {
  const sourceAddress = resolveDeviceOverlayAddress(
    devices,
    policy.network_id,
    req.source_device_id,
  );
  const destinationAddress = resolveDeviceOverlayAddress(
    devices,
    policy.network_id,
    req.destination_device_id,
  );
  const defaultAction = normalizePolicyAction(policy.default_action, "deny");
  const rules = Array.isArray(policy.rules) ? policy.rules : [];

  for (let index = 0; index < rules.length; index += 1) {
    const rule = rules[index];
    const sourceDevices = Array.isArray(rule.source_devices)
      ? rule.source_devices
      : [];
    const destinationDevices = Array.isArray(rule.destination_devices)
      ? rule.destination_devices
      : [];

    const sourceMatches =
      sourceDevices.includes("*") ||
      sourceDevices.includes(req.source_device_id);
    if (!sourceMatches) continue;

    const destinationMatches =
      destinationDevices.includes("*") ||
      destinationDevices.includes(req.destination_device_id);
    if (!destinationMatches) continue;

    if (!ruleMatchesProtocolAndPort(rule, req.protocol, req.port)) continue;

    const decision = normalizePolicyAction(rule.action, "deny");
    return {
      network_id: policy.network_id,
      revision: policy.revision,
      default_action: defaultAction,
      decision,
      matched_rule_id: rule.id,
      matched_rule_index: index,
      reason: `matched rule "${rule.id}" at index ${index} (${decision})`,
      ...(sourceAddress ? { source_address: sourceAddress } : {}),
      ...(destinationAddress
        ? { destination_address: destinationAddress }
        : {}),
    };
  }

  return {
    network_id: policy.network_id,
    revision: policy.revision,
    default_action: defaultAction,
    decision: defaultAction,
    reason: `no rule matched; fell back to default_action (${defaultAction})`,
    ...(sourceAddress ? { source_address: sourceAddress } : {}),
    ...(destinationAddress ? { destination_address: destinationAddress } : {}),
  };
}

export function isXConnectZeroAdminOverview(
  value: unknown,
): value is XConnectZeroAdminOverview {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<XConnectZeroAdminOverview>;
  const { networkCount, deviceCount, gatewayCount } = candidate;
  const validBase =
    candidate.status === "available" &&
    isNonNegativeInteger(networkCount) &&
    isNonNegativeInteger(deviceCount) &&
    isNonNegativeInteger(gatewayCount);
  if (!validBase) return false;
  if (
    candidate.oneCount !== undefined &&
    !isNonNegativeInteger(candidate.oneCount)
  ) {
    return false;
  }
  if (
    candidate.gatewayStatus !== undefined &&
    !isOverviewStatus(candidate.gatewayStatus)
  ) {
    return false;
  }
  if (
    candidate.oneStatus !== undefined &&
    !isOverviewStatus(candidate.oneStatus)
  ) {
    return false;
  }
  return true;
}
