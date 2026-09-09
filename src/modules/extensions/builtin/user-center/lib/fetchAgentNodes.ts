'use client'

import type { VlessNode } from './vless'

// Node discovery must use the canonical account endpoint through the Portal
// BFF. The BFF resolves the browser's HttpOnly xc_session cookie once and
// forwards the resulting account session explicitly to Accounts. Calling the
// legacy auth sync endpoint directly through the generic API route can make a
// valid Console session look invalid to the node handler.
const PRIMARY_ENDPOINT = '/api/agent-server/v1/nodes'
const FALLBACK_ENDPOINT = '/api/agent/nodes'

type AgentNodePayload =
  | {
      nodes?: unknown
      profiles?: unknown
      message?: unknown
      error?: unknown
    }
  | VlessNode[]

type AgentNodesError = Error & {
  status?: number
}

function isAgentNodeErrorPayload(
  payload: AgentNodePayload | null,
): payload is Exclude<AgentNodePayload, VlessNode[]> {
  return !!payload && !Array.isArray(payload)
}

function extractMessage(payload: AgentNodePayload | null, status: number): string {
  if (isAgentNodeErrorPayload(payload) && typeof payload.message === 'string' && payload.message.trim().length > 0) {
    return payload.message
  }
  if (isAgentNodeErrorPayload(payload) && typeof payload.error === 'string' && payload.error.trim().length > 0) {
    return payload.error
  }
  return `Request failed (${status})`
}

async function requestAgentNodes(url: string): Promise<VlessNode[]> {
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  const payload = (await response.json().catch(() => null)) as AgentNodePayload | null

  if (!response.ok) {
    const error = new Error(extractMessage(Array.isArray(payload) ? null : payload, response.status)) as AgentNodesError
    error.status = response.status
    throw error
  }

  if (Array.isArray(payload)) {
    return payload as VlessNode[]
  }

  if (payload && Array.isArray((payload as { nodes?: unknown }).nodes)) {
    return (payload as { nodes: VlessNode[] }).nodes
  }

  if (payload && Array.isArray((payload as { profiles?: unknown }).profiles)) {
    return (payload as { profiles: VlessNode[] }).profiles
  }

  throw new Error('unexpected_agent_nodes_payload')
}

function shouldFallback(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return true
  }
  if ((error as AgentNodesError).status && [404, 405, 502].includes((error as AgentNodesError).status as number)) {
    return true
  }
  return [
    'unexpected_agent_nodes_payload',
    'upstream_unreachable',
  ].includes(error.message)
}

export async function fetchAgentNodes(): Promise<VlessNode[]> {
  try {
    return await requestAgentNodes(PRIMARY_ENDPOINT)
  } catch (error) {
    if (!shouldFallback(error)) {
      throw error
    }
  }

  return requestAgentNodes(FALLBACK_ENDPOINT)
}
