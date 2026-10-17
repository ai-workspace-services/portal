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

export async function GET(request: Request) {
  const hostnameHeader = request.headers.get('host') ?? undefined
  const runtimeConfig = loadRuntimeConfig({ hostname: hostnameHeader })
  const releaseMetadata = resolveReleaseImageMetadata(process.env.FRONTEND_IMAGE)

  const payload = {
    status: 'ok' as const,
    environment: runtimeConfig.environment,
    region: runtimeConfig.region,
    apiBaseUrl: runtimeConfig.apiBaseUrl,
    authUrl: runtimeConfig.authUrl,
    dashboardUrl: runtimeConfig.dashboardUrl,
    logLevel: runtimeConfig.logLevel,
    ...releaseMetadata,
  }

  console.info('[runtime-config] /api/ping resolved config snippet', payload)

  return NextResponse.json(payload)
}
