export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { getAccountServiceApiBaseUrl } from '@server/serviceConfig'
import { evaluateAccountAdminAccess } from '@server/account/adminAccess'
import { getAccountSession } from '@server/account/session'
import type { AccountUserRole } from '@server/account/session'

const ACCOUNT_API_BASE = getAccountServiceApiBaseUrl()
const REQUIRED_ROLES: AccountUserRole[] = ['admin', 'operator']
const DELETE_PERMISSIONS = ['admin.users.delete.write']

type ErrorPayload = {
  error: string
}

type RouteParams = {
  params: Promise<{
    userId: string
  }>
}

function resolveUserId(param?: string): string | null {
  if (!param) {
    return null
  }
  const trimmed = param.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getAccountSession(request)
  const user = session.user

  if (!user || !session.token) {
    return NextResponse.json<ErrorPayload>({ error: 'unauthenticated' }, { status: 401 })
  }

  const access = await evaluateAccountAdminAccess(user, {
    roles: REQUIRED_ROLES,
    permissions: DELETE_PERMISSIONS,
  })
  if (!access.allowed) {
    return NextResponse.json<ErrorPayload>({ error: access.reason ?? 'forbidden' }, { status: 403 })
  }

  const { userId: userIdParam } = await params
  const userId = resolveUserId(userIdParam)
  if (!userId) {
    return NextResponse.json<ErrorPayload>({ error: 'invalid_user' }, { status: 400 })
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.token}`,
    Accept: 'application/json',
  }
  const requestId = request.headers.get('x-request-id')
  if (requestId) {
    headers['X-Request-ID'] = requestId
  }

  const response = await fetch(
    `${ACCOUNT_API_BASE}/admin/users/${encodeURIComponent(userId)}${request.nextUrl.search}`,
    {
      method: 'DELETE',
      headers,
      cache: 'no-store',
    },
  )

  const payload = await response.json().catch(() => null)
  if (payload === null) {
    return NextResponse.json<ErrorPayload>({ error: 'invalid_response' }, { status: 502 })
  }

  return NextResponse.json(payload, { status: response.status })
}
