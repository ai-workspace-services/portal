import { describe, expect, it } from 'vitest'

import {
  normalizeMfaProvisionResponse,
  resolveMfaOtpAuthUri,
} from '../mfaProvisioning'

describe('MFA provisioning helpers', () => {
  it('accepts both direct and one-level nested provisioning payloads', () => {
    const direct = normalizeMfaProvisionResponse({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauth_url: 'otpauth://totp/svc.plus:user?secret=JBSWY3DPEHPK3PXP',
    })
    const nested = normalizeMfaProvisionResponse({
      data: {
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl: 'otpauth://totp/svc.plus:user?secret=JBSWY3DPEHPK3PXP',
      },
    })

    expect(direct?.secret).toBe('JBSWY3DPEHPK3PXP')
    expect(nested?.otpauth_url).toContain('otpauth://totp/')
  })

  it('rebuilds a scannable URI when the backend omits otpauth_url', () => {
    const uri = resolveMfaOtpAuthUri('', 'JBSWY3DPEHPK3PXP', 'svc.plus', 'user@example.com')
    const parsed = new URL(uri)

    expect(parsed.protocol).toBe('otpauth:')
    expect(parsed.searchParams.get('secret')).toBe('JBSWY3DPEHPK3PXP')
    expect(parsed.searchParams.get('issuer')).toBe('svc.plus')
  })

  it('falls back to the secret when the returned URI is malformed', () => {
    const uri = resolveMfaOtpAuthUri('not-an-otpauth-uri', 'JBSWY3DPEHPK3PXP', 'svc.plus', 'user')

    expect(uri).toContain('otpauth://totp/')
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP')
  })
})
