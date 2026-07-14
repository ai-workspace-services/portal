import { describe, expect, it } from 'vitest'

import { normalizeServiceReadiness } from './serviceReadiness'

describe('normalizeServiceReadiness', () => {
  it('keeps the backend requirement order and derives the first incomplete step', () => {
    expect(normalizeServiceReadiness({
      ready: false,
      requirements: [
        { key: 'email', met: true, hint: 'verified' },
        { key: 'password', met: false, hint: 'set password' },
        { key: 'mfa', met: false, hint: 'enable MFA' },
      ],
    })).toMatchObject({ ready: false, nextStep: 'password' })
  })

  it('rejects incomplete backend payloads instead of treating them as ready', () => {
    expect(normalizeServiceReadiness({ ready: true })).toBeNull()
  })
})
