import { ADMIN_API_BASE } from "./adminApi";

export type AgentFreeGrantStatus = "active" | "revoked";

export type AgentFreeGrantState =
  | "active"
  | "pending"
  | "expired"
  | "revoked"
  | "pending_revocation_ack";

export type AgentFreeGrant = {
  nodeId: string;
  accountId?: string;
  email?: string;
  status: AgentFreeGrantStatus;
  state: AgentFreeGrantState;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
  actorId?: string;
  reason?: string;
};

export type UpsertAgentFreeGrantPayload = {
  nodeId: string;
  email?: string;
  accountId?: string;
  expiresInDays?: number;
  expiresAt?: string;
  reason: string;
};

export type RevokeAgentFreeGrantPayload = {
  nodeId: string;
  email?: string;
  accountId?: string;
  reason: string;
};

export async function fetchAgentFreeGrants(
  nodeId?: string,
): Promise<{ grants: AgentFreeGrant[] }> {
  const query = nodeId ? `?nodeId=${encodeURIComponent(nodeId.trim())}` : "";
  const response = await fetch(`${ADMIN_API_BASE}/agents/grants${query}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.message || data.error || `HTTP ${response.status}: Failed to fetch agent grants`,
    );
  }
  return response.json();
}

export async function upsertAgentFreeGrant(
  payload: UpsertAgentFreeGrantPayload,
): Promise<{ success: boolean; grant?: AgentFreeGrant }> {
  const response = await fetch(`${ADMIN_API_BASE}/agents/grants`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.message || data.error || `HTTP ${response.status}: Failed to save grant`,
    );
  }
  return data;
}

export async function revokeAgentFreeGrant(
  payload: RevokeAgentFreeGrantPayload,
): Promise<{ success: boolean; grant?: AgentFreeGrant }> {
  const response = await fetch(`${ADMIN_API_BASE}/agents/grants`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.message || data.error || `HTTP ${response.status}: Failed to revoke grant`,
    );
  }
  return data;
}
