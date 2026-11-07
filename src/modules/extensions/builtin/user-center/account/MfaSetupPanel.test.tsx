import React from 'react'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import MfaSetupPanel from './MfaSetupPanel'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams('setupMfa=1'),
}))
vi.mock('@i18n/LanguageProvider', () => ({ useLanguage: () => ({ language: 'zh' }) }))
vi.mock('@lib/userStore', () => ({
  useUserStore: (select: (state: unknown) => unknown) => select({
    user: { email: 'test@example.test', mfaEnabled: false },
    refresh: vi.fn(), logout: vi.fn(),
  }),
}))
vi.mock('next/image', () => ({ default: () => null }))

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('MFA setup status loading', () => {
  it.each([true, false])('waits for status and provisions only if disabled (enabled=%s)', async (enabled) => {
    let resolveStatus!: (value: unknown) => void
    const statusResponse = new Promise((resolve) => { resolveStatus = resolve })
    const fetchMock = vi.fn((url: string) => url.endsWith('/status')
      ? statusResponse
      : Promise.resolve({ ok: false, json: async () => ({ error: 'mfa_setup_failed' }) }))
    vi.stubGlobal('fetch', fetchMock)
    render(<MfaSetupPanel />)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/mfa/status')
    await act(async () => {
      resolveStatus({ ok: true, json: async () => ({ mfa: { totpEnabled: enabled } }) })
    })
    if (enabled) {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } else {
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/mfa/setup')
    }
  })
})
