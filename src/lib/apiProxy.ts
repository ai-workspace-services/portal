import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { traceLogFields } from '@/server/observability'

const DEFAULT_FORWARD_HEADERS = [
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'user-agent',
  'x-account-session',
  'x-forwarded-for',
  'x-request-id',
  'x-trace-id',
  // Preserve the caller's W3C context across the Console BFF boundary. The
  // HTTP instrumentation will create a child span for the outbound request.
  'traceparent',
  'tracestate',
  'baggage',
] as const

const RESPONSE_HEADERS_TO_STRIP = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'transfer-encoding',
])

const BODYLESS_METHODS = new Set(['GET', 'HEAD'])

type ProxyOptions = {
  upstreamBaseUrl: string
  upstreamPathPrefix: string
  allowedHeaders?: readonly string[]
  getAdditionalHeaders?: (request: NextRequest) => Promise<Record<string, string> | undefined> | Record<string, string> | undefined
}

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function buildTargetUrl(request: NextRequest, { upstreamBaseUrl, upstreamPathPrefix }: ProxyOptions): string {
  const normalizedBase = stripTrailingSlash(upstreamBaseUrl)
  const normalizedPrefix = upstreamPathPrefix.startsWith('/') ? upstreamPathPrefix : `/${upstreamPathPrefix}`
  const suffix = request.nextUrl.pathname.slice(normalizedPrefix.length)
  const normalizedSuffix = suffix.startsWith('/') ? suffix : suffix ? `/${suffix}` : ''
  const search = request.nextUrl.search ?? ''
  return `${normalizedBase}${normalizedPrefix}${normalizedSuffix}${search}`
}

function buildForwardHeaders(
  request: NextRequest,
  allowedHeaders: readonly string[] = DEFAULT_FORWARD_HEADERS,
  additionalHeaders?: Record<string, string>
) {
  const headers = new Headers()
  for (const name of allowedHeaders) {
    const value = request.headers.get(name)
    if (value) {
      headers.set(name, value)
    }
  }

  // Add internal service token for service-to-service authentication
  const serviceToken = process.env.INTERNAL_SERVICE_TOKEN
  if (serviceToken && serviceToken.trim().length > 0) {
    headers.set('X-Service-Token', serviceToken.trim())
  }

  if (additionalHeaders) {
    for (const [name, value] of Object.entries(additionalHeaders)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        headers.set(name, value)
      }
    }
  }

  return headers
}

function applySetCookieHeaders(source: Headers, target: Headers) {
  const getSetCookie = (source as Headers & { getSetCookie?: () => string[] }).getSetCookie
  if (typeof getSetCookie === 'function') {
    for (const cookie of getSetCookie.call(source)) {
      target.append('set-cookie', cookie)
    }
    return
  }

  const cookie = source.get('set-cookie')
  if (cookie) {
    target.append('set-cookie', cookie)
  }
}

export async function proxyRequestToUpstream(request: NextRequest, options: ProxyOptions): Promise<Response> {
  const targetUrl = buildTargetUrl(request, options)
  const additionalHeaders = await options.getAdditionalHeaders?.(request)
  const forwardHeaders = buildForwardHeaders(request, options.allowedHeaders, additionalHeaders)

  let body: ArrayBuffer | undefined
  if (!BODYLESS_METHODS.has(request.method.toUpperCase())) {
    body = await request.arrayBuffer()
  }

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: body ? Buffer.from(body) : undefined,
      cache: 'no-store',
      redirect: 'manual',
    })
  } catch (error) {
    console.error('Proxy request failed', { ...traceLogFields(), error })
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }

  const responseHeaders = new Headers()
  upstreamResponse.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase()
    if (normalizedKey === 'set-cookie' || RESPONSE_HEADERS_TO_STRIP.has(normalizedKey)) {
      return
    }
    responseHeaders.set(key, value)
  })
  applySetCookieHeaders(upstreamResponse.headers, responseHeaders)
  responseHeaders.set('Cache-Control', 'no-store')

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  })
}

export function createUpstreamProxyHandler(options: ProxyOptions) {
  return function handler(request: NextRequest) {
    return proxyRequestToUpstream(request, options)
  }
}
