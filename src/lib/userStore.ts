'use client'

import { create } from 'zustand'
import { resolvePublicUserEmail } from '@lib/publicUserIdentity'
import { normalizeServiceReadiness, type ServiceReadiness } from '@lib/serviceReadiness'

export type UserRole = 'user' | 'operator' | 'admin'

export type TenantMembership = {
  id: string
  name?: string
  role?: UserRole
}

export type User = {
  id: string
  uuid: string
  email: string
  name?: string
  username: string
  mfaEnabled: boolean
  mfaPending: boolean
  emailVerified: boolean
  passwordSet: boolean
  serviceReadiness?: ServiceReadiness
  role: UserRole
  groups: string[]
  permissions: string[]
  isUser: boolean
  isOperator: boolean
  isAdmin: boolean
  isReadOnly: boolean
  tenantId?: string
  tenants?: TenantMembership[]
  mfa?: {
    totpEnabled?: boolean
    totpPending?: boolean
    totpSecretIssuedAt?: string
    totpConfirmedAt?: string
    totpLockedUntil?: string
  }
}

export type SessionUser = User | null

type UserStore = {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  clearUser: () => void
  hydrateFromAPI: () => Promise<User | null>
  refresh: () => Promise<User | null>
  login: () => Promise<void>
  logout: () => Promise<void>
}

const KNOWN_ROLE_MAP: Record<string, UserRole> = {
  root: 'admin',
  super_admin: 'admin',
  readonly: 'user',
  read_only: 'user',
  admin: 'admin',
  administrator: 'admin',
  operator: 'operator',
  ops: 'operator',
  user: 'user',
  member: 'user',
}

function normalizeRole(input?: string | null): UserRole {
  if (!input || typeof input !== 'string') {
    return 'user'
  }

  const normalized = input.trim().toLowerCase()
  if (!normalized) {
    return 'user'
  }

  return KNOWN_ROLE_MAP[normalized] ?? 'user'
}

async function fetchSessionUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as {
      user?: {
        id?: string
        uuid?: string
        email: string
        name?: string
        username?: string
        mfaEnabled?: boolean
        mfaPending?: boolean
        emailVerified?: boolean
        passwordSet?: boolean
        serviceReadiness?: unknown
        role?: string
        groups?: string[]
        permissions?: string[]
        readOnly?: boolean
        tenantId?: string
        tenants?: TenantMembership[]
        mfa?: {
          totpEnabled?: boolean
          totpPending?: boolean
          totpSecretIssuedAt?: string
          totpConfirmedAt?: string
          totpLockedUntil?: string
        }
      } | null
    }

    const sessionUser = payload?.user
    if (!sessionUser) {
      return null
    }

    const { id, uuid, email, name, username, mfaEnabled, mfa, mfaPending, role, groups, permissions } = sessionUser
    const identifier =
      typeof uuid === 'string' && uuid.trim().length > 0
        ? uuid.trim()
        : typeof id === 'string'
          ? id.trim()
          : ''

    if (!identifier) {
      return null
    }
    const normalizedName = typeof name === 'string' && name.trim().length > 0 ? name.trim() : undefined
    const normalizedUsername =
      typeof username === 'string' && username.trim().length > 0 ? username.trim() : normalizedName

    const normalizedMfa = mfa
      ? {
        ...mfa,
        totpEnabled: Boolean(mfa.totpEnabled ?? mfaEnabled),
        totpPending: Boolean(mfa.totpPending ?? mfaPending) && !Boolean(mfa.totpEnabled ?? mfaEnabled),
      }
      : {
        totpEnabled: Boolean(mfaEnabled),
        totpPending: Boolean(mfaPending) && !Boolean(mfaEnabled),
      }

    const normalizedRole = normalizeRole(role)
    const publicEmail = resolvePublicUserEmail({
      email,
      role: normalizedRole,
    })
    const rawRole = typeof role === 'string' ? role.trim().toLowerCase() : ''
    const normalizedGroups = Array.isArray(groups)
      ? groups
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim())
      : []
    const normalizedPermissions = Array.isArray(permissions)
      ? permissions
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim())
      : []
    const inferredReadOnly =
      rawRole === 'readonly' ||
      rawRole === 'read_only' ||
      normalizedGroups.some((value) => value.toLowerCase() === 'readonly role')
    const normalizedReadOnly = Boolean(sessionUser.readOnly) || inferredReadOnly

    const normalizedTenantId =
      typeof sessionUser.tenantId === 'string' && sessionUser.tenantId.trim().length > 0
        ? sessionUser.tenantId.trim()
        : undefined
    const normalizedTenants = Array.isArray(sessionUser.tenants)
      ? sessionUser.tenants
        .map((tenant) => {
          if (!tenant || typeof tenant !== 'object') {
            return null
          }
          const identifier =
            typeof tenant.id === 'string' && tenant.id.trim().length > 0
              ? tenant.id.trim()
              : undefined
          if (!identifier) {
            return null
          }

          const normalizedTenant: TenantMembership = {
            id: identifier,
          }

          if (typeof tenant.name === 'string' && tenant.name.trim().length > 0) {
            normalizedTenant.name = tenant.name.trim()
          }

          if (typeof tenant.role === 'string' && tenant.role.trim().length > 0) {
            normalizedTenant.role = normalizeRole(tenant.role)
          }

          return normalizedTenant
        })
        .filter((tenant): tenant is TenantMembership => Boolean(tenant))
      : undefined

    return {
      id: identifier,
      uuid: identifier,
      email: publicEmail,
      name: normalizedName,
      username: normalizedUsername ?? publicEmail,
      mfaEnabled: Boolean(mfaEnabled ?? mfa?.totpEnabled),
      mfaPending: Boolean(mfaPending ?? mfa?.totpPending) && !Boolean(mfaEnabled ?? mfa?.totpEnabled),
      emailVerified: Boolean(sessionUser.emailVerified),
      passwordSet: Boolean(sessionUser.passwordSet),
      serviceReadiness: normalizeServiceReadiness(sessionUser.serviceReadiness) ?? undefined,
      mfa: normalizedMfa,
      role: normalizedRole,
      groups: normalizedGroups,
      permissions: normalizedPermissions,
      isUser: normalizedRole === 'user',
      isOperator: normalizedRole === 'operator',
      isAdmin: normalizedRole === 'admin',
      isReadOnly: normalizedReadOnly,
      tenantId: normalizedTenantId,
      tenants: normalizedTenants,
    }
  } catch (error) {
    console.warn('Failed to resolve user session', error)
    return null
  }
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  hydrateFromAPI: async () => {
    set({ isLoading: true })
    const sessionUser = await fetchSessionUser()
    set({ user: sessionUser, isLoading: false })
    return sessionUser
  },
  refresh: async () => get().hydrateFromAPI(),
  login: async () => {
    await get().hydrateFromAPI()
  },
  logout: async () => {
    try {
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include',
      })
    } catch (error) {
      console.warn('Failed to clear user session', error)
    }
    set({ user: null, isLoading: false })
  },
}))

if (typeof window !== 'undefined') {
  useUserStore.getState().hydrateFromAPI().catch((error) => {
    console.warn('User store hydration failed', error)
    useUserStore.setState({ isLoading: false })
  })
}
