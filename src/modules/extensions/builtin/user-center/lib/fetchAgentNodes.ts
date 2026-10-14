"use client";

import type { VlessNode } from "./vless";

// Node discovery must use the canonical account endpoint through the Portal
// BFF. The BFF resolves the browser's HttpOnly xc_session cookie once and
// forwards the resulting account session explicitly to Accounts. Calling the
// legacy auth sync endpoint directly through the generic API route can make a
// valid Console session look invalid to the node handler.
const PRIMARY_ENDPOINT = "/api/agent-server/v1/nodes";

type AgentNodePayload =
  | {
      nodes?: unknown;
      profiles?: unknown;
      message?: unknown;
      error?: unknown;
    }
  | VlessNode[];

type AgentNodesError = Error & {
  status?: number;
};

function isAgentNodeErrorPayload(
  payload: AgentNodePayload | null,
): payload is Exclude<AgentNodePayload, VlessNode[]> {
  return !!payload && !Array.isArray(payload);
}

function extractMessage(
  payload: AgentNodePayload | null,
  status: number,
): string {
  if (
    isAgentNodeErrorPayload(payload) &&
    typeof payload.message === "string" &&
    payload.message.trim().length > 0
  ) {
    return payload.message;
  }
  if (
    isAgentNodeErrorPayload(payload) &&
    typeof payload.error === "string" &&
    payload.error.trim().length > 0
  ) {
    return payload.error;
  }
  return `Request failed (${status})`;
}

async function requestAgentNodes(url: string): Promise<VlessNode[]> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = (await response
    .json()
    .catch(() => null)) as AgentNodePayload | null;

  if (!response.ok) {
    const error = new Error(
      extractMessage(Array.isArray(payload) ? null : payload, response.status),
    ) as AgentNodesError;
    error.status = response.status;
    throw error;
  }

  if (Array.isArray(payload)) {
    return validateRegionalNodes(payload);
  }

  if (payload && Array.isArray((payload as { nodes?: unknown }).nodes)) {
    return validateRegionalNodes((payload as { nodes: unknown[] }).nodes);
  }

  if (payload && Array.isArray((payload as { profiles?: unknown }).profiles)) {
    return validateRegionalNodes((payload as { profiles: unknown[] }).profiles);
  }

  throw new Error("unexpected_agent_nodes_payload");
}

function validateRegionalNodes(nodes: unknown[]): VlessNode[] {
  if (
    !nodes.every((value) => {
      if (!value || typeof value !== "object") return false;
      const node = value as VlessNode;
      return (
        typeof node.region === "string" &&
        !!node.region.trim() &&
        typeof node.address === "string" &&
        !!node.address.trim() &&
        node.address !== "*" &&
        Number.isInteger(node.pool_count) &&
        (node.pool_count ?? 0) > 0 &&
        node.open_to_users === true
      );
    })
  ) {
    throw new Error("unsupported_regional_discovery_payload");
  }
  return nodes as VlessNode[];
}

export async function fetchAgentNodes(): Promise<VlessNode[]> {
  // Fail visibly on a stale Accounts release rather than retrying a legacy
  // host list that has no regional availability contract.
  return requestAgentNodes(PRIMARY_ENDPOINT);
}
