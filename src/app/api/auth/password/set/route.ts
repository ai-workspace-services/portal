import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { SESSION_COOKIE_NAME } from '@lib/authGateway'
import { getAccountServiceApiBaseUrl } from '@server/serviceConfig'

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as { password?: unknown } | null
  const password = typeof payload?.password === 'string' ? payload.password : ''
  if (!password) {
    return NextResponse.json({ success: false, error: 'password_required' }, { status: 400 })
  }

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'session_required' }, { status: 401 })
  }

  try {
    const response = await fetch(`${getAccountServiceApiBaseUrl()}/password/set`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Account service set-password proxy failed', error)
    return NextResponse.json({ success: false, error: 'account_service_unreachable' }, { status: 502 })
  }
}
