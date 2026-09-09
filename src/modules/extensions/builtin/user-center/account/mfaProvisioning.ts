export type MfaProvisionResponse = {
  secret?: string
  otpauth_url?: string
  otpauthUrl?: string
  issuer?: string
  account?: string
  accountName?: string
  mfa?: MfaProvisionStatus
  user?: { mfa?: MfaProvisionStatus }
}

export type MfaProvisionStatus = {
  totpEnabled?: boolean
  totpPending?: boolean
  totpSecretIssuedAt?: string
  totpConfirmedAt?: string
  totpLockedUntil?: string
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * The account service returns the provisioning object directly, while older
 * BFF responses could wrap it one more time in `data`. Accept both shapes so
 * the QR renderer does not silently lose the secret.
 */
export function normalizeMfaProvisionResponse(value: unknown): MfaProvisionResponse | null {
  const candidates: unknown[] = []
  let candidate: unknown = value

  // Provisioning can pass through the account API directly, the current BFF
  // envelope, or an edge envelope. Walk the small, known `data` chain rather
  // than assuming one shape so a valid secret is never discarded before QR
  // rendering.
  for (let depth = 0; depth < 4 && isRecord(candidate); depth += 1) {
    candidates.push(candidate)
    candidate = candidate.data
  }

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue
    }

    const secret = readString(candidate.secret)
    const otpauthUrl = readString(candidate.otpauth_url) || readString(candidate.otpauthUrl)
    if (secret || otpauthUrl) {
      return {
        secret: secret || undefined,
        otpauth_url: otpauthUrl || undefined,
        issuer: readString(candidate.issuer) || undefined,
        account: readString(candidate.account) || readString(candidate.accountName) || undefined,
        mfa: isRecord(candidate.mfa) ? candidate.mfa as MfaProvisionStatus : undefined,
        user:
          isRecord(candidate.user) && isRecord(candidate.user.mfa)
            ? { mfa: candidate.user.mfa as MfaProvisionStatus }
            : undefined,
      }
    }
  }

  return null
}

function fallbackTotpUri(secret: string, issuer: string, account: string) {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })
  return `otpauth://totp/${label}?${query.toString()}`
}

/**
 * Prefer the server URI, but reconstruct it from the secret when the server
 * omits or returns an unusable URI. The secret is the canonical value needed
 * by both Google Authenticator and the manual-entry fallback.
 */
export function resolveMfaOtpAuthUri(
  originalUri: string,
  secret: string,
  issuer: string,
  account: string,
) {
  const normalizedSecret = readString(secret)
  const normalizedIssuer = readString(issuer) || 'svc.plus'
  const normalizedAccount = readString(account) || 'account'
  const trimmedUri = readString(originalUri)

  if (!trimmedUri) {
    return normalizedSecret ? fallbackTotpUri(normalizedSecret, normalizedIssuer, normalizedAccount) : ''
  }

  try {
    const uri = new URL(trimmedUri)
    if (uri.protocol !== 'otpauth:') {
      throw new Error('unsupported otpauth protocol')
    }

    if (normalizedSecret) {
      uri.searchParams.set('secret', normalizedSecret)
    }
    uri.searchParams.set('issuer', normalizedIssuer)
    uri.pathname = `/${encodeURIComponent(normalizedIssuer)}:${encodeURIComponent(normalizedAccount)}`
    return uri.toString()
  } catch {
    return normalizedSecret ? fallbackTotpUri(normalizedSecret, normalizedIssuer, normalizedAccount) : trimmedUri
  }
}
