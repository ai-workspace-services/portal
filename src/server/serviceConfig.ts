import 'server-only'

import { loadRuntimeConfig } from './runtime-loader'

const FALLBACK_ACCOUNT_SERVICE_URL = 'http://127.0.0.1:8080'
const FALLBACK_SERVER_SERVICE_URL = 'http://127.0.0.1:3000/api'
const FALLBACK_DOCS_SERVICE_URL = 'http://127.0.0.1:3000/docs'

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

function getRuntimeDefaultAccountServiceUrl(requestHost?: string | null): string {
  const runtime = loadRuntimeConfig(requestHost ? { hostname: requestHost } : undefined)
  const candidate = typeof runtime.authUrl === 'string' ? runtime.authUrl.trim() : undefined
  return candidate && candidate.length > 0 ? candidate : FALLBACK_ACCOUNT_SERVICE_URL
}

function getRuntimeDefaultServerServiceUrl(requestHost?: string | null): string {
  const runtime = loadRuntimeConfig(requestHost ? { hostname: requestHost } : undefined)
  const candidate = typeof runtime.apiBaseUrl === 'string' ? runtime.apiBaseUrl.trim() : undefined
  return candidate && candidate.length > 0 ? candidate : FALLBACK_SERVER_SERVICE_URL
}

function getRuntimeDefaultDocsServiceUrl(requestHost?: string | null): string {
  const runtime = loadRuntimeConfig(requestHost ? { hostname: requestHost } : undefined)
  const candidate = typeof runtime.docsServiceUrl === 'string' ? runtime.docsServiceUrl.trim() : undefined
  return candidate && candidate.length > 0 ? candidate : FALLBACK_DOCS_SERVICE_URL
}

function readEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = process.env[key]
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
  }
  return undefined
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function normalizeServiceOrigin(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl)
  try {
    const parsed = new URL(normalized)
    parsed.pathname = ''
    parsed.search = ''
    parsed.hash = ''
    return normalizeBaseUrl(parsed.toString())
  } catch {
    return normalized
  }
}

function normalizeBrowserBaseUrl(baseUrl: string): string {
  if (typeof window === 'undefined') {
    return normalizeBaseUrl(baseUrl)
  }

  try {
    const browserOrigin = window.location.origin
    const parsed = new URL(baseUrl, browserOrigin)

    const parsedHostname = parsed.hostname.toLowerCase()
    const browserHostname = window.location.hostname.toLowerCase()

    const parsedIsLocal = LOCAL_HOSTNAMES.has(parsedHostname)
    const browserIsLocal = LOCAL_HOSTNAMES.has(browserHostname)

    if (parsedIsLocal && !browserIsLocal) {
      return normalizeBaseUrl(browserOrigin)
    }

    if (window.location.protocol === 'https:' && parsed.protocol === 'http:' && parsedHostname === browserHostname) {
      parsed.protocol = 'https:'
      return normalizeBaseUrl(parsed.toString())
    }

    return normalizeBaseUrl(parsed.toString())
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to normalize account service base URL, falling back to provided value', error)
    }
    return normalizeBaseUrl(baseUrl)
  }
}

export function getAccountServiceBaseUrl(requestHost?: string | null): string {
  const runtimeUrl = getRuntimeDefaultAccountServiceUrl(requestHost)
  const configured = readEnvValue('ACCOUNT_SERVICE_URL', 'NEXT_PUBLIC_ACCOUNT_SERVICE_URL')
  // Dynamic runtime config takes precedence over static .env.production build fallbacks (https://accounts.svc.plus)
  const isStaticProdFallback = configured === 'https://accounts.svc.plus'
  const resolved = (configured && !isStaticProdFallback) ? configured : (runtimeUrl || FALLBACK_ACCOUNT_SERVICE_URL)
  return normalizeServiceOrigin(normalizeBrowserBaseUrl(resolved))
}

export function getAccountServiceApiBaseUrl(requestHost?: string | null): string {
  const accountBaseUrl = getAccountServiceBaseUrl(requestHost)
  const apiPath = '/api/auth/'
  try {
    const url = new URL(apiPath, accountBaseUrl)
    return normalizeBaseUrl(url.toString())
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to resolve account service API base URL, falling back to concatenation', error)
    }
    const normalizedBase = normalizeBaseUrl(accountBaseUrl)
    return normalizeBaseUrl(`${normalizedBase}${apiPath}`)
  }
}

function normalizeHostCandidate(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const maybeUrl = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(maybeUrl)
    return parsed.host.toLowerCase()
  } catch {
    return trimmed
      .replace(/^[^/]+:\/\//, '')
      .split('/')[0]
      .toLowerCase()
  }
}

export function isSelfReferentialServiceTarget(
  serviceBaseUrl: string,
  requestHost?: string | null,
): boolean {
  const normalizedServiceHost = normalizeHostCandidate(serviceBaseUrl)
  const normalizedRequestHost = normalizeHostCandidate(requestHost ?? '')
  if (!normalizedServiceHost || !normalizedRequestHost) {
    return false
  }
  return normalizedServiceHost === normalizedRequestHost
}

export function getServerServiceBaseUrl(requestHost?: string | null): string {
  const runtimeUrl = getRuntimeDefaultServerServiceUrl(requestHost)
  const configured = readEnvValue(
    'SERVER_SERVICE_URL',
    'NEXT_PUBLIC_SERVER_SERVICE_URL',
    'NEXT_PUBLIC_API_BASE_URL',
  )
  const isStaticProdFallback = configured === 'https://api.svc.plus'
  const resolved = (configured && !isStaticProdFallback) ? configured : (runtimeUrl || FALLBACK_SERVER_SERVICE_URL)
  return normalizeBaseUrl(resolved)
}

const SERVER_INTERNAL_URL_ENV_KEYS = [
  'SERVER_SERVICE_INTERNAL_URL',
  'SERVER_INTERNAL_URL',
  'INTERNAL_SERVER_SERVICE_URL',
] as const

const DOCS_SERVICE_URL_ENV_KEYS = [
  'DOCS_SERVICE_URL',
  'NEXT_PUBLIC_DOCS_SERVICE_URL',
  'DOCS_SERVICE_INTERNAL_URL',
] as const

export function getInternalServerServiceBaseUrl(requestHost?: string | null): string {
  const configured = readEnvValue(...SERVER_INTERNAL_URL_ENV_KEYS)
  if (configured) {
    return normalizeBaseUrl(configured)
  }

  // For distributed architecture, internal and external URLs are the same
  return getServerServiceBaseUrl(requestHost)
}

export function getDocsServiceBaseUrl(requestHost?: string | null): string {
  const runtimeUrl = getRuntimeDefaultDocsServiceUrl(requestHost)
  const configured = readEnvValue(...DOCS_SERVICE_URL_ENV_KEYS)
  const isStaticProdFallback = configured === 'https://docs.svc.plus'
  const resolved = (configured && !isStaticProdFallback) ? configured : (runtimeUrl || FALLBACK_DOCS_SERVICE_URL)
  return normalizeBaseUrl(resolved)
}

export const serviceConfig = {
  account: {
    baseUrl: getAccountServiceBaseUrl(),
  },
  server: {
    baseUrl: getServerServiceBaseUrl(),
  },
  docs: {
    baseUrl: getDocsServiceBaseUrl(),
  },
} as const
