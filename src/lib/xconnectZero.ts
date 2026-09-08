export const XCONNECT_ZERO_ADMIN_PATHS = {
  overview: "/admin/overview",
  networks: "/admin/networks",
  devices: "/admin/devices",
  invites: "/admin/invites",
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

function isOverviewStatus(value: unknown): value is NonNullable<XConnectZeroAdminOverview["gatewayStatus"]> {
  return (
    value === "connected" ||
    value === "active" ||
    value === "pending" ||
    value === "not_configured"
  );
}

export function isXConnectZeroAdminOverview(
  value: unknown,
): value is XConnectZeroAdminOverview {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<XConnectZeroAdminOverview>;
  const { networkCount, deviceCount, gatewayCount } = candidate;
  const validBase = (
    candidate.status === "available" &&
    isNonNegativeInteger(networkCount) &&
    isNonNegativeInteger(deviceCount) &&
    isNonNegativeInteger(gatewayCount)
  );
  if (!validBase) return false;
  if (candidate.oneCount !== undefined && !isNonNegativeInteger(candidate.oneCount)) {
    return false;
  }
  if (candidate.gatewayStatus !== undefined && !isOverviewStatus(candidate.gatewayStatus)) {
    return false;
  }
  if (candidate.oneStatus !== undefined && !isOverviewStatus(candidate.oneStatus)) {
    return false;
  }
  return true;
}
