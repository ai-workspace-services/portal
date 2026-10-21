export const dynamic = 'force-dynamic'

import type { NextRequest } from 'next/server'

import { createUpstreamProxyHandler } from '@lib/apiProxy'
import { getAccountSession } from '@server/account/session'
import { getAccountServiceBaseUrl } from '@server/serviceConfig'

const ACCOUNT_PREFIX = '/api/account'

function createHandler() {
  const upstreamBaseUrl = getAccountServiceBaseUrl()
  return createUpstreamProxyHandler({
    upstreamBaseUrl,
    upstreamPathPrefix: ACCOUNT_PREFIX,
    getAdditionalHeaders: async (request) => {
      if (request.headers.get('authorization')) {
        return undefined
      }

      const session = await getAccountSession(request)
      if (!session.token) {
        return undefined
      }

      return {
        authorization: `Bearer ${session.token}`,
        'x-account-session': session.token,
      }
    },
  })
}

const handler = createHandler()

export async function GET(request: NextRequest) {
  const response = await handler(request)
  if (request.nextUrl.pathname === '/api/account/policy' && response.status === 404) {
    const payload = await response.clone().json().catch(() => null)
    if (payload?.error === 'policy_not_found') {
      // Optional snapshots are empty; route, authentication and store errors remain failures.
      return Response.json(null, { headers: { 'Cache-Control': 'no-store' } })
    }
  }
  return response
}

export function POST(request: NextRequest) {
  return handler(request)
}

export function PUT(request: NextRequest) {
  return handler(request)
}

export function PATCH(request: NextRequest) {
  return handler(request)
}

export function DELETE(request: NextRequest) {
  return handler(request)
}

export function HEAD(request: NextRequest) {
  return handler(request)
}

export function OPTIONS(request: NextRequest) {
  return handler(request)
}
