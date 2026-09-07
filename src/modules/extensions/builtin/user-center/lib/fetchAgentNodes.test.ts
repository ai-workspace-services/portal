import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchAgentNodes } from './fetchAgentNodes'

describe('fetchAgentNodes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the primary endpoint when it returns a node array', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify([{ name: 'JP', address: 'jp-xhttp.svc.plus' }]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    await expect(fetchAgentNodes()).resolves.toEqual([{ name: 'JP', address: 'jp-xhttp.svc.plus' }])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/agent-server/v1/nodes',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
      }),
    )
  })

  it('falls back to the legacy endpoint when the primary route is unavailable', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'not_found' }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ name: 'US', address: 'us-xhttp.svc.plus' }]), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )

    await expect(fetchAgentNodes()).resolves.toEqual([{ name: 'US', address: 'us-xhttp.svc.plus' }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/agent/nodes')
  })

  it('falls back when the primary route returns an unexpected success payload', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ nodes: [{ name: 'HK', address: 'hk-xhttp.svc.plus' }] }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )

    await expect(fetchAgentNodes()).resolves.toEqual([{ name: 'HK', address: 'hk-xhttp.svc.plus' }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/agent/nodes')
  })

  it('preserves non-fallback errors from the primary endpoint', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'invalid_session' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    await expect(fetchAgentNodes()).rejects.toThrow('invalid_session')
  })
})
