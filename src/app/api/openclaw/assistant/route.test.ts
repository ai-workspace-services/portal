// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const requireAdvancedServiceReadiness = vi.hoisted(() => vi.fn())

vi.mock('@/server/account/serviceReadiness', () => ({ requireAdvancedServiceReadiness }))

describe('/api/openclaw/assistant', () => {
  it('returns the readiness onboarding response before parsing or connecting to the gateway', async () => {
    requireAdvancedServiceReadiness.mockResolvedValue({
      allowed: false,
      response: Response.json({
        error: 'advanced_service_locked',
        intro: true,
        readiness: { ready: false, nextStep: 'email', requirements: [] },
      }, { status: 403 }),
    })

    const { POST } = await import('./route')
    const request = new NextRequest('https://console.svc.plus/api/openclaw/assistant', {
      method: 'POST',
      body: JSON.stringify({ action: 'bootstrap' }),
    })
    const response = await POST(request)

    expect(requireAdvancedServiceReadiness).toHaveBeenCalledWith(request)
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: 'advanced_service_locked',
      intro: true,
    })
  })
})
