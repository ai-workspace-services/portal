import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@lib/apiProxy', () => ({ proxyRequestToUpstream: vi.fn() }))
import { proxyRequestToUpstream } from '@lib/apiProxy'
import { POST } from './route'

describe('Moltbot SIT isolation', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

  it.each(['NEXT_PUBLIC_RUNTIME_ENVIRONMENT', 'RUNTIME_ENV'])(
    'rejects forwarding when %s indicates SIT',
    async (key) => {
      vi.stubEnv(key, 'sit')
      const response = await POST(new NextRequest('https://feature-sit.onwalk.net/api/moltbot/chat', { method: 'POST' }))
      expect(response.status).toBe(503)
      expect(proxyRequestToUpstream).not.toHaveBeenCalled()
    },
  )
})
