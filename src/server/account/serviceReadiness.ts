import 'server-only'

import type { NextRequest } from 'next/server'

import { normalizeServiceReadiness, type ServiceReadiness } from '@lib/serviceReadiness'
import { getAccountSession } from '@server/account/session'
import { getAccountServiceApiBaseUrl } from '@server/serviceConfig'

export type AdvancedServiceGateResult =
  | { allowed: true; readiness: ServiceReadiness }
  | { allowed: false; response: Response }

/**
 * Enforces the account-service advanced-service contract for portal handlers.
 * A locked response intentionally retains the backend readiness payload so a
 * client can switch directly to its onboarding intro state.
 */
export async function requireAdvancedServiceReadiness(
  request: NextRequest,
): Promise<AdvancedServiceGateResult> {
  const session = await getAccountSession(request)
  if (!session.token) {
    return {
      allowed: false,
      response: Response.json({ error: 'unauthorized' }, { status: 401 }),
    }
  }

  try {
    const response = await fetch(`${getAccountServiceApiBaseUrl()}/service-readiness`, {
      headers: { Authorization: `Bearer ${session.token}` },
      cache: 'no-store',
    })
    const payload = (await response.json().catch(() => ({}))) as { readiness?: unknown }
    const readiness = normalizeServiceReadiness(payload.readiness)

    if (!response.ok || !readiness) {
      return {
        allowed: false,
        response: Response.json({ error: 'service_readiness_unavailable' }, { status: response.status || 502 }),
      }
    }

    if (!readiness.ready) {
      return {
        allowed: false,
        response: Response.json(
          { error: 'advanced_service_locked', intro: true, readiness },
          { status: 403 },
        ),
      }
    }

    return { allowed: true, readiness }
  } catch (error) {
    console.error('Advanced service readiness lookup failed', error)
    return {
      allowed: false,
      response: Response.json({ error: 'service_readiness_unavailable' }, { status: 502 }),
    }
  }
}
