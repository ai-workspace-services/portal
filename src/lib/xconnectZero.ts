export const XCONNECT_ZERO_ADMIN_PATHS = {
  overview: "/admin/overview",
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

export function isXConnectZeroAdminOverview(
  value: unknown,
): value is XConnectZeroAdminOverview {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<XConnectZeroAdminOverview>;
  const { networkCount, deviceCount, gatewayCount } = candidate;
  return (
    candidate.status === "available" &&
    isNonNegativeInteger(networkCount) &&
    isNonNegativeInteger(deviceCount) &&
    isNonNegativeInteger(gatewayCount)
  );
}
