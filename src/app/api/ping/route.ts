import { NextResponse } from 'next/server'

import { loadRuntimeConfig } from '@server/runtime-loader'

type TReleaseImageMetadata = {
  releaseImageRef: string | null
  releaseImageTag: string | null
  releaseCommit: string | null
}

function resolveReleaseCommit(releaseImageTag: string | null): string | null {
  if (!releaseImageTag) {
    return null
  }

  const normalizedTag = releaseImageTag.trim()
  const prefixedShaMatch = normalizedTag.match(/^sha-([0-9a-f]{7,40})$/i)
  if (prefixedShaMatch) {
    return prefixedShaMatch[1] ?? null
  }

  return /^[0-9a-f]{7,40}$/i.test(normalizedTag) ? normalizedTag : null
}

function resolveReleaseImageMetadata(frontendImage: string | undefined): TReleaseImageMetadata {
  const releaseImageRef = frontendImage?.trim() || null
  const releaseImageTagMatch = releaseImageRef?.split('@')[0]?.match(/:([^:@]+)$/)
  const releaseImageTag = releaseImageTagMatch?.[1] ?? null
  const releaseCommit = resolveReleaseCommit(releaseImageTag)

  return {
    releaseImageRef,
    releaseImageTag,
    releaseCommit,
  }
}

type TUpstreamProbeResult = {
  ok: boolean
  status: number | null
}

async function probeUpstreams(): Promise<Record<string, TUpstreamProbeResult> | undefined> {
  if (process.env.CONSOLE_PING_UPSTREAM_PROBE !== 'true') {
    return undefined
  }

  const targets: Array<[string, string | undefined]> = [
    ['accounts', process.env.RUNTIME_AUTH_URL],
    ['billing', process.env.RUNTIME_BILLING_SERVICE_URL],
    ['content', process.env.RUNTIME_DOCS_SERVICE_URL],
  ]

  const configured = targets.filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()))
  if (configured.length === 0) {
    return {}
  }

  const entries = await Promise.all(
    configured.map(async ([name, baseUrl]): Promise<[string, TUpstreamProbeResult]> => {
      const target = `${baseUrl.trim().replace(/\/+$/, '')}/readyz`
      try {
        const res = await fetch(target, {
          cache: 'no-store',
          signal: AbortSignal.timeout(1500),
        })
        return [name, { ok: res.ok, status: res.status }]
      } catch {
        return [name, { ok: false, status: null }]
      }
    }),
  )

  return Object.fromEntries(entries)
}

export async function GET(request: Request) {
  const hostnameHeader = request.headers.get('host') ?? undefined
  const runtimeConfig = loadRuntimeConfig({ hostname: hostnameHeader })
  const releaseMetadata = resolveReleaseImageMetadata(process.env.FRONTEND_IMAGE)
  const upstreams = await probeUpstreams()

  const payload = {
    status: 'ok' as const,
    environment: runtimeConfig.environment,
    region: runtimeConfig.region,
    apiBaseUrl: runtimeConfig.apiBaseUrl,
    authUrl: runtimeConfig.authUrl,
    dashboardUrl: runtimeConfig.dashboardUrl,
    logLevel: runtimeConfig.logLevel,
    ...releaseMetadata,
    ...(upstreams !== undefined ? { upstreams } : {}),
  }

  console.info('[runtime-config] /api/ping resolved config snippet', payload)

  return NextResponse.json(payload)
}
